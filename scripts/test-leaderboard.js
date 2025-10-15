import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

function pickGuildId() {
  try {
    const serversPath = path.join(process.cwd(), 'json', 'servers.json');
    if (fs.existsSync(serversPath)) {
      const map = JSON.parse(fs.readFileSync(serversPath, 'utf8'));
      const keys = Object.keys(map || {});
      if (keys.length) return keys[0];
    }
  } catch {}
  try {
    const msgPath = path.join(process.cwd(), 'json', 'messageXp.json');
    if (fs.existsSync(msgPath)) {
      const map = JSON.parse(fs.readFileSync(msgPath, 'utf8'));
      const keys = Object.keys(map || {});
      if (keys.length) return keys[0];
    }
  } catch {}
  return process.env.GUILD_ID || '780119216954802197';
}

async function run() {
  const guildId = pickGuildId();
  const base = process.env.BASE || 'http://localhost:3001';
  const token = jwt.sign(
    { sub: 'test-user', username: 'tester', guildsManaged: [guildId], csrf: 'abc123' },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '1h' }
  );
  const headers = { Authorization: `Bearer ${token}` };

  async function req(pathname, opts = {}) {
    const url = `${base}${pathname}`;
    const res = await fetch(url, { headers, ...opts });
    const text = await res.text();
    const prefix = `${res.status} ${res.statusText}`;
    console.log(`\nGET ${url}\n=> ${prefix}\n${text}`);
  }

  await req('/api/health', { headers: {} });
  await req('/api/me');
  await req(`/api/servers`);
  await req(`/api/module/xp/${guildId}`);
  await req(`/api/xp/leaderboard/message/${guildId}?limit=5`);
  await req(`/api/xp/leaderboard/voice/${guildId}?limit=5`);
  await req(`/api/xp/leaderboard/global/${guildId}?limit=5`);
}

run().catch((e) => {
  console.error('Test script failed:', e);
  process.exit(1);
});