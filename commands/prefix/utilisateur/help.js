import { PermissionFlagsBits } from 'discord.js';
import { getPrefix } from '../../../src/store/configStore.js';
import { getAvailableCategories, createCategoryEmbed, createNavigationButtons } from '../../slashcommands/utilisateur/help.js';

export default {
  name: 'help',
  description: 'Affiche la liste des commandes disponibles avec pagination',
  category: 'utilisateur',
  usage: 'help',
  async execute(message, args, client) {
    try {
      const guildId = message.guild.id;
      const member = message.member;
      const prefix = getPrefix(guildId, '!');
      
      // Vérifier les permissions
      const hasAdminPerms = member.permissions.has(PermissionFlagsBits.Administrator);
      const hasModPerms = member.permissions.has(PermissionFlagsBits.ModerateMembers) || 
                         member.permissions.has(PermissionFlagsBits.KickMembers) || 
                         member.permissions.has(PermissionFlagsBits.BanMembers);

      // Déterminer les catégories disponibles selon les permissions
      const categories = getAvailableCategories(hasAdminPerms, hasModPerms);
      
      // Commencer à la première page
      const currentPage = 0;
      const embed = createCategoryEmbed(categories[currentPage], prefix, client, currentPage + 1, categories.length);
      const components = createNavigationButtons(currentPage, categories.length, hasAdminPerms, hasModPerms);

      await message.reply({ 
        embeds: [embed], 
        components: components
      });
    } catch (error) {
      console.error('❌ [ERREUR] Préfixe help:', error);
      return message.reply("❌ Une erreur est survenue lors de l'affichage de l'aide.");
    }
  },
};



