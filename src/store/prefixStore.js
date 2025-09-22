import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../../data');
const storePath = path.join(dataDir, 'prefixes.json');

function ensureStore() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  if (!existsSync(storePath)) writeFileSync(storePath, JSON.stringify({}, null, 2), 'utf-8');
}

export function getPrefix(guildId, defaultPrefix = '!') {
  try {
    ensureStore();
    const raw = readFileSync(storePath, 'utf-8');
    const obj = JSON.parse(raw || '{}');
    return obj[guildId] || defaultPrefix;
  } catch {
    return defaultPrefix;
  }
}

export function setPrefix(guildId, prefix) {
  ensureStore();
  const raw = readFileSync(storePath, 'utf-8');
  const obj = JSON.parse(raw || '{}');
  obj[guildId] = prefix;
  writeFileSync(storePath, JSON.stringify(obj, null, 2), 'utf-8');
  return prefix;
}


