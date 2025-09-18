import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { resetAllXP } from '../../../src/store/xpStore.js';
import { createErrorEmbed, createSuccessEmbed } from '../../../src/utils/embeds.js';

export default {
  category: 'admin',
  data: new SlashCommandBuilder()
    .setName('resetallxp')
    .setDescription("Réinitialiser l'XP de tous les membres du serveur")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    try {
      resetAllXP(interaction.guildId);
      const emb = createSuccessEmbed('🗑️ Réinitialisation XP', `Toutes les données XP de ce serveur ont été réinitialisées.`);
      return interaction.reply({ embeds: [emb] });
    } catch (e) {
      if (interaction.deferred || interaction.replied) return interaction.editReply({ embeds: [createErrorEmbed('Erreur', "Impossible de réinitialiser toutes les XP.")] });
      return interaction.reply({ embeds: [createErrorEmbed('Erreur', "Impossible de réinitialiser toutes les XP.")] });
    }
  },
};
