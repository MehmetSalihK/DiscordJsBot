import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { resetUserXP } from '../../../src/store/xpStore.js';
import { createErrorEmbed, createSuccessEmbed } from '../../../src/utils/embeds.js';

export default {
  category: 'admin',
  data: new SlashCommandBuilder()
    .setName('resetxp')
    .setDescription("Réinitialiser l'XP d'un membre")
    .addUserOption(o => o.setName('membre').setDescription('Membre à réinitialiser').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    try {
      const user = interaction.options.getUser('membre', true);
      resetUserXP(interaction.guildId, user.id);
      const emb = createSuccessEmbed('🗑️ Réinitialisation XP', `L'XP de <@${user.id}> a été réinitialisée.`);
      return interaction.reply({ embeds: [emb] });
    } catch (e) {
      if (interaction.deferred || interaction.replied) return interaction.editReply({ embeds: [createErrorEmbed('Erreur', "Impossible de réinitialiser l'XP.")] });
      return interaction.reply({ embeds: [createErrorEmbed('Erreur', "Impossible de réinitialiser l'XP.")] });
    }
  },
};
