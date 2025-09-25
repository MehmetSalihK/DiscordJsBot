import { ChannelType, EmbedBuilder } from 'discord.js';
import { getGuildConfig } from '../store/configStore.js';

// Fonction utilitaire pour envoyer un message dans un canal de log
async function sendToLogChannel(client, guildId, channelId, embed) {
  try {
    if (!client || !guildId || !channelId) {
      // console.error('[Logs] Paramètres manquants pour l\'envoi de log');
      return false;
    }

    // Récupérer le canal
    const channel = await client.channels.fetch(channelId).catch(error => {
      // console.error(`[Logs] Erreur lors de la récupération du canal ${channelId}:`, error.message);
      return null;
    });

    // Vérifier que le canal est valide
    if (!channel || channel.type !== ChannelType.GuildText) {
      // console.error(`[Logs] Canal non valide ou n'est pas un salon texte: ${channelId}`);
      return false;
    }

    // Envoyer le message
    await channel.send({ embeds: [embed] }).catch(error => {
      // console.error(`[Logs] Erreur lors de l'envoi du log dans #${channel.name}:`, error.message);
      return false;
    });

    return true;
  } catch (error) {
    // console.error('[Logs] Erreur inattendue dans sendToLogChannel:', error);
    return false;
  }
}

// Logs généraux du serveur
export async function sendGuildLog(client, guildId, embed) {
  try {
    const conf = getGuildConfig(guildId);
    
    // Vérifier si les logs sont activés
    if (!conf?.logs?.active) {
      // console.log(`[Logs] Logs désactivés pour le serveur ${guildId}`);
      return false;
    }
    
    // Récupérer l'ID du canal de logs
    const channelId = conf.logs.logChannelId || conf.logChannelId;
    if (!channelId) {
      // console.log(`[Logs] Aucun canal de log configuré pour le serveur ${guildId}`);
      return false;
    }
    
    // Envoyer le log
    return await sendToLogChannel(client, guildId, channelId, embed);
  } catch (error) {
    // console.error(`[Logs] Erreur dans sendGuildLog pour le serveur ${guildId}:`, error);
    return false;
  }
}



// Logs du système d'AutoRole
export async function sendAutoRoleLog(client, guildId, embed) {
  try {
    const conf = getGuildConfig(guildId);
    
    // Vérifier si les logs AutoRole sont activés (par défaut: true si non spécifié)
    if (conf?.autoRole?.logs?.active === false) {
      // console.log(`[Logs] Logs AutoRole désactivés pour le serveur ${guildId}`);
      return false;
    }
    
    // Récupérer l'ID du canal de logs (par défaut: canal de logs général si non spécifié)
    let channelId = conf?.autoRole?.logs?.logChannelId;
    
    // Si aucun canal spécifique n'est défini pour les logs AutoRole, utiliser le canal de logs général
    if (!channelId) {
      // console.log(`[Logs] Utilisation du canal de logs général pour les logs AutoRole (${guildId})`);
      return await sendGuildLog(client, guildId, embed);
    }
    
    // Envoyer le log au canal spécifique
    return await sendToLogChannel(client, guildId, channelId, embed);
  } catch (error) {
    // console.error(`[Logs] Erreur dans sendAutoRoleLog pour le serveur ${guildId}:`, error);
    
    // En cas d'erreur, essayer d'envoyer dans le canal de logs général
    try {
      // console.log(`[Logs] Tentative d'envoi du log AutoRole dans le canal général (${guildId})`);
      return await sendGuildLog(client, guildId, embed);
    } catch (fallbackError) {
      // console.error(`[Logs] Échec de l'envoi du log AutoRole dans le canal général:`, fallbackError);
      return false;
    }
  }
}

// Logs vocaux (connexions/déconnexions)
export async function sendVoiceLog(client, guildId, embed) {
  try {
    const conf = getGuildConfig(guildId);
    
    // Vérifier si les logs vocaux sont activés
    if (conf?.voiceLogs?.active === false) {
      // console.log(`[Logs] Logs vocaux désactivés pour le serveur ${guildId}`);
      return false;
    }
    
    // Récupérer l'ID du canal de logs vocaux
    let channelId = conf?.voiceLogs?.logChannelId;
    
    // Si aucun canal spécifique n'est défini pour les logs vocaux, utiliser le canal de logs général
    if (!channelId) {
      // console.log(`[Logs] Utilisation du canal de logs général pour les logs vocaux (${guildId})`);
      return await sendGuildLog(client, guildId, embed);
    }
    
    // Envoyer le log au canal spécifique
    return await sendToLogChannel(client, guildId, channelId, embed);
  } catch (error) {
    // console.error(`[Logs] Erreur dans sendVoiceLog pour le serveur ${guildId}:`, error);
    
    // En cas d'erreur, essayer d'envoyer dans le canal de logs général
    try {
      // console.log(`[Logs] Tentative d'envoi du log vocal dans le canal général (${guildId})`);
      return await sendGuildLog(client, guildId, embed);
    } catch (fallbackError) {
      // console.error(`[Logs] Échec de l'envoi du log vocal dans le canal général:`, fallbackError);
      return false;
    }
  }
}


