import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonDir = path.join(__dirname, '../../json');
const serversPath = path.join(jsonDir, 'servers.json');

function ensureStore() {
  if (!existsSync(jsonDir)) mkdirSync(jsonDir, { recursive: true });
  if (!existsSync(serversPath)) {
    writeFileSync(serversPath, JSON.stringify({}, null, 2), 'utf-8');
  }
}

export function readServers() {
  ensureStore();
  try {
    const raw = readFileSync(serversPath, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

export function writeServers(map) {
  ensureStore();
  writeFileSync(serversPath, JSON.stringify(map, null, 2), 'utf-8');
}

export function getGuildConfig(guildId) {
  const map = readServers();
  if (!map[guildId]) {
    map[guildId] = {
      name: '',
      prefix: '!',
      logs: { active: true, logChannelId: null },
      voiceLogs: { active: false, logChannelId: null },
    };
    writeServers(map);
  }
  return map[guildId];
}

export function setGuildConfig(guildId, patch) {
  const map = readServers();
  if (!map[guildId]) map[guildId] = {
    name: '', prefix: '!', logs: { active: true, logChannelId: null }, voiceLogs: { active: false, logChannelId: null }
  };
  map[guildId] = { ...map[guildId], ...patch };
  writeServers(map);
  return map[guildId];
}

export function getPrefix(guildId, fallback = '!') {
  const g = getGuildConfig(guildId);
  return g.prefix || fallback;
}

export function setPrefix(guildId, prefix) {
  const g = setGuildConfig(guildId, { prefix });
  return g.prefix;
}

export function getLogChannelId(guildId) {
  const g = getGuildConfig(guildId);
  // Compat: lire ancien champ si présent
  return g.logs?.logChannelId ?? g.logChannelId ?? null;
}

export function setLogChannelId(guildId, channelId) {
  const cur = getGuildConfig(guildId);
  const logs = { active: cur.logs?.active ?? cur.logsActive ?? true, logChannelId: channelId };
  const g = setGuildConfig(guildId, { logs });
  return g.logs.logChannelId;
}

export function toggleFeature(guildId, featureKey, value) {
  const map = readServers();
  if (!map[guildId]) map[guildId] = { name: '', prefix: '!', logs: { active: true, logChannelId: null } };
  // compat: 'logging' maps to logs.active
  if (featureKey === 'logging') {
    const logs = map[guildId].logs || { active: true, logChannelId: null };
    logs.active = !!value;
    map[guildId].logs = logs;
  } else {
    // store unknown toggles under a generic features bag for future use
    const features = { ...(map[guildId].features || {}), [featureKey]: value };
    map[guildId].features = features;
  }
  writeServers(map);
  return map[guildId];
}


