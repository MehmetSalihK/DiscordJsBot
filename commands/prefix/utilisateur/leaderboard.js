export default {
  name: 'leaderboard',
  description: 'Afficher le classement XP du serveur (top 10 par page).',
  category: 'utilisateur',
  usage: '!leaderboard [page]'
  ,async execute(message, args) {
    try {
      const { EmbedBuilder, Colors } = await import('discord.js');
      const { getLeaderboard } = await import('../../../src/store/xpStore.js');
      const page = Math.max(1, parseInt(args[0] || '1', 10) || 1);
      const perPage = 10;
      const all = getLeaderboard(message.guild.id);
      const totalPages = Math.max(1, Math.ceil(all.length / perPage));
      const idx = Math.min(page, totalPages) - 1;
      const start = idx * perPage;
      const items = all.slice(start, start + perPage);
      const desc = items.length
        ? items.map((u, i) => `**#${start + i + 1}** — <@${u.id}> • Niveau **${u.level}** • **${u.xp} XP**`).join('\n')
        : 'Aucun joueur classé pour le moment.';

      const emb = new EmbedBuilder()
        .setColor(Colors.Blurple)
        .setTitle('🏆 Classement XP')
        .setDescription(desc)
        .setFooter({ text: `Page ${idx + 1}/${totalPages}` })
        .setTimestamp();
      await message.reply({ embeds: [emb] });
    } catch (e) {
      const { createErrorEmbed } = await import('../../../src/utils/embeds.js');
      return message.reply({ embeds: [createErrorEmbed('Erreur', "Impossible d'afficher le classement.")] });
    }
  },
};
