// src/events/guildMemberAdd.js
import { getGuildAutoRoleConfig } from '../store/autoRoleStore.js';
import { createInfoEmbed, createErrorEmbed } from '../utils/embeds.js';
import { sendAutoRoleLog } from '../utils/logs.js';
import { autoRoleConfig } from '../config/autoRoleConfig.js';
import { logger } from '../utils/logger.js';

/**
 * Gère l'événement d'arrivée d'un nouveau membre sur le serveur
 * et lui attribue automatiquement les rôles configurés
 */
export default {
  name: 'guildMemberAdd',
  once: false,
  
  /**
   * Exécuté lorsqu'un nouveau membre rejoint le serveur
   * @param {GuildMember} member - Le membre qui a rejoint le serveur
   */
  async execute(member) {
    const { guild, user, client } = member;
    
    try {
      // Vérifier que le bot est complètement prêt
      if (!client.isReady()) {
        logger.warn(`[AutoRole] Le bot n'est pas encore prêt, annulation de l'attribution des rôles pour ${user.tag}`);
        return;
      }
      
      // Récupérer la configuration AutoRole
      const config = await getGuildAutoRoleConfig(guild.id);
      
      // Vérifier si l'AutoRole est activé et qu'il y a des rôles à attribuer
      if (!config.active || !Array.isArray(config.roles) || config.roles.length === 0) {
        logger.info(`[AutoRole] Désactivé ou aucun rôle à attribuer pour le serveur ${guild.name} (${guild.id})`);
        return;
      }

      logger.info(`[AutoRole] Nouveau membre sur ${guild.name}: ${user.tag} (${user.id})`);
      
      // Vérifier que le bot a la permission de gérer les rôles
      const botMember = await guild.members.fetchMe();
      if (!botMember.permissions.has('ManageRoles')) {
        logger.warn(`[AutoRole] Permission manquante: Le bot n'a pas la permission de gérer les rôles sur le serveur ${guild.name}`);
        return;
      }
      
      // Récupérer les rôles à attribuer (uniquement ceux qui existent et sont accessibles)
      const { rolesToAdd, errors } = await this.getValidRolesToAdd(member, config.roles);
      
      if (rolesToAdd.length === 0) {
        if (errors.length > 0) {
          logger.warn(`[AutoRole] Aucun rôle valide à attribuer à ${user.tag} après vérification des permissions. Erreurs: ${errors.join('; ')}`);
        } else {
          logger.info(`[AutoRole] Aucun rôle à attribuer à ${user.tag} (tous les rôles sont déjà attribués ou non configurés)`);
        }
        return;
      }

      // Attribuer les rôles
      logger.info(`[AutoRole] Attribution de ${rolesToAdd.length} rôle(s) à ${user.tag} sur ${guild.name}`);
      await member.roles.add(rolesToAdd);
      logger.success(`[AutoRole] ${rolesToAdd.length} rôle(s) attribué(s) avec succès à ${user.tag}`);

      // Envoyer un log de l'action
      await this.logRoleAssignment(client, guild, user, rolesToAdd);

    } catch (error) {
      logger.error(`[AutoRole] Erreur lors de l'attribution automatique des rôles à ${user.tag} sur ${guild.name}:`, error);
      
      // Envoyer une erreur dans les logs AutoRole si possible
      await this.logError(client, guild, user, error);
    }
  },
  
  /**
   * Récupère les rôles valides à attribuer à un membre
   * @param {GuildMember} member - Le membre à qui attribuer les rôles
   * @param {Array<string>} roleIds - Les IDs des rôles à vérifier
   * @returns {Promise<{rolesToAdd: Array<Role>, errors: Array<string>}>} Les rôles à attribuer et les erreurs éventuelles
   */
  async getValidRolesToAdd(member, roleIds) {
    const { guild, client } = member;
    const rolesToAdd = [];
    const errors = [];
    
    // Récupérer le rôle le plus élevé du bot
    const botMember = await guild.members.fetchMe();
    const highestBotRole = botMember.roles.highest;
    
    // Vérifier chaque rôle
    for (const roleId of roleIds) {
      try {
        const role = guild.roles.cache.get(roleId);
        
        // Vérifier que le rôle existe
        if (!role) {
          errors.push(`Rôle ${roleId} introuvable`);
          continue;
        }
        
        // Vérifier que le membre n'a pas déjà ce rôle
        if (member.roles.cache.has(roleId)) {
          continue;
        }
        
        // Vérifier que le rôle n'est pas géré par une intégration
        if (role.managed) {
          errors.push(`Le rôle ${role.name} est géré par une intégration`);
          continue;
        }
        
        // Vérifier que le rôle du bot est plus haut que le rôle à attribuer
        if (role.comparePositionTo(highestBotRole) >= 0) {
          errors.push(`Le rôle ${role.name} est plus élevé que le rôle le plus haut du bot`);
          continue;
        }
        
        // Si toutes les vérifications sont passées, ajouter le rôle à la liste
        rolesToAdd.push(role);
        
      } catch (error) {
        errors.push(`Erreur lors de la vérification du rôle ${roleId}: ${error.message}`);
        logger.error(`Erreur lors de la vérification du rôle ${roleId} pour ${member.user.tag}:`, error);
      }
    }
    
    return { rolesToAdd, errors };
  },
  
  /**
   * Enregistre l'attribution des rôles dans les logs
   * @param {Client} client - L'instance du client Discord
   * @param {Guild} guild - Le serveur concerné
   * @param {User} user - L'utilisateur concerné
   * @param {Array<Role>} roles - Les rôles attribués
   */
  async logRoleAssignment(client, guild, user, roles) {
    try {
      const rolesList = roles.map(role => `• ${role} (${role.id})`).join('\n');
      
      const logEmbed = createInfoEmbed(
        '🎉 Nouveau membre',
        `👤 **Membre:** ${user} (${user.id})\n📅 **Rejoint le:** <t:${Math.floor(Date.now() / 1000)}:F>\n🏷️ **Rôles attribués (${roles.length}):**\n${rolesList}`
      )
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setFooter({ text: `ID: ${user.id} • Serveur: ${guild.name}` })
      .setTimestamp();

      // Envoyer le log via le système de logs AutoRole
      const logResult = await sendAutoRoleLog(client, guild.id, logEmbed);
      
      if (!logResult) {
        logger.warn(`[AutoRole] Aucun canal de log AutoRole configuré ou erreur d'envoi pour ${guild.name}`);
      }
    } catch (error) {
      logger.error(`[AutoRole] Erreur lors de l'envoi du log d'attribution de rôles pour ${user.tag}:`, error);
    }
  },
  
  /**
   * Enregistre une erreur dans les logs
   * @param {Client} client - L'instance du client Discord
   * @param {Guild} guild - Le serveur concerné
   * @param {User} user - L'utilisateur concerné
   * @param {Error} error - L'erreur à logger
   */
  async logError(client, guild, user, error) {
    try {
      const errorEmbed = createErrorEmbed(
        '❌ Erreur AutoRole',
        `Une erreur est survenue lors de l'attribution automatique des rôles à ${user} (${user.id}):\n\`\`\`${error.message}\`\`\``
      )
      .setFooter({ text: `ID: ${user.id} • Serveur: ${guild.name}` })
      .setTimestamp();
      
      const logResult = await sendAutoRoleLog(client, guild.id, errorEmbed);
      
      if (!logResult) {
        logger.warn(`[AutoRole] Aucun canal de log AutoRole configuré pour les erreurs sur ${guild.name}`);
      }
    } catch (logError) {
      logger.error(`[AutoRole] Erreur critique lors de la tentative de journalisation d'erreur pour ${user.tag}:`, logError);
    }
  }
};