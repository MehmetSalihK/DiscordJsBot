import { SlashCommandBuilder, EmbedBuilder, Colors } from 'discord.js';
import { getLeaderboard } from '../../../src/store/xpStore.js';
import { createErrorEmbed } from '../../../src/utils/embeds.js';

export default {
  category: 'utilisateur',
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Afficher le classement XP du serveur (top 10 par page).')
    .addIntegerOption(o => o.setName('page').setDescription('Numéro de page (1 = top 1-10)').setMinValue(1)),
  async execute(interaction) {
    try {
      const page = (interaction.options.getInteger('page') || 1);
      const perPage = 10;
      const all = getLeaderboard(interaction.guildId);
      const totalPages = Math.max(1, Math.ceil(all.length / perPage));
      const idx = Math.min(Math.max(1, page), totalPages) - 1;
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
      return interaction.reply({ embeds: [emb] });
    } catch (e) {
      if (interaction.deferred || interaction.replied) return interaction.editReply({ embeds: [createErrorEmbed('Erreur', 'Impossible d\'afficher le classement.')] });
      return interaction.reply({ embeds: [createErrorEmbed('Erreur', 'Impossible d\'afficher le classement.')], ephemeral: true });
    }
  }
};
