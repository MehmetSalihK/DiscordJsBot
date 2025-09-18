import { Events } from 'discord.js';
import { assignAutoRoles } from '../modules/autorole/core.js';

export default {
  name: Events.GuildMemberAdd,
  async execute(member) {
    try {
      const { guild, user } = member;
      
      console.log(`👋 Nouveau membre: ${user.tag} a rejoint ${guild.name}`);
      
      // Attribution automatique des rôles
      await assignAutoRoles(member);
      
    } catch (error) {
      console.error('Erreur dans le gestionnaire guildMemberAdd:', error);
    }
  }
};