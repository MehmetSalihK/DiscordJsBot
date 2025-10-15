import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import os from 'os';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import fetch from 'node-fetch';
import crypto from 'crypto';
import { Servers, Users } from '../models/JsonFile.js';
import { syncFileToMongo } from '../utils/syncCategorizedJson.js';
import logger from '../utils/logger.js';
import messageXPHandler from '../utils/messageXpHandler.js';
import voiceXPHandler from '../utils/voiceXpHandler.js';
import XPCalculator from '../utils/xpCalculator.js';

// Reference to Discord bot client (set when server starts)
let botClient = null;

// Basic Express app
const app = express();
app.use(express.json());
// Autoriser plusieurs origines en dev
const allowedOrigins = [
  process.env.DASHBOARD_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174',
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, true); // assouplir en dev
    },
    credentials: true,
  })
);

// HTTP + Socket.IO
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Simple JWT auth middleware placeholder (Discord OAuth to be added)
function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || '';
  if (!token) return res.status(401).json({ error: 'Token manquant' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide' });
  }
}

// Rate limiting simple (par utilisateur ou IP)
const rateMap = new Map();
function rateLimit(req, res, next) {
  const key = req.user?.sub || req.ip;
  const now = Date.now();
  const windowMs = 60 * 1000;
  const max = 60; // 60 requêtes/minute
  const entry = rateMap.get(key) || { ts: now, count: 0 };
  if (now - entry.ts > windowMs) {
    entry.ts = now;
    entry.count = 0;
  }
  entry.count++;
  rateMap.set(key, entry);
  if (entry.count > max) return res.status(429).json({ error: 'Trop de requêtes' });
  next();
}

// CSRF guard pour endpoints sensibles (utilise un token inclus dans le JWT)
function csrfGuard(req, res, next) {
  const required = req.user?.csrf;
  const provided = req.headers['x-csrf-token'];
  if (!required || !provided || required !== provided) {
    return res.status(403).json({ error: 'CSRF manquant ou invalide' });
  }
  next();
}

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Stats endpoint (RAM, CPU, uptime)
app.get('/api/stats', auth, (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    ram: mem.rss,
    cpu: os.loadavg()[0],
    uptime: process.uptime(),
    lastRestart: process.env.LAST_RESTART || null,
  });
});

// User info
app.get('/api/me', auth, (req, res) => {
  const isOwner = process.env.OWNER_ID ? req.user?.sub === process.env.OWNER_ID : false;
  res.json({ ...req.user, isOwner });
});

