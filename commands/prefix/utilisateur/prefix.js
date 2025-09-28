import { EmbedBuilder } from 'discord.js';
import { getPrefix } from '../../../src/store/configStore.js';
import { config } from '../../../src/config.js';

export default {
  name: 'prefix',
  description: 'Affiche le préfixe actuel du bot sur ce serveur.',
  category: 'utilisateur',
  usage: 'prefix',
  async execute(message) {
    try {
      const guildId = message.guild.id;
      const currentPrefix = getPrefix(guildId, config.prefix);
      
      // Créer un embed pour afficher le préfixe
      const embed = new EmbedBuilder()
        .setColor('#4CAF50')
        .setTitle('🔧 Préfixe du serveur')
        .setDescription(`Le préfixe actuel de ce serveur est : \`${currentPrefix}\``)
        .addFields(
          { name: 'Comment l\'utiliser ?', value: `Tapez \`${currentPrefix}commande\` pour utiliser une commande.` },
          { name: 'Exemple', value: `\`${currentPrefix}help\` - Affiche l'aide des commandes` }
        )
        .setFooter({ text: 'Vous devez être administrateur pour modifier le préfixe.' })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('[ERREUR] Commande prefix:', error);
      return message.reply({ 
        content: '❌ Une erreur est survenue lors de la récupération du préfixe.',
        allowedMentions: { repliedUser: false }
      });
    }
  },
};
