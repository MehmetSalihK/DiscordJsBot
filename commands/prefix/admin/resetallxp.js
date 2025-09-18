export default {
  name: 'resetallxp',
  description: "Réinitialiser l'XP de tous les membres du serveur (ADMIN)",
  category: 'admin',
  usage: '!resetallxp',
  async execute(message) {
    try {
      const { PermissionsBitField } = await import('discord.js');
      const { resetAllXP } = await import('../../../src/store/xpStore.js');
      const { createErrorEmbed, createSuccessEmbed } = await import('../../../src/utils/embeds.js');

      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply({ embeds: [createErrorEmbed('Permission', "Vous devez être administrateur.")] });
      }
      resetAllXP(message.guild.id);
      const emb = createSuccessEmbed('🗑️ Réinitialisation XP', `Toutes les données XP de ce serveur ont été réinitialisées.`);
      await message.reply({ embeds: [emb] });
    } catch (e) {
      const { createErrorEmbed } = await import('../../../src/utils/embeds.js');
      return message.reply({ embeds: [createErrorEmbed('Erreur', "Impossible de réinitialiser toutes les XP.")] });
    }
  },
};
