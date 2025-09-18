import dotenv from 'dotenv';
dotenv.config();

export const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID || null,
  prefix: process.env.PREFIX || '!',
};

export function assertConfig() {
  if (!config.token) throw new Error('DISCORD_TOKEN manquant dans .env');
  if (!config.clientId) throw new Error('CLIENT_ID manquant dans .env');
}
