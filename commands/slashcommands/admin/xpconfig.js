import { SlashCommandBuilder, ChannelType, Colors, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { buildXPConfigInitial } from '../../../src/handlers/buttonHandlers.js';
import { createErrorEmbed, createInfoEmbed, createSuccessEmbed } from '../../../src/utils/embeds.js';
import { getGuildConfig, setGuildConfig } from '../../../src/store/configStore.js';

export default {
  category: 'admin',
  data: new SlashCommandBuilder()
    .setName('xpconfig')
    .setDescription('Configurer le système XP (boutons et sous-commandes).')
    .addSubcommand(sc => sc
      .setName('panel')
      .setDescription('Ouvrir le panneau de configuration XP'))
    .addSubcommand(sc => sc
      .setName('setlog')
      .setDescription('Définir le salon des logs XP (level up)')
      .addChannelOption(opt => opt
        .setName('salon')
        .setDescription('Salon texte pour les logs XP')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)))
    .addSubcommand(sc => sc
      .setName('enablelogs')
      .setDescription('Activer les logs XP'))
    .addSubcommand(sc => sc
      .setName('disablelogs')
      .setDescription('Désactiver les logs XP'))
    .addSubcommand(sc => sc
      .setName('enable')
      .setDescription('Activer le système XP'))
    .addSubcommand(sc => sc
      .setName('disable')
      .setDescription('Désactiver le système XP'))
    .addSubcommand(sc => sc
      .setName('on')
      .setDescription('Alias: activer le système XP'))
    .addSubcommand(sc => sc
      .setName('off')
      .setDescription('Alias: désactiver le système XP'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    try {
      const sub = interaction.options.getSubcommand(false) || 'panel';
      if (sub === 'panel') {
        const init = buildXPConfigInitial(interaction.guild);
        return interaction.reply({ embeds: [init.embed], components: init.components });
      }

      const conf = getGuildConfig(interaction.guildId);
      const x = conf.xpSystem || {};

      if (sub === 'setlog') {
        const ch = interaction.options.getChannel('salon', true);
        if (!ch || ch.type !== ChannelType.GuildText) {
          return interaction.reply({ embeds: [createErrorEmbed('Salon invalide', 'Veuillez choisir un salon texte du serveur.')], flags: 64 // MessageFlags.Ephemeral });
        }
        x.xpLogs = { ...(x.xpLogs || {}), logChannelId: ch.id };
        setGuildConfig(interaction.guildId, { xpSystem: x });
        const emb = new EmbedBuilder()
          .setColor(Colors.Blurple)
          .setTitle('⚙️ Configuration mise à jour')
          .setDescription(`📑 Type: Logs d'XP\n📌 Nouveau salon: <#${ch.id}>\n📅 Date: ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}`)
          .setFooter({ text: 'Utilise /xpconfig enablelogs ou /xpconfig disablelogs pour activer/désactiver.' });
        return interaction.reply({ embeds: [emb] });
      }

      if (sub === 'enablelogs') {
        if (!x.xpLogs?.logChannelId) {
          return interaction.reply({ embeds: [createErrorEmbed('Aucun salon configuré', 'Veuillez d\'abord définir un salon avec `/xpconfig setlog #salon`.')], flags: 64 // MessageFlags.Ephemeral });
        }
        x.xpLogs = { ...(x.xpLogs || {}), active: true };
        setGuildConfig(interaction.guildId, { xpSystem: x });
        return interaction.reply({ embeds: [createInfoEmbed('✅ Logs XP activés', 'Les logs d\'XP sont maintenant activés.')] });
      }

      if (sub === 'disablelogs') {
        x.xpLogs = { ...(x.xpLogs || {}), active: false };
        setGuildConfig(interaction.guildId, { xpSystem: x });
        return interaction.reply({ embeds: [createInfoEmbed('⛔ Logs XP désactivés', 'Les logs d\'XP sont maintenant désactivés.')] });
      }

      if (sub === 'enable' || sub === 'on') {
        x.active = true;
        setGuildConfig(interaction.guildId, { xpSystem: x });
        return interaction.reply({ embeds: [createSuccessEmbed('✅ Système XP activé', 'Le système d\'XP est maintenant activé.')] });
      }

      if (sub === 'disable' || sub === 'off') {
        x.active = false;
        setGuildConfig(interaction.guildId, { xpSystem: x });
        return interaction.reply({ embeds: [createInfoEmbed('⛔ Système XP désactivé', 'Le système d\'XP est maintenant désactivé.')] });
      }
    } catch (e) {
      if (interaction.deferred || interaction.replied) return interaction.editReply({ embeds: [createErrorEmbed('Erreur', "Impossible d'exécuter la commande xpconfig.")] });
      return interaction.reply({ embeds: [createErrorEmbed('Erreur', "Impossible d'exécuter la commande xpconfig.")], flags: 64 // MessageFlags.Ephemeral });
    }
  }
};



