import { SlashCommandBuilder, EmbedBuilder, Colors } from 'discord.js';
import { getGuildConfig } from '../../../src/store/configStore.js';
import { getUserData } from '../../../src/store/xpStore.js';
import { progressBar } from '../../../src/utils/xp.js';
import { createErrorEmbed } from '../../../src/utils/embeds.js';

function requiredForLevel(conf, level) {
  const lvls = conf?.xpSystem?.levels || {};
  if (lvls[String(level)]) return lvls[String(level)];
  // fallback: double from nearest lower or 500
  let lastLevel = 1;
  let lastReq = 500;
  const keys = Object.keys(lvls).map(Number).sort((a,b)=>a-b);
  for (const k of keys) {
    if (k <= level) { lastLevel = k; lastReq = lvls[String(k)]; }
  }
  const delta = Math.max(0, level - lastLevel);
  return lastReq * Math.pow(2, delta);
}

export default {
  category: 'utilisateur',
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription("Afficher votre niveau et XP sur ce serveur."),
  async execute(interaction) {
    try {
      const conf = getGuildConfig(interaction.guildId);
      const data = getUserData(interaction.guildId, interaction.user.id);
      const nextLevel = data.level + 1;
      const req = requiredForLevel(conf, Math.max(1, nextLevel));
      const bar = progressBar(data.xp, req);
      const emb = new EmbedBuilder()
        .setColor(Colors.Blurple)
        .setTitle(`📈 Rang de ${interaction.user.tag}`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
          { name: 'Niveau', value: `**${data.level}**`, inline: true },
          { name: 'XP', value: `**${data.xp}** / **${req}**`, inline: true },
          { name: 'Progression', value: bar, inline: false },
        )
        .setTimestamp();
      return interaction.reply({ embeds: [emb] });
    } catch (e) {
      if (interaction.deferred || interaction.replied) return interaction.editReply({ embeds: [createErrorEmbed('Erreur', 'Impossible d\'afficher le rang.')] });
      return interaction.reply({ embeds: [createErrorEmbed('Erreur', 'Impossible d\'afficher le rang.')], flags: 64 // MessageFlags.Ephemeral });
    }
  }
};