// Servers list (from local JSON backup)
const serversJsonPath = path.join(process.cwd(), 'json', 'servers.json');
const usersJsonPath = path.join(process.cwd(), 'json', 'users.json');
const linkModerationPath = path.join(process.cwd(), 'json', 'linkModeration.json');
const autoVoiceChannelsPath = path.join(process.cwd(), 'json', 'autoVoiceChannels.json');
const suspensionsPath = path.join(process.cwd(), 'json', 'suspensions.json');
const reactionRolesAdvPath = path.join(process.cwd(), 'data', 'reactionroles-advanced.json');
// Additional module config files
// Store module configs in ./json to align with requested layout
const autorolePath = path.join(process.cwd(), 'json', 'autorole.json');
const rgbRolePath = path.join(process.cwd(), 'json', 'rgbrole.json');
const socialPath = path.join(process.cwd(), 'data', 'social.json');
const securityPath = path.join(process.cwd(), 'json', 'security.json');
// XP config may live inside servers.json under xpSystem
// Logs config may live inside servers.json under logs or (logsActive, logChannelId)
app.get('/api/servers', auth, async (req, res) => {
  try {
    const raw = fs.existsSync(serversJsonPath) ? fs.readFileSync(serversJsonPath, 'utf8') : '{}';
    const map = raw ? JSON.parse(raw) : {};
    const allowed = Array.isArray(req.user?.guildsManaged) ? new Set(req.user.guildsManaged) : new Set();
    const list = Object.entries(map)
      .filter(([id]) => allowed.size === 0 ? false : allowed.has(id))
      .map(([id, config]) => ({ id, config }));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === Guild Members (requires bot client and GuildMembers intent) ===
app.get('/api/guild/:id/members', auth, async (req, res) => {
  try {
    if (!botClient || !botClient.guilds) {
      return res.status(501).json({ error: 'Non disponible: client Discord absent' });
    }
    const guildId = req.params.id;
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const search = String(req.query.search || '').toLowerCase();
    const guild = botClient.guilds.cache.get(guildId) || (botClient.guilds.fetch ? await botClient.guilds.fetch(guildId).catch(() => null) : null);
    if (!guild) return res.status(404).json({ error: 'Serveur introuvable ou non accessible' });
    // Fetch members (prefer REST fetch; fallback to cache)
    let membersCollection;
    try {
      membersCollection = await guild.members.fetch({ withPresences: true });
    } catch {
      membersCollection = guild.members.cache;
    }
    const members = Array.from(membersCollection.values()).map((m) => {
      const displayName = m.nickname || m.user?.globalName || m.user?.username || m.user?.tag || m.displayName || m.id;
      const avatar = m.user?.displayAvatarURL ? m.user.displayAvatarURL({ size: 64, extension: 'png' }) : null;
      const status = m.presence?.status || 'offline';
      const roles = Array.from(m.roles?.cache?.values() || []).map((r) => ({ id: r.id, name: r.name }));
      return { id: m.id, username: m.user?.username || null, displayName, avatar, bot: !!m.user?.bot, status, roles };
    });
    const filtered = search
      ? members.filter((u) => (u.displayName?.toLowerCase().includes(search) || u.id.includes(search)))
      : members;
    res.json(filtered.slice(0, limit));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === Guild Roles (for dropdown selection) ===
app.get('/api/guild/:id/roles', auth, async (req, res) => {
  try {
    if (!botClient || !botClient.guilds) {
      return res.status(501).json({ error: 'Non disponible: client Discord absent' });
    }
    const guildId = req.params.id;
    const guild = botClient.guilds.cache.get(guildId) || (botClient.guilds.fetch ? await botClient.guilds.fetch(guildId).catch(() => null) : null);
    if (!guild) return res.status(404).json({ error: 'Serveur introuvable ou non accessible' });
    const roles = guild.roles?.cache ? Array.from(guild.roles.cache.values()) : (guild.roles?.fetch ? await guild.roles.fetch().then(c=>Array.from(c.values())).catch(()=>[]) : []);
    const mapped = roles
      .filter(r => r && r.id && r.name && r.name !== '@everyone')
      .sort((a,b) => b.position - a.position)
      .map(r => ({ id: r.id, name: r.name, position: r.position }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === Guild Overview (members, roles, channels, emojis, stickers) ===
app.get('/api/guild/:id/overview', auth, async (req, res) => {
  try {
    if (!botClient || !botClient.guilds) {
      return res.status(501).json({ error: 'Non disponible: client Discord absent' });
    }
    const guildId = req.params.id;
    const guild = botClient.guilds.cache.get(guildId) || (botClient.guilds.fetch ? await botClient.guilds.fetch(guildId).catch(() => null) : null);
    if (!guild) return res.status(404).json({ error: 'Serveur introuvable ou non accessible' });
    // Base info
    const name = guild.name;
    const icon = guild.iconURL ? guild.iconURL({ size: 64, extension: 'png' }) : null;
    const totalMembers = typeof guild.memberCount === 'number' ? guild.memberCount : (guild.members?.cache?.size || 0);
    // Online members via presences if available
    let onlineMembers = 0;
    try {
      const membersCollection = await guild.members.fetch({ withPresences: true });
      onlineMembers = Array.from(membersCollection.values()).filter((m) => {
        const st = m.presence?.status || 'offline';
        return st === 'online' || st === 'idle' || st === 'dnd';
      }).length;
    } catch {
      // Fallback using cache presences
      try {
        const cache = guild.members?.cache || new Map();
        onlineMembers = Array.from(cache.values()).filter((m) => {
          const st = m.presence?.status || 'offline';
          return st === 'online' || st === 'idle' || st === 'dnd';
        }).length;
      } catch { onlineMembers = 0; }
    }
    const bots = Array.from(guild.members?.cache?.values() || []).filter(m => m.user?.bot).length;
    // Roles
    const rolesCount = guild.roles?.cache?.size || 0;
    // Channels breakdown
    const channels = guild.channels?.cache || new Map();
    let textCount = 0, voiceCount = 0, categoryCount = 0, totalChannels = 0;
    totalChannels = channels.size || 0;
    channels.forEach((ch) => {
      const t = ch.type;
      // Discord.js v14 types (numeric)
      if (t === 0) textCount++; // GuildText
      else if (t === 2) voiceCount++; // GuildVoice
      else if (t === 4) categoryCount++; // GuildCategory
    });
    // Emojis & stickers
    const emojisCount = guild.emojis?.cache?.size || 0;
    const stickersCount = guild.stickers?.cache?.size || 0;
    res.json({
      id: guild.id,
      name,
      icon,
      members: { total: totalMembers, online: onlineMembers, bots },
      roles: { count: rolesCount },
      channels: { total: totalChannels, text: textCount, voice: voiceCount, categories: categoryCount },
      emojis: { count: emojisCount },
      stickers: { count: stickersCount },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === Guild Channels (text and voice lists) ===
app.get('/api/guild/:id/channels', auth, async (req, res) => {
  try {
    if (!botClient || !botClient.guilds) {
      return res.status(501).json({ error: 'Non disponible: client Discord absent' });
    }
    const guildId = req.params.id;
    const guild = botClient.guilds.cache.get(guildId) || (botClient.guilds.fetch ? await botClient.guilds.fetch(guildId).catch(() => null) : null);
    if (!guild) return res.status(404).json({ error: 'Serveur introuvable ou non accessible' });
    const channelsCache = guild.channels?.cache || new Map();
    const text = [];
    const voice = [];
    channelsCache.forEach((ch) => {
      const t = ch.type; // Discord.js v14: 0=text, 2=voice, 4=category
      const name = ch.name;
      const category = ch.parent?.name || null;
      if (t === 0) text.push({ id: ch.id, name, category });
      else if (t === 2) voice.push({ id: ch.id, name, category });
    });
    text.sort((a, b) => a.name.localeCompare(b.name));
    voice.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ text, voice });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update server config (write JSON, watcher will sync to Mongo)
app.put('/api/server/:id/config', auth, async (req, res) => {
  try {
    const guildId = req.params.id;
    const patch = req.body || {};
    const raw = fs.existsSync(serversJsonPath) ? fs.readFileSync(serversJsonPath, 'utf8') : '{}';
    const map = raw ? JSON.parse(raw) : {};
    map[guildId] = { ...(map[guildId] || {}), ...patch };
    fs.writeFileSync(serversJsonPath, JSON.stringify(map, null, 2));
    // Also update Mongo immediately
    await Servers.findOneAndUpdate(
      { fileName: 'servers.json' },
      { data: map, updatedAt: Date.now() },
      { upsert: true, new: true }
    );
    // also route through categorized sync
    try { await syncFileToMongo(serversJsonPath); } catch {}
    io.emit('configUpdated', { guildId, module: 'server', config: map[guildId] });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === Aggregated Modules for dynamic display ===
app.get('/api/modules/:id', auth, async (req, res) => {
  try {
    const guildId = req.params.id;
    // Servers base config
    const serversRaw = fs.existsSync(serversJsonPath) ? fs.readFileSync(serversJsonPath, 'utf8') : '{}';
    const serversMap = serversRaw ? JSON.parse(serversRaw) : {};
    const srvCfg = serversMap[guildId] || {};
    // Individual module files
    const lmRaw = fs.existsSync(linkModerationPath) ? fs.readFileSync(linkModerationPath, 'utf8') : '{}';
    const lmMap = lmRaw ? JSON.parse(lmRaw) : {};
    const avcRaw = fs.existsSync(autoVoiceChannelsPath) ? fs.readFileSync(autoVoiceChannelsPath, 'utf8') : '{}';
    const avcMap = avcRaw ? JSON.parse(avcRaw) : {};
    const suspRaw = fs.existsSync(suspensionsPath) ? fs.readFileSync(suspensionsPath, 'utf8') : '{}';
    const suspMap = suspRaw ? JSON.parse(suspRaw) : {};
    const rrRaw = fs.existsSync(reactionRolesAdvPath) ? fs.readFileSync(reactionRolesAdvPath, 'utf8') : '{}';
    const rrMap = rrRaw ? JSON.parse(rrRaw) : {};
    const autoroleRaw = fs.existsSync(autorolePath) ? fs.readFileSync(autorolePath, 'utf8') : '{}';
    const autoroleMap = autoroleRaw ? JSON.parse(autoroleRaw) : {};
    const rgbRaw = fs.existsSync(rgbRolePath) ? fs.readFileSync(rgbRolePath, 'utf8') : '{}';
    const rgbMap = rgbRaw ? JSON.parse(rgbRaw) : {};
    const socialRaw = fs.existsSync(socialPath) ? fs.readFileSync(socialPath, 'utf8') : '{}';
    const socialMap = socialRaw ? JSON.parse(socialRaw) : {};
    const securityRaw = fs.existsSync(securityPath) ? fs.readFileSync(securityPath, 'utf8') : '{}';
    const securityMap = securityRaw ? JSON.parse(securityRaw) : {};

    const modules = {
      antilink: lmMap[guildId] ? { enabled: !!lmMap[guildId].enabled } : { enabled: false },
      logs: srvCfg.logs ? { enabled: !!srvCfg.logs.active, logChannelId: srvCfg.logs.logChannelId || null } : { enabled: !!srvCfg.logsActive, logChannelId: srvCfg.logChannelId || null },
      xp: srvCfg.xpSystem ? { enabled: !!srvCfg.xpSystem.active } : { enabled: false },
      autovoice: avcMap[guildId] ? { enabled: !!avcMap[guildId].enabled } : { enabled: false },
      autorole: autoroleMap[guildId] ? { enabled: !!autoroleMap[guildId].enabled, role: autoroleMap[guildId].roleId || '' } : { enabled: false, role: '' },
      rgbrole: rgbMap[guildId] ? { enabled: !!rgbMap[guildId].enabled, role: rgbMap[guildId].roleId || '', interval: rgbMap[guildId].interval || 60 } : { enabled: false, role: '', interval: 60 },
      social: socialMap[guildId] ? { enabled: !!socialMap[guildId].enabled } : { enabled: false },
      suspension: suspMap[guildId] ? { enabled: true } : { enabled: false },
      reactionroles: rrMap[guildId] ? { enabled: !!rrMap[guildId].enabled } : { enabled: false },
      security: securityMap[guildId] ? { enabled: !!securityMap[guildId].enabled } : { enabled: false },
    };
    res.json({ guild_id: guildId, modules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === Logs (lecture des événements récents) ===
app.get('/api/logs', auth, rateLimit, async (req, res) => {
  try {
    const levelsParam = req.query.levels;
    const limitParam = Number(req.query.limit) || 200;
    const levels = typeof levelsParam === 'string' && levelsParam.length > 0
      ? levelsParam.split(',').map(s => s.trim())
      : null;
    const events = logger.getRecentEvents(levels, Math.min(Math.max(limitParam, 1), 500));
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === XP System (per guild, stored in servers.json.xpSystem) ===
app.get('/api/module/xp/:id', auth, async (req, res) => {
  try {
    const guildId = req.params.id;
    const raw = fs.existsSync(serversJsonPath) ? fs.readFileSync(serversJsonPath, 'utf8') : '{}';
    const map = raw ? JSON.parse(raw) : {};
    const defaultConf = {
      active: true,
      messageXP: 1,
      voiceXPPer5Min: 10,
      ignoreAfkChannelId: null,
      logsActive: false,
      xpLogs: { logChannelId: null },
      voiceLogs: { logChannelId: null, active: false },
    };
    const conf = map[guildId]?.xpSystem ? { ...defaultConf, ...map[guildId].xpSystem } : defaultConf;
    res.json(conf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/module/xp/:id', auth, async (req, res) => {
  try {
    const guildId = req.params.id;
    const patch = req.body || {};
    const raw = fs.existsSync(serversJsonPath) ? fs.readFileSync(serversJsonPath, 'utf8') : '{}';
    const map = raw ? JSON.parse(raw) : {};
    const current = map[guildId]?.xpSystem || {};
    map[guildId] = { ...(map[guildId] || {}), xpSystem: { ...current, ...patch } };
    fs.writeFileSync(serversJsonPath, JSON.stringify(map, null, 2));
    try { await syncFileToMongo(serversJsonPath); } catch {}
    io.emit('configUpdated', { guildId, module: 'xp', config: map[guildId].xpSystem });
    res.json({ ok: true, config: map[guildId].xpSystem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === XP Leaderboard ===
// Message XP leaderboard per guild
app.get('/api/xp/leaderboard/message/:id', auth, async (req, res) => {
  try {
    const guildId = req.params.id;
    const limit = Number(req.query.limit) || 10;
    const data = await messageXPHandler.getLeaderboard(guildId, Math.min(Math.max(limit, 1), 100));
    res.json({ leaderboard: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Voice XP leaderboard per guild
app.get('/api/xp/leaderboard/voice/:id', auth, async (req, res) => {
  try {
    const guildId = req.params.id;
    const limit = Number(req.query.limit) || 10;
    const data = await voiceXPHandler.getVoiceLeaderboard(guildId, Math.min(Math.max(limit, 1), 100));
    res.json({ leaderboard: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Global XP leaderboard (messages + voice). If a user appears in both, sum totals.
app.get('/api/xp/leaderboard/global/:id', auth, async (req, res) => {
  try {
    const guildId = req.params.id;
    const limit = Number(req.query.limit) || 10;
    const msg = await messageXPHandler.getLeaderboard(guildId, 1000);
    const voice = await voiceXPHandler.getVoiceLeaderboard(guildId, 1000);
    const map = new Map();
    for (const u of msg) {
      const entry = map.get(u.userId) || { userId: u.userId, messageXp: 0, voiceXp: 0, totalXp: 0 };
      entry.messageXp = u.totalXp || 0;
      entry.totalXp = (entry.messageXp || 0) + (entry.voiceXp || 0);
      map.set(u.userId, entry);
    }
    for (const v of voice) {
      const entry = map.get(v.userId) || { userId: v.userId, messageXp: 0, voiceXp: 0, totalXp: 0 };
      entry.voiceXp = v.totalXp || 0;
      entry.totalXp = (entry.messageXp || 0) + (entry.voiceXp || 0);
      map.set(v.userId, entry);
    }
    const combined = Array.from(map.values())
      .sort((a, b) => (b.totalXp || 0) - (a.totalXp || 0))
      .slice(0, Math.min(Math.max(limit, 1), 100));
    // Enrichir avec le niveau basé sur l'XP total
    const combinedWithLevels = await Promise.all(
      combined.map(async (u) => ({
        ...u,
        levelInfo: await XPCalculator.getUserLevelInfo(u.totalXp || 0),
      }))
    );
    res.json({ leaderboard: combinedWithLevels });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === Logs System (per guild, stored in servers.json.logs or logsActive/logChannelId) ===
app.get('/api/module/logs/:id', auth, async (req, res) => {
  try {
    const guildId = req.params.id;
    const raw = fs.existsSync(serversJsonPath) ? fs.readFileSync(serversJsonPath, 'utf8') : '{}';
    const map = raw ? JSON.parse(raw) : {};
    const fromLegacy = map[guildId] ? { active: !!map[guildId].logsActive, logChannelId: map[guildId].logChannelId ?? null } : null;
    const conf = map[guildId]?.logs || fromLegacy || { active: false, logChannelId: null };
    res.json(conf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/module/logs/:id', auth, async (req, res) => {
  try {
    const guildId = req.params.id;
    const patch = req.body || {};
    const raw = fs.existsSync(serversJsonPath) ? fs.readFileSync(serversJsonPath, 'utf8') : '{}';
    const map = raw ? JSON.parse(raw) : {};
    const current = map[guildId]?.logs || { active: false, logChannelId: null };
    const merged = { ...current, ...patch };
    map[guildId] = { ...(map[guildId] || {}), logs: merged, logsActive: merged.active, logChannelId: merged.logChannelId };
    fs.writeFileSync(serversJsonPath, JSON.stringify(map, null, 2));
    try { await syncFileToMongo(serversJsonPath); } catch {}
    io.emit('configUpdated', { guildId, module: 'logs', config: merged });
    res.json({ ok: true, config: merged });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === Anti-Link ===
app.get('/api/module/linkModeration/:id', auth, async (req, res) => {
  try {
    const guildId = req.params.id;
    const raw = fs.existsSync(linkModerationPath) ? fs.readFileSync(linkModerationPath, 'utf8') : '{}';
    const map = raw ? JSON.parse(raw) : {};
    res.json(map[guildId] || { enabled: false, whitelist: [], blacklist: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/module/linkModeration/:id', auth, async (req, res) => {
  try {
    const guildId = req.params.id;
    const patch = req.body || {};
    const raw = fs.existsSync(linkModerationPath) ? fs.readFileSync(linkModerationPath, 'utf8') : '{}';
    const map = raw ? JSON.parse(raw) : {};
    map[guildId] = { ...(map[guildId] || { enabled: false, whitelist: [], blacklist: [] }), ...patch };
    fs.writeFileSync(linkModerationPath, JSON.stringify(map, null, 2));
    await syncFileToMongo(linkModerationPath);
    io.emit('configUpdated', { guildId, module: 'linkModeration', config: map[guildId] });
    res.json({ ok: true, config: map[guildId] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === Auto Voice Channels ===
app.get('/api/module/autoVoiceChannels/:id', auth, async (req, res) => {
  try {
    const guildId = req.params.id;
    const raw = fs.existsSync(autoVoiceChannelsPath) ? fs.readFileSync(autoVoiceChannelsPath, 'utf8') : '{}';
    const map = raw ? JSON.parse(raw) : {};
    res.json(map[guildId] || { masterChannels: [], userChannels: {} });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/module/autoVoiceChannels/:id', auth, async (req, res) => {
  try {
    const guildId = req.params.id;
    const patch = req.body || {};
    const raw = fs.existsSync(autoVoiceChannelsPath) ? fs.readFileSync(autoVoiceChannelsPath, 'utf8') : '{}';
    const map = raw ? JSON.parse(raw) : {};
    map[guildId] = { ...(map[guildId] || { masterChannels: [], userChannels: {} }), ...patch };
    fs.writeFileSync(autoVoiceChannelsPath, JSON.stringify(map, null, 2));
    await syncFileToMongo(autoVoiceChannelsPath);
    io.emit('configUpdated', { guildId, module: 'autoVoiceChannels', config: map[guildId] });
    res.json({ ok: true, config: map[guildId] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === Suspensions ===
app.get('/api/module/suspensions/:id', auth, async (req, res) => {
  try {
    const guildId = req.params.id;
    const raw = fs.existsSync(suspensionsPath) ? fs.readFileSync(suspensionsPath, 'utf8') : '{}';
    const map = raw ? JSON.parse(raw) : {};
    const base = {
      config: {
        suspension1_duration: 10,
        suspension2_duration: 1440,
        suspension3_duration: 10080,
        warning_expiry_days: 30,
        max_warnings: 3,
        roles: { suspension1: null, suspension2: null, suspension3: null },
        channels: { logs: null, sanctions: null, reglement: null, suspension3_voice: null },
      },
      users: {},
    };
    res.json(map[guildId] || base);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/module/suspensions/:id', auth, async (req, res) => {
  try {
    const guildId = req.params.id;
    const patch = req.body || {};
    const raw = fs.existsSync(suspensionsPath) ? fs.readFileSync(suspensionsPath, 'utf8') : '{}';
    const map = raw ? JSON.parse(raw) : {};
    const existing = map[guildId] || { config: {}, users: {} };
    map[guildId] = { config: { ...(existing.config || {}), ...(patch.config || {}) }, users: { ...(existing.users || {}), ...(patch.users || {}) } };
    fs.writeFileSync(suspensionsPath, JSON.stringify(map, null, 2));
    await syncFileToMongo(suspensionsPath);
    io.emit('configUpdated', { guildId, module: 'suspensions', config: map[guildId] });
    res.json({ ok: true, config: map[guildId] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === Reaction Roles (Advanced) ===
app.get('/api/module/reactionroles/:id', auth, async (req, res) => {
  try {
    const guildId = req.params.id;
    const raw = fs.existsSync(reactionRolesAdvPath) ? fs.readFileSync(reactionRolesAdvPath, 'utf8') : '{}';
    const map = raw ? JSON.parse(raw) : {};
    res.json(map[guildId] || { enabled: true, logsChannel: null, logsEnabled: false, messages: {} });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/module/reactionroles/:id', auth, async (req, res) => {
  try {
    const guildId = req.params.id;
    const patch = req.body || {};
    const raw = fs.existsSync(reactionRolesAdvPath) ? fs.readFileSync(reactionRolesAdvPath, 'utf8') : '{}';
    const map = raw ? JSON.parse(raw) : {};
    map[guildId] = { ...(map[guildId] || { enabled: true, logsChannel: null, logsEnabled: false, messages: {} }), ...patch };
    fs.writeFileSync(reactionRolesAdvPath, JSON.stringify(map, null, 2));
    await syncFileToMongo(reactionRolesAdvPath);
    io.emit('configUpdated', { guildId, module: 'reactionroles', config: map[guildId] });
    res.json({ ok: true, config: map[guildId] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === AutoRole ===
app.get('/api/module/autorole/:id', auth, async (req, res) => {
  try {
    const guildId = req.params.id;
    const raw = fs.existsSync(autorolePath) ? fs.readFileSync(autorolePath, 'utf8') : '{}';
    const map = raw ? JSON.parse(raw) : {};
    const base = { enabled: false, roleId: null, roles: [], logChannel: null, welcomeMessage: false };
    res.json(map[guildId] || base);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/module/autorole/:id', auth, async (req, res) => {
  try {
    const guildId = req.params.id;
    const patch = req.body || {};
    const raw = fs.existsSync(autorolePath) ? fs.readFileSync(autorolePath, 'utf8') : '{}';
    const map = raw ? JSON.parse(raw) : {};
    map[guildId] = { ...(map[guildId] || { enabled: false, roleId: null, roles: [], logChannel: null, welcomeMessage: false }), ...patch };
    fs.writeFileSync(autorolePath, JSON.stringify(map, null, 2));
    await syncFileToMongo(autorolePath);
    io.emit('configUpdated', { guildId, module: 'autorole', config: map[guildId] });
    res.json({ ok: true, config: map[guildId] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === RGB Role ===
app.get('/api/module/rgbrole/:id', auth, async (req, res) => {
  try {
    const guildId = req.params.id;
    const raw = fs.existsSync(rgbRolePath) ? fs.readFileSync(rgbRolePath, 'utf8') : '{}';
    const map = raw ? JSON.parse(raw) : {};
    const base = { enabled: false, roleId: null, interval: 60 };
    res.json(map[guildId] || base);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/module/rgbrole/:id', auth, async (req, res) => {
  try {
    const guildId = req.params.id;
    const patch = req.body || {};
    const raw = fs.existsSync(rgbRolePath) ? fs.readFileSync(rgbRolePath, 'utf8') : '{}';
    const map = raw ? JSON.parse(raw) : {};
    map[guildId] = { ...(map[guildId] || { enabled: false, roleId: null, interval: 60 }), ...patch };
    fs.writeFileSync(rgbRolePath, JSON.stringify(map, null, 2));
    await syncFileToMongo(rgbRolePath);
    io.emit('configUpdated', { guildId, module: 'rgbrole', config: map[guildId] });
    res.json({ ok: true, config: map[guildId] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === Social System ===
app.get('/api/module/social/:id', auth, async (req, res) => {
  try {
    const guildId = req.params.id;
    const raw = fs.existsSync(socialPath) ? fs.readFileSync(socialPath, 'utf8') : '{}';
    const map = raw ? JSON.parse(raw) : {};
    const base = { enabled: false, welcome: 'Bienvenue sur le serveur !', goodbye: 'À bientôt !', image: null, channelId: null };
    res.json(map[guildId] || base);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/module/social/:id', auth, async (req, res) => {
  try {
    const guildId = req.params.id;
    const patch = req.body || {};
    const raw = fs.existsSync(socialPath) ? fs.readFileSync(socialPath, 'utf8') : '{}';
    const map = raw ? JSON.parse(raw) : {};
    map[guildId] = { ...(map[guildId] || { enabled: false, welcome: 'Bienvenue sur le serveur !', goodbye: 'À bientôt !', image: null, channelId: null }), ...patch };
    fs.writeFileSync(socialPath, JSON.stringify(map, null, 2));
    await syncFileToMongo(socialPath);
    io.emit('configUpdated', { guildId, module: 'social', config: map[guildId] });
    res.json({ ok: true, config: map[guildId] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === Security / Vocal Password ===
app.get('/api/module/security/:id', auth, async (req, res) => {
  try {
    const guildId = req.params.id;
    const raw = fs.existsSync(securityPath) ? fs.readFileSync(securityPath, 'utf8') : '{}';
    const map = raw ? JSON.parse(raw) : {};
    const base = { enabled: false, password: null, warningMessage: null, logsChannelId: null };
    res.json(map[guildId] || base);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/module/security/:id', auth, async (req, res) => {
  try {
    const guildId = req.params.id;
    const patch = req.body || {};
    const raw = fs.existsSync(securityPath) ? fs.readFileSync(securityPath, 'utf8') : '{}';
    const map = raw ? JSON.parse(raw) : {};
    map[guildId] = { ...(map[guildId] || { enabled: false, password: null, warningMessage: null, logsChannelId: null }), ...patch };
    fs.writeFileSync(securityPath, JSON.stringify(map, null, 2));
    try { await syncFileToMongo(securityPath); } catch {}
    io.emit('configUpdated', { guildId, module: 'security', config: map[guildId] });
    res.json({ ok: true, config: map[guildId] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restart bot (OWNER only via JWT 'sub')
app.post('/api/admin/restart', auth, (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    const ownerId = process.env.OWNER_ID;
    if (!ownerId || payload?.sub !== ownerId) {
      return res.status(403).json({ error: 'Accès interdit' });
    }
    // CSRF requis pour action sensible
    const providedCsrf = req.headers['x-csrf-token'];
    if (!providedCsrf || providedCsrf !== payload.csrf) {
      return res.status(403).json({ error: 'CSRF manquant ou invalide' });
    }
    process.env.LAST_RESTART = new Date().toISOString();
    res.json({ ok: true, restarting: true });
    setTimeout(() => process.exit(0), 500);
  } catch (err) {
    res.status(401).json({ error: 'Token invalide' });
  }
});

// Socket.IO events for real-time updates
io.on('connection', (socket) => {
  socket.emit('hello', { message: 'Connexion au tableau de bord établie' });
  // Bootstrap des derniers logs
  try {
    socket.emit('logs.bootstrap', logger.getRecentEvents(null, 200));
  } catch {}
  // Apply config patch via socket
  socket.on('updateServerConfig', ({ guildId, patch }) => {
    try {
      const raw = fs.existsSync(serversJsonPath) ? fs.readFileSync(serversJsonPath, 'utf8') : '{}';
      const map = raw ? JSON.parse(raw) : {};
      map[guildId] = { ...(map[guildId] || {}), ...patch };
      fs.writeFileSync(serversJsonPath, JSON.stringify(map, null, 2));
      io.emit('configUpdated', { guildId, config: map[guildId] });
    } catch (err) {
      socket.emit('error', { error: err.message });
    }
  });
});

// OAuth2 Discord (simple flow)
app.get('/auth/discord/login', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID || '';
  const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI || `http://localhost:${process.env.DASHBOARD_PORT || 3001}/auth/discord/callback`);
  const scope = encodeURIComponent('identify guilds');
  const responseType = 'code';
  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=${scope}`;
  res.redirect(url);
});

app.get('/auth/discord/callback', async (req, res) => {
  const code = req.query.code;
  try {
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID || '',
        client_secret: process.env.DISCORD_CLIENT_SECRET || '',
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI || `http://localhost:${process.env.DASHBOARD_PORT || 3001}/auth/discord/callback`,
      }),
    });
    const tokens = await tokenRes.json();
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `${tokens.token_type} ${tokens.access_token}` },
    });
    const user = await userRes.json();
    // Fetch guilds and derive manageable IDs (owner or MANAGE_GUILD permission)
    const guildRes = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `${tokens.token_type} ${tokens.access_token}` },
    });
    const guilds = await guildRes.json();
    const manageableIds = Array.isArray(guilds)
      ? guilds.filter(g => g.owner === true || ((Number(g.permissions || 0) & (1 << 5)) !== 0)).map(g => g.id)
      : [];
    const csrf = crypto.randomBytes(16).toString('hex');
    const jwtPayload = { sub: user.id, username: `${user.username}#${user.discriminator}`, guildsManaged: manageableIds, csrf };
    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '12h' });
    // Build user doc with minimal info for dashboard
    const avatarUrl = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128` : null;
    const guildSummaries = Array.isArray(guilds) ? guilds.map(g => ({ id: g.id, name: g.name })) : [];
    const userDoc = {
      discord_id: user.id,
      username: `${user.username}#${user.discriminator}`,
      avatar_url: avatarUrl,
      guilds: guildSummaries,
      last_login: new Date().toISOString(),
      token,
    };
    // Write/update local JSON ./json/users.json
    try {
      const raw = fs.existsSync(usersJsonPath) ? JSON.parse(fs.readFileSync(usersJsonPath, 'utf8')) : {};
      raw[user.id] = userDoc;
      fs.writeFileSync(usersJsonPath, JSON.stringify(raw, null, 2));
      // Sync into Mongo users collection (generic bucket)
      await Users.findOneAndUpdate(
        { fileName: 'users.json' },
        { data: raw, updatedAt: Date.now() },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.warn('⚠️  Impossible d’écrire users.json ou de synchroniser Mongo:', e?.message || e);
    }
    const frontendUrl = process.env.DASHBOARD_URL || 'http://localhost:5173/';
    res.redirect(`${frontendUrl}?token=${encodeURIComponent(token)}`);
  } catch (err) {
    res.status(500).json({ error: 'OAuth2 échoué', details: err.message });
  }
});

export function startDashboardServer(client, port = Number(process.env.DASHBOARD_PORT) || 3001) {
  botClient = client;
  // Attempt to listen, and if EADDRINUSE, try next ports up to +10
  const tryListen = (p, attemptsLeft = 10) => {
    server.once('error', (err) => {
      if (err && err.code === 'EADDRINUSE' && attemptsLeft > 0) {
        const nextPort = p + 1;
        console.log(`⚠️  Port ${p} occupé, tentative sur ${nextPort}...`);
        tryListen(nextPort, attemptsLeft - 1);
      } else {
        console.error('❌ Impossible de démarrer le serveur dashboard:', err?.message || err);
      }
    });
    server.listen(p, () => {
      // Update env for OAuth redirects and CORS usage
      process.env.DASHBOARD_PORT = String(p);
      try {
        const portInfoPath = path.join(process.cwd(), 'data', 'dashboard-port.json');
        fs.writeFileSync(portInfoPath, JSON.stringify({ port: p }, null, 2));
      } catch {}
      console.log(`🖥️  Dashboard backend démarré sur http://localhost:${p}`);
    });
  };
  tryListen(port);
  // Émission des logs en temps réel
  try {
    logger.subscribe((event) => {
      try { io.emit('logEvent', event); } catch {}
    });
  } catch {}
  // Periodic stats broadcast
  setInterval(() => {
    const mem = process.memoryUsage();
    const stats = {
      ram: mem.rss,
      cpu: os.loadavg()[0],
      uptime: process.uptime(),
      servers: client?.guilds?.cache?.size || 0,
      users: client?.users?.cache?.size || 0,
    };
    io.emit('stats', stats);
  }, 3000);
  return { app, io, server };
}