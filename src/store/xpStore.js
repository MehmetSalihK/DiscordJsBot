import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getGuildConfig } from './configStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonDir = path.join(__dirname, '../../json');
const xpPath = path.join(jsonDir, 'xp.json');

function ensureXPStore() {
  if (!existsSync(jsonDir)) mkdirSync(jsonDir, { recursive: true });
  if (!existsSync(xpPath)) writeFileSync(xpPath, JSON.stringify({}, null, 2), 'utf-8');
}

export function readXP() {
  ensureXPStore();
  try {
    const raw = readFileSync(xpPath, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

export function writeXP(map) {
  ensureXPStore();
  writeFileSync(xpPath, JSON.stringify(map, null, 2), 'utf-8');
}

function getDefaultUser() {
  return { xp: 0, level: 0, lastMessage: 0, voiceTime: 0 };
}

export function getUserData(guildId, userId) {
  const map = readXP();
  if (!map[guildId]) map[guildId] = {};
  if (!map[guildId][userId]) map[guildId][userId] = getDefaultUser();
  writeXP(map);
  return map[guildId][userId];
}

export function setUserData(guildId, userId, data) {
  const map = readXP();
  if (!map[guildId]) map[guildId] = {};
  map[guildId][userId] = { ...getDefaultUser(), ...data };
  writeXP(map);
  return map[guildId][userId];
}

export function getRequiredXPForLevel(guildId, level) {
  const conf = getGuildConfig(guildId);
  const lvls = conf?.xpSystem?.levels || {};
  if (lvls[String(level)]) return lvls[String(level)];
  // back-off formula: double previous requirement starting from last known or 500
  let lastKnown = 500;
  const keys = Object.keys(lvls).map(Number).sort((a,b)=>a-b);
  for (const k of keys) {
    if (k <= level) lastKnown = lvls[String(k)];
  }
  const delta = Math.max(0, level - (keys.at(-1) || 1));
  return lastKnown * Math.pow(2, delta);
}

export function addXP(guildId, userId, amount) {
  const conf = getGuildConfig(guildId);
  const active = conf?.xpSystem?.active !== false;
  if (!active || amount <= 0) return { updated: null, leveledUp: false };
  const user = getUserData(guildId, userId);
  user.xp += amount;
  // level up loop
  let leveledUp = false;
  while (true) {
    const nextLevel = user.level + 1;
    const req = getRequiredXPForLevel(guildId, Math.max(1, nextLevel));
    if (user.xp >= req) {
      user.level = nextLevel;
      leveledUp = true;
    } else {
      break;
    }
  }
  setUserData(guildId, userId, user);
  return { updated: user, leveledUp };
}

export function resetUserXP(guildId, userId) {
  const user = setUserData(guildId, userId, getDefaultUser());
  return user;
}

export function resetAllXP(guildId) {
  const map = readXP();
  map[guildId] = {};
  writeXP(map);
}

export function getLeaderboard(guildId) {
  const map = readXP();
  const users = Object.entries(map[guildId] || {})
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.xp - a.xp);
  return users;
}


