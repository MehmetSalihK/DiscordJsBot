import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getPrefix } from '../../../src/store/configStore.js';
import { config } from '../../../src/config.js';

export default {
  category: 'utilisateur',
  data: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('Affiche le préfixe actuel du bot sur ce serveur.'),
  async execute(interaction) {
    try {
      const guildId = interaction.guild.id;
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

      return interaction.reply({ 
        embeds: [embed],
        ephemeral: true 
      });
    } catch (error) {
      console.error('[ERREUR] Slash /prefix:', error);
      return interaction.reply({ 
        content: '❌ Une erreur est survenue lors de la récupération du préfixe.',
        ephemeral: true 
      });
    }
  },
};
