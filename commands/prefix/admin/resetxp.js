export default {
  name: 'resetxp',
  description: "Réinitialiser l'XP d'un membre (ADMIN)",
  category: 'admin',
  usage: '!resetxp @utilisateur',
  async execute(message, args) {
    try {
      const { PermissionsBitField, EmbedBuilder, Colors } = await import('discord.js');
      const { resetUserXP } = await import('../../../src/store/xpStore.js');
      const { createErrorEmbed, createSuccessEmbed } = await import('../../../src/utils/embeds.js');

      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply({ embeds: [createErrorEmbed('Permission', "Vous devez être administrateur.")] });
      }
      const user = message.mentions.users.first();
      if (!user) {
        return message.reply({ embeds: [createErrorEmbed('Utilisation', `Utilisation: ${this.usage}`)] });
      }
      resetUserXP(message.guild.id, user.id);
      const emb = createSuccessEmbed('🗑️ Réinitialisation XP', `L'XP de <@${user.id}> a été réinitialisée.`);
      await message.reply({ embeds: [emb] });
    } catch (e) {
      const { createErrorEmbed } = await import('../../../src/utils/embeds.js');
      return message.reply({ embeds: [createErrorEmbed('Erreur', "Impossible de réinitialiser l'XP.")] });
    }
  },
};



