import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { createSuccessEmbed, createErrorEmbed } from '../../../src/utils/embeds.js';
import { sendGuildLog } from '../../../src/utils/logs.js';

export default {
  category: 'moderateur',
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Supprime un nombre de messages dans le salon actuel (max 100).')
    .addIntegerOption(opt => opt.setName('nombre').setDescription('Nombre de messages à supprimer (1-100)').setRequired(true).setMinValue(1).setMaxValue(100)),
  async execute(interaction) {
    try {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageMessages)) {
        return interaction.reply({ embeds: [createErrorEmbed('Permission manquante', "Vous n'avez pas la permission de gérer les messages.")], flags: 64 }); // MessageFlags.Ephemeral
      }
      if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return interaction.reply({ embeds: [createErrorEmbed('Permission manquante', "Je n'ai pas la permission de gérer les messages.")], flags: 64 }); // MessageFlags.Ephemeral
      }

      const count = interaction.options.getInteger('nombre', true);
      const deletedMessages = await interaction.channel.bulkDelete(count, true);
      const actualCount = deletedMessages.size;
      
      const emb = createSuccessEmbed('Nettoyage', `**${actualCount}** message(s) supprimé(s) dans <#${interaction.channelId}>.`);
      await interaction.reply({ embeds: [emb] });
      await sendGuildLog(interaction.client, interaction.guildId, emb);
    } catch (error) {
      console.error('[ERREUR] Slash /clear:', error);
      if (interaction.deferred || interaction.replied) return interaction.editReply({ embeds: [createErrorEmbed('Erreur', 'Une erreur est survenue lors de la suppression des messages.')] });
      return interaction.reply({ embeds: [createErrorEmbed('Erreur', 'Une erreur est survenue lors de la suppression des messages.')], flags: 64 }); // MessageFlags.Ephemeral
    }
  },
};
