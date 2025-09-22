export default {
  name: 'rank',
  description: "Afficher votre niveau et XP sur ce serveur.",
  category: 'utilisateur',
  usage: '!rank',
  async execute(message) {
    try {
      const { EmbedBuilder, Colors } = await import('discord.js');
      const { getGuildConfig } = await import('../../../src/store/configStore.js');
      const { getUserData } = await import('../../../src/store/xpStore.js');
      const { progressBar } = await import('../../../src/utils/xp.js');

      const conf = getGuildConfig(message.guild.id);
      const data = getUserData(message.guild.id, message.author.id);
      const nextLevel = data.level + 1;
      const lvls = conf?.xpSystem?.levels || {};
      const req = lvls[String(Math.max(1, nextLevel))] ?? 500 * Math.pow(2, Math.max(0, nextLevel - 1));
      const bar = progressBar(data.xp, req);

      const emb = new EmbedBuilder()
        .setColor(Colors.Blurple)
        .setTitle(`📈 Rang de ${message.author.tag}`)
        .setThumbnail(message.author.displayAvatarURL())
        .addFields(
          { name: 'Niveau', value: `**${data.level}**`, inline: true },
          { name: 'XP', value: `**${data.xp}** / **${req}**`, inline: true },
          { name: 'Progression', value: bar, inline: false },
        )
        .setTimestamp();
      await message.reply({ embeds: [emb] });
    } catch (e) {
      const { createErrorEmbed } = await import('../../../src/utils/embeds.js');
      return message.reply({ embeds: [createErrorEmbed('Erreur', "Impossible d'afficher le rang.")] });
    }
  },
};



