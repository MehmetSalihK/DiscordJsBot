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
  
  // Emojis pour UserInfo
  profile: '👤',
  calendar: '📅',
  birthday: '🎂',
  join: '📥',
  roles: '🎭',
  permissions: '🛡️',
  crown: '👑',
  moderator: '🛡️',
  member: '👤',
  status: '📶',
  activity: '🎮',
  phone: '📱',
  

  
  // Emojis pour Social
  globe: '🌐',
  link: '🔗',
  twitter: '🐦',
  instagram: '📸',
  twitch: '🎮',
  github: '🐙',
  linkedin: '💼',
  tiktok: '🎵',
  settings: '⚙️',
  wrench: '🔧',
  trash: '🗑️',
  eye: '👁️',
  
  // Badges et statuts
  legend: '👑',
  expert: '💎',
  veteran: '🏆',
  active: '⭐',
  beginner: '🌱',
  online: '🟢',
  offline: '🔴',
  checkmark: '✅',
  cross: '❌',
  
  // Autres
  search: '🔍',
  clipboard: '📋',
  folder: '📁',
  lock: '🔒',
  unlock: '🔓',
  bell: '🔔',
  heart: '❤️',
  diamond: '💎',
  money: '💰',
  gift: '🎁'
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


