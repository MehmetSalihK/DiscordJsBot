import { Events, EmbedBuilder } from 'discord.js';
import { getGuildAutoRoleConfig, updateGuildName, updateGuildAutoRoleConfig } from '../store/autoRoleStore.js';
import { sendAutoRoleSuccessLog, sendAutoRoleErrorLog, sendAutoRoleWarningLog } from '../utils/autoRoleLogs.js';

export default {
  name: Events.GuildMemberAdd,
  async execute(member) {
    try {
      const { guild, user } = member;
      
      // Mettre à jour le nom du serveur dans la base de données
      updateGuildName(guild.id, guild.name);
      
      // Récupérer la configuration AutoRole du serveur
      const autoRoleConfig = getGuildAutoRoleConfig(guild.id);
      
      // Vérifier si l'AutoRole est activé
      if (!autoRoleConfig.active || !autoRoleConfig.roles || autoRoleConfig.roles.length === 0) {
        return;
      }
      
      // Filtrer les rôles valides (qui existent encore sur le serveur)
      const validRoles = [];
      const invalidRoles = [];
      
      for (const roleId of autoRoleConfig.roles) {
        const role = guild.roles.cache.get(roleId);
        if (role) {
          validRoles.push(role);
        } else {
          invalidRoles.push(roleId);
        }
      }
      
      // Si des rôles invalides sont trouvés, les supprimer de la configuration
      if (invalidRoles.length > 0) {
        console.log(`Suppression des rôles invalides pour ${guild.name}: ${invalidRoles.join(', ')}`);
        const updatedRoles = autoRoleConfig.roles.filter(roleId => !invalidRoles.includes(roleId));
        updateGuildAutoRoleConfig(guild.id, { roles: updatedRoles });
      }
      
      // Attribuer les rôles valides au nouveau membre
      if (validRoles.length > 0) {
        try {
          await member.roles.add(validRoles, 'Attribution automatique des rôles (AutoRole)');
          
          console.log(`✅ Rôles attribués à ${user.tag} sur ${guild.name}: ${validRoles.map(r => r.name).join(', ')}`);
          
          // Envoyer un log si un canal de logs est configuré
          await sendAutoRoleSuccessLog(guild, user, validRoles);
          
        } catch (error) {
          console.error(`❌ Erreur lors de l'attribution des rôles à ${user.tag} sur ${guild.name}:`, error);
          
          // Envoyer un log d'erreur si possible
          await sendAutoRoleErrorLog(guild, user, validRoles, error);
        }
      }
      
    } catch (error) {
      console.error('Erreur dans le gestionnaire guildMemberAdd:', error);
    }
  }
};