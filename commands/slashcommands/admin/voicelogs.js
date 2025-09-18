import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, Colors } from 'discord.js';
import { buildVoiceLogsInitial } from '../../../src/handlers/buttonHandlers.js';
import { createErrorEmbed, createSuccessEmbed, createInfoEmbed } from '../../../src/utils/embeds.js';
import { getGuildConfig, setGuildConfig } from '../../../src/store/configStore.js';

export default {
  category: 'admin',
  data: new SlashCommandBuilder()
    .setName('voicelogs')
    .setDescription('Configurer les logs vocaux (canal + activation).')
    .addSubcommand(sc => sc
      .setName('panel')
      .setDescription('Ouvrir le panneau de configuration des logs vocaux'))
    .addSubcommand(sc => sc
      .setName('set')
      .setDescription('Définir le salon des logs vocaux')
      .addChannelOption(opt => opt
        .setName('salon')
        .setDescription('Salon texte pour les logs vocaux')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)))
    .addSubcommand(sc => sc
      .setName('toggle')
      .setDescription('Activer/Désactiver les logs vocaux'))
    .addSubcommand(sc => sc
      .setName('on')
      .setDescription('Alias: activer les logs vocaux'))
    .addSubcommand(sc => sc
      .setName('off')
      .setDescription('Alias: désactiver les logs vocaux'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    try {
      const sub = interaction.options.getSubcommand();
      if (sub === 'panel') {
        const init = buildVoiceLogsInitial(interaction.guild);
        return interaction.reply({ embeds: [init.embed], components: init.components });
      }

      const conf = getGuildConfig(interaction.guildId);
      const x = conf.xpSystem || {};
      if (sub === 'set') {
        const ch = interaction.options.getChannel('salon', true);
        if (!ch || ch.type !== ChannelType.GuildText) {
          return interaction.reply({ embeds: [createErrorEmbed('Salon invalide', 'Veuillez choisir un salon texte du serveur.')], ephemeral: true });
        }
        x.voiceLogs = { ...(x.voiceLogs || {}), logChannelId: ch.id };
        setGuildConfig(interaction.guildId, { xpSystem: x });
        const emb = createSuccessEmbed('🎙️ Logs vocaux', `Le salon des logs vocaux est maintenant défini sur <#${ch.id}>.`);
        return interaction.reply({ embeds: [emb] });
      }

      if (sub === 'toggle' || sub === 'on' || sub === 'off') {
        const current = x.voiceLogs?.active !== false;
        const wantActive = (sub === 'toggle') ? !current : (sub === 'on');
        if (wantActive && !x.voiceLogs?.logChannelId) {
          return interaction.reply({ embeds: [createErrorEmbed('Aucun salon configuré', 'Veuillez d\'abord définir un salon pour les logs vocaux avec `/voicelogs set #salon`.')], ephemeral: true });
        }
        x.voiceLogs = { ...(x.voiceLogs || {}), active: wantActive };
        setGuildConfig(interaction.guildId, { xpSystem: x });
        const emb = createInfoEmbed('📡 Logs vocaux', `Les logs vocaux sont maintenant ${wantActive ? 'activés ✅' : 'désactivés ❌'}.`);
        return interaction.reply({ embeds: [emb] });
      }
    } catch (e) {
      if (interaction.deferred || interaction.replied) return interaction.editReply({ embeds: [createErrorEmbed('Erreur', "Impossible d'exécuter la commande voicelogs.")] });
      return interaction.reply({ embeds: [createErrorEmbed('Erreur', "Impossible d'exécuter la commande voicelogs.")] });
    }
  },
};
