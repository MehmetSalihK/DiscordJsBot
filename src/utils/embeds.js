import { EmbedBuilder, Colors } from 'discord.js';

export const Emojis = {
  info: 'ℹ️',
  success: '✅',
  error: '⚠️',
  admin: '🛠️',
  mod: '🛡️',
  user: '👤',
  ping: '🏓',
  help: '📚',
  server: '🏰',
  role: '🏷️',
  log: '📝',
};

export function createInfoEmbed(title, description, extra = {}) {
  return new EmbedBuilder()
    .setColor(Colors.Blurple)
    .setTitle(`${Emojis.info} ${title}`)
    .setDescription(description || null)
    .setTimestamp()
    .setFooter(extra.footer ? { text: extra.footer } : null);
}

export function createSuccessEmbed(title, description, extra = {}) {
  return new EmbedBuilder()
    .setColor(Colors.Green)
    .setTitle(`${Emojis.success} ${title}`)
    .setDescription(description || null)
    .setTimestamp()
    .setFooter(extra.footer ? { text: extra.footer } : null);
}

export function createErrorEmbed(title, description, extra = {}) {
  return new EmbedBuilder()
    .setColor(Colors.Red)
    .setTitle(`${Emojis.error} ${title}`)
    .setDescription(description || null)
    .setTimestamp()
    .setFooter(extra.footer ? { text: extra.footer } : null);
}


