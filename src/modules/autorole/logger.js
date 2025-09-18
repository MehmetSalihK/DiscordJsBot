import { EmbedBuilder } from 'discord.js';
import { getGuildConfig } from './storage.js';

/**
 * Couleurs pour les différents types de logs
 */
const LOG_COLORS = {
  SUCCESS: 0x00FF00,
  ERROR: 0xFF0000,
  WARNING: 0xFFA500,
  INFO: 0x0099FF,
  CONFIG: 0x9932CC
};

/**
 * Crée un embed de log avec le style approprié
 */
function createLogEmbed(type, title, description, fields = []) {
  const embed = new EmbedBuilder()
    .setColor(LOG_COLORS[type])
    .setTitle(title)
    .setDescription(description)
    .setTimestamp()
    .setFooter({ text: 'AutoRole System' });

  if (fields.length > 0) {
    embed.addFields(fields);
  }

  return embed;
}

/**
 * Envoie un log dans le canal approprié
 */
async function sendLog(guild, embed) {
  try {
    const config = getGuildConfig(guild.id);
    let logChannel = null;

    // Priorité au canal de logs AutoRole spécifique
    if (config.logChannel) {
      logChannel = guild.channels.cache.get(config.logChannel);
    }

    // Fallback sur le canal de logs général si configuré
    if (!logChannel) {
      // Ici on pourrait récupérer le canal de logs général depuis configStore
      // Pour l'instant on skip si pas de canal spécifique
      return;
    }

    if (logChannel && logChannel.isTextBased()) {
      await logChannel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error('Erreur lors de l\'envoi du log AutoRole:', error);
  }
}

/**
 * Log de succès - Attribution de rôles réussie
 */
export async function logSuccess(guild, user, roles) {
  const roleList = roles.map(role => `• ${role.name} (${role.id})`).join('\n');
  
  const embed = createLogEmbed(
    'SUCCESS',
    '✅ Rôles attribués avec succès',
    `Les rôles AutoRole ont été attribués à ${user.tag}`,
    [
      {
        name: '👤 Utilisateur',
        value: `${user.tag} (${user.id})`,
        inline: true
      },
      {
        name: '🎭 Rôles attribués',
        value: roleList || 'Aucun',
        inline: false
      }
    ]
  );

  await sendLog(guild, embed);
}

/**
 * Log d'erreur - Échec de l'attribution de rôles
 */
export async function logError(guild, user, roles, error) {
  const roleList = roles.map(role => `• ${role.name} (${role.id})`).join('\n');
  
  const embed = createLogEmbed(
    'ERROR',
    '❌ Erreur lors de l\'attribution des rôles',
    `Impossible d'attribuer les rôles AutoRole à ${user.tag}`,
    [
      {
        name: '👤 Utilisateur',
        value: `${user.tag} (${user.id})`,
        inline: true
      },
      {
        name: '🎭 Rôles concernés',
        value: roleList || 'Aucun',
        inline: false
      },
      {
        name: '⚠️ Erreur',
        value: error.message || 'Erreur inconnue',
        inline: false
      }
    ]
  );

  await sendLog(guild, embed);
}

/**
 * Log d'avertissement - Situations particulières
 */
export async function logWarning(guild, user, message) {
  const embed = createLogEmbed(
    'WARNING',
    '⚠️ Avertissement AutoRole',
    message,
    [
      {
        name: '👤 Utilisateur',
        value: `${user.tag} (${user.id})`,
        inline: true
      }
    ]
  );

  await sendLog(guild, embed);
}

/**
 * Log de configuration - Modifications de la configuration
 */
export async function logConfig(guild, user, action, details) {
  const embed = createLogEmbed(
    'CONFIG',
    '⚙️ Configuration AutoRole modifiée',
    `Action effectuée par ${user.tag}`,
    [
      {
        name: '👤 Administrateur',
        value: `${user.tag} (${user.id})`,
        inline: true
      },
      {
        name: '🔧 Action',
        value: action,
        inline: true
      },
      {
        name: '📝 Détails',
        value: details,
        inline: false
      }
    ]
  );

  await sendLog(guild, embed);
}

/**
 * Log d'information - Informations générales
 */
export async function logInfo(guild, title, message, fields = []) {
  const embed = createLogEmbed('INFO', title, message, fields);
  await sendLog(guild, embed);
}