import { EmbedBuilder } from 'discord.js';
import { getGuildAutoRoleConfig } from '../store/autoRoleStore.js';

/**
 * Envoie un log de succès d'attribution de rôles
 * @param {Guild} guild - Le serveur
 * @param {User} user - L'utilisateur
 * @param {Array} assignedRoles - Les rôles attribués avec succès
 */
export async function sendAutoRoleSuccessLog(guild, user, assignedRoles) {
  const config = getGuildAutoRoleConfig(guild.id);
  if (!config.logChannelId) return;
  
  try {
    const logChannel = guild.channels.cache.get(config.logChannelId);
    if (!logChannel || !logChannel.isTextBased()) return;
    
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('✅ AutoRole - Attribution Réussie')
      .setDescription(`Les rôles automatiques ont été attribués avec succès.`)
      .addFields(
        { name: '👤 Nouveau Membre', value: `${user.tag} (${user.id})`, inline: true },
        { name: '🎯 Rôles Attribués', value: assignedRoles.map(role => `<@&${role.id}>`).join('\n'), inline: true },
        { name: '📊 Statistiques', value: `**Total rôles :** ${assignedRoles.length}\n**Membre #${guild.memberCount}**`, inline: true },
        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: `Serveur: ${guild.name}`, iconURL: guild.iconURL({ dynamic: true }) })
      .setTimestamp();
    
    await logChannel.send({ embeds: [embed] });
    
  } catch (error) {
    console.error('Erreur lors de l\'envoi du log de succès AutoRole:', error);
  }
}

/**
 * Envoie un log d'erreur d'attribution de rôles
 * @param {Guild} guild - Le serveur
 * @param {User} user - L'utilisateur
 * @param {Array} roles - Les rôles qui devaient être attribués
 * @param {Error} error - L'erreur rencontrée
 */
export async function sendAutoRoleErrorLog(guild, user, roles, error) {
  const config = getGuildAutoRoleConfig(guild.id);
  if (!config.logChannelId) return;
  
  try {
    const logChannel = guild.channels.cache.get(config.logChannelId);
    if (!logChannel || !logChannel.isTextBased()) return;
    
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('❌ AutoRole - Erreur d\'Attribution')
      .setDescription(`Une erreur s'est produite lors de l'attribution des rôles automatiques.`)
      .addFields(
        { name: '👤 Membre', value: `${user.tag} (${user.id})`, inline: true },
        { name: '🎯 Rôles Concernés', value: roles.map(role => `<@&${role.id}>`).join('\n'), inline: true },
        { name: '⚠️ Erreur', value: `\`\`\`${error.message}\`\`\``, inline: false },
        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: `Serveur: ${guild.name}`, iconURL: guild.iconURL({ dynamic: true }) })
      .setTimestamp();
    
    await logChannel.send({ embeds: [embed] });
    
  } catch (logError) {
    console.error('Erreur lors de l\'envoi du log d\'erreur AutoRole:', logError);
  }
}

/**
 * Envoie un log de configuration AutoRole
 * @param {Guild} guild - Le serveur
 * @param {User} user - L'utilisateur qui a effectué l'action
 * @param {string} action - L'action effectuée
 * @param {string} details - Les détails de l'action
 */
export async function sendAutoRoleConfigLog(guild, user, action, details) {
  const config = getGuildAutoRoleConfig(guild.id);
  if (!config.logChannelId) return;
  
  try {
    const logChannel = guild.channels.cache.get(config.logChannelId);
    if (!logChannel || !logChannel.isTextBased()) return;
    
    let color = 0x5865F2;
    let emoji = '⚙️';
    
    // Définir la couleur et l'emoji selon l'action
    switch (action.toLowerCase()) {
      case 'activation':
        color = 0x00FF00;
        emoji = '✅';
        break;
      case 'désactivation':
        color = 0xFF6B6B;
        emoji = '❌';
        break;
      case 'ajout':
        color = 0x00FF00;
        emoji = '➕';
        break;
      case 'suppression':
        color = 0xFF6B6B;
        emoji = '➖';
        break;
      case 'réinitialisation':
        color = 0xFF0000;
        emoji = '🗑️';
        break;
      case 'logs':
        color = 0x5865F2;
        emoji = '📝';
        break;
    }
    
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${emoji} AutoRole - Configuration Modifiée`)
      .setDescription(`La configuration AutoRole a été modifiée.`)
      .addFields(
        { name: '👤 Administrateur', value: `${user.tag} (${user.id})`, inline: true },
        { name: '🔧 Action', value: action, inline: true },
        { name: '📋 Détails', value: details, inline: false },
        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: `Serveur: ${guild.name}`, iconURL: guild.iconURL({ dynamic: true }) })
      .setTimestamp();
    
    await logChannel.send({ embeds: [embed] });
    
  } catch (error) {
    console.error('Erreur lors de l\'envoi du log de configuration AutoRole:', error);
  }
}

/**
 * Envoie un log d'avertissement AutoRole
 * @param {Guild} guild - Le serveur
 * @param {string} warning - Le message d'avertissement
 * @param {string} details - Les détails de l'avertissement
 */
export async function sendAutoRoleWarningLog(guild, warning, details) {
  const config = getGuildAutoRoleConfig(guild.id);
  if (!config.logChannelId) return;
  
  try {
    const logChannel = guild.channels.cache.get(config.logChannelId);
    if (!logChannel || !logChannel.isTextBased()) return;
    
    const embed = new EmbedBuilder()
      .setColor(0xFFAA00)
      .setTitle('⚠️ AutoRole - Avertissement')
      .setDescription(warning)
      .addFields(
        { name: '📋 Détails', value: details, inline: false },
        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setFooter({ text: `Serveur: ${guild.name}`, iconURL: guild.iconURL({ dynamic: true }) })
      .setTimestamp();
    
    await logChannel.send({ embeds: [embed] });
    
  } catch (error) {
    console.error('Erreur lors de l\'envoi du log d\'avertissement AutoRole:', error);
  }
}

/**
 * Envoie un log d'information AutoRole
 * @param {Guild} guild - Le serveur
 * @param {string} title - Le titre du log
 * @param {string} message - Le message d'information
 */
export async function sendAutoRoleInfoLog(guild, title, message) {
  const config = getGuildAutoRoleConfig(guild.id);
  if (!config.logChannelId) return;
  
  try {
    const logChannel = guild.channels.cache.get(config.logChannelId);
    if (!logChannel || !logChannel.isTextBased()) return;
    
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`ℹ️ AutoRole - ${title}`)
      .setDescription(message)
      .addFields(
        { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setFooter({ text: `Serveur: ${guild.name}`, iconURL: guild.iconURL({ dynamic: true }) })
      .setTimestamp();
    
    await logChannel.send({ embeds: [embed] });
    
  } catch (error) {
    console.error('Erreur lors de l\'envoi du log d\'information AutoRole:', error);
  }
}