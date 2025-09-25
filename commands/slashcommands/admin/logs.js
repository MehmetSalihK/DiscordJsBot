import { SlashCommandBuilder, PermissionsBitField, ChannelType, Colors, EmbedBuilder } from 'discord.js';
import { buildLogsInitial } from '../../../src/handlers/buttonHandlers.js';
import { getGuildConfig, setGuildConfig } from '../../../src/store/configStore.js';
import { createErrorEmbed, createInfoEmbed, createSuccessEmbed } from '../../../src/utils/embeds.js';

export default {
  category: 'admin',
  data: new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Configurer les logs normaux (canal + activation).')
    .addSubcommand(sc => sc
      .setName('panel')
      .setDescription('Ouvrir le panneau de configuration des logs'))
    .addSubcommand(sc => sc
      .setName('set')
      .setDescription('Définir le salon des logs')
      .addChannelOption(opt => opt
        .setName('salon')
        .setDescription('Salon texte pour les logs')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)))
    .addSubcommand(sc => sc
      .setName('enable')
      .setDescription('Activer les logs'))
    .addSubcommand(sc => sc
      .setName('disable')
      .setDescription('Désactiver les logs'))
    .addSubcommand(sc => sc
      .setName('on')
      .setDescription('Alias: activer les logs'))
    .addSubcommand(sc => sc
      .setName('off')
      .setDescription('Alias: désactiver les logs')),
  async execute(interaction) {
    try {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)) {
        return interaction.reply({ embeds: [createErrorEmbed('Permission insuffisante', "Vous n'avez pas la permission de gérer la configuration du serveur.")], flags: 64 }); // MessageFlags.Ephemeral
      }
      const sub = interaction.options.getSubcommand(false) || 'panel';
      if (sub === 'panel') {
        const init = buildLogsInitial(interaction.guild);
        return interaction.reply({ embeds: [init.embed], components: init.components });
      }

      const conf = getGuildConfig(interaction.guildId);
      const logs = conf.logs || { active: true, logChannelId: null };

      if (sub === 'set') {
        const ch = interaction.options.getChannel('salon', true);
        if (!ch || ch.type !== ChannelType.GuildText) {
          return interaction.reply({ embeds: [createErrorEmbed('Salon invalide', 'Veuillez choisir un salon texte du serveur.')], flags: 64 }); // MessageFlags.Ephemeral
        }
        const updated = { ...logs, logChannelId: ch.id };
        setGuildConfig(interaction.guildId, { logs: updated });
        const emb = new EmbedBuilder()
          .setColor(Colors.Blurple)
          .setTitle('⚙️ Configuration mise à jour')
          .setDescription(`📑 Type: Logs normaux\n📌 Nouveau salon: <#${ch.id}>\n📅 Date: ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}`)
          .setFooter({ text: 'Utilise /logs enable ou /logs disable pour activer/désactiver.' });
        return interaction.reply({ embeds: [emb] });
      }

      if (sub === 'enable' || sub === 'on') {
        if (!logs.logChannelId) {
          return interaction.reply({ embeds: [createErrorEmbed('Aucun salon configuré', 'Veuillez d\'abord définir un salon avec `/logs set #salon`.')], flags: 64 }); // MessageFlags.Ephemeral
        }
        setGuildConfig(interaction.guildId, { logs: { ...logs, active: true } });
        return interaction.reply({ embeds: [createInfoEmbed('✅ Logs activés', 'Les logs normaux sont maintenant activés.')] });
      }

      if (sub === 'disable' || sub === 'off') {
        setGuildConfig(interaction.guildId, { logs: { ...logs, active: false } });
        return interaction.reply({ embeds: [createInfoEmbed('⛔ Logs désactivés', 'Les logs normaux sont maintenant désactivés.')] });
      }
    } catch (error) {
      // console.error('[ERREUR] Slash /logs:', error);
      if (interaction.deferred || interaction.replied) return interaction.editReply({ embeds: [createErrorEmbed('Erreur', "Une erreur est survenue lors de l'exécution de /logs.")] });
      return interaction.reply({ embeds: [createErrorEmbed('Erreur', "Une erreur est survenue lors de l'exécution de /logs.")], flags: 64 }); // MessageFlags.Ephemeral
    }
  },
};




