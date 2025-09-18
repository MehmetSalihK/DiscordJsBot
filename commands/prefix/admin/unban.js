export default {
  name: 'unban',
  description: "Débannit un utilisateur via son identifiant.",
  category: 'admin',
  usage: '!unban <user_id> [raison]',
  async execute(message, args) {
    try {
      const { PermissionsBitField } = await import('discord.js');
      const { createSuccessEmbed, createErrorEmbed } = await import('../../../src/utils/embeds.js');
      const { sendGuildLog } = await import('../../../src/utils/logs.js');
      if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return message.reply({ embeds: [createErrorEmbed('Permission manquante', "Vous n'avez pas la permission de débannir des membres.")] });
      }
      if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return message.reply({ embeds: [createErrorEmbed('Permission manquante', "Je n'ai pas la permission de débannir des membres.")] });
      }
      const userId = args[0];
      if (!userId) return message.reply({ embeds: [createErrorEmbed('Utilisation', `Utilisation: ${this.usage}`)] });
      const reason = args.slice(1).join(' ') || 'Aucune raison fournie';

      const bans = await message.guild.bans.fetch().catch(() => null);
      if (!bans) return message.reply({ embeds: [createErrorEmbed('Erreur', 'Impossible de récupérer la liste des bannis.')] });
      const banEntry = bans.get(userId);
      if (!banEntry) return message.reply({ embeds: [createErrorEmbed('Introuvable', "Cet utilisateur n'est pas banni ou l'identifiant est invalide.")] });

      await message.guild.bans.remove(userId, reason);
      const emb = createSuccessEmbed('Débannissement', `L’utilisateur **${banEntry.user.tag}** a été débanni avec succès.\nRaison: ${reason}`);
      await message.reply({ embeds: [emb] });
      await sendGuildLog(message.client, message.guild.id, emb);
    } catch (error) {
      console.error('[ERREUR] Commande prefix unban:', error);
      const { createErrorEmbed } = await import('../../../src/utils/embeds.js');
      return message.reply({ embeds: [createErrorEmbed('Erreur', 'Une erreur est survenue lors de la tentative de débannissement.')] });
    }
  },
};
