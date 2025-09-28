import { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } from 'discord.js';
import { setPrefix, getPrefix } from '../../../src/store/configStore.js';
import { config } from '../../../src/config.js';

export default {
  category: 'admin',
  data: new SlashCommandBuilder()
    .setName('setprefix')
    .setDescription('Change le préfixe du bot pour ce serveur.')
    .addStringOption(option => 
      option.setName('prefixe')
        .setDescription('Le nouveau préfixe à utiliser')
        .setRequired(true)
        .setMaxLength(5)),
  async execute(interaction) {
    try {
      // Vérifier les permissions d'administrateur
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ 
          content: '❌ Tu n\'as pas la permission d\'utiliser cette commande.',
          ephemeral: true 
        });
      }

      const oldPrefix = getPrefix(interaction.guild.id, config.prefix);
      const newPrefix = interaction.options.getString('prefixe', true);
      
      // Mettre à jour le préfixe
      setPrefix(interaction.guild.id, newPrefix);
      
      // Créer un embed de confirmation
      const embed = new EmbedBuilder()
        .setColor('#4CAF50')
        .setTitle('✅ Préfixe mis à jour avec succès !')
        .addFields(
          { name: 'Ancien préfixe', value: `\`${oldPrefix}\``, inline: true },
          { name: 'Nouveau préfixe', value: `\`${newPrefix}\``, inline: true },
        )
        .setTimestamp();

      return interaction.reply({ 
        embeds: [embed],
        ephemeral: true 
      });
      
    } catch (error) {
      console.error('[ERREUR] Slash /setprefix:', error);
      
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ 
          content: '❌ Une erreur est survenue lors de la mise à jour du préfixe.',
          ephemeral: true 
        });
      }
      
      return interaction.reply({ 
        content: '❌ Une erreur est survenue lors de la mise à jour du préfixe.',
        ephemeral: true 
      });
    }
  },
};




