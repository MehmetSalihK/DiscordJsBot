import { Events } from 'discord.js';
import { assignAutoRoles } from '../modules/autorole/core.js';
import logger from '../utils/logger.js';

export default {
  name: Events.GuildMemberAdd,
  async execute(member) {
    try {
      const { guild, user } = member;
      
      logger.info(`Nouveau membre: ${user.tag} a rejoint ${guild.name}`);
      
      // Attribution automatique des rôles
      await assignAutoRoles(member);
      
    } catch (error) {
      logger.error('Erreur dans le gestionnaire guildMemberAdd:', error);
    }
  }
};


