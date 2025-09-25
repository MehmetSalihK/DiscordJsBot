import { PermissionsBitField, ChannelType, Colors, EmbedBuilder } from 'discord.js';
import { buildLogsInitial } from '../../../src/handlers/buttonHandlers.js';

export default {
  name: 'logs',
  description: 'Configurer les logs normaux (panneau, set, enable, disable).',
  category: 'admin',
  usage: '!logs [panel|set #salon|enable|disable]',
  async execute(message, args) {
    try {
      const { createErrorEmbed, createInfoEmbed } = await import('../../../src/utils/embeds.js');
      const { getGuildConfig, setGuildConfig } = await import('../../../src/store/configStore.js');
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return message.reply({ embeds: [createErrorEmbed('Permission insuffisante', "Vous n'avez pas la permission de gérer la configuration du serveur.")] });
      }

      const sub = (args?.[0] || 'panel').toLowerCase();
      if (sub === 'panel') {
        const init = buildLogsInitial(message.guild);
        return message.reply({ embeds: [init.embed], components: init.components });
      }

      const conf = getGuildConfig(message.guild.id);
      const logs = conf.logs || { active: true, logChannelId: null };

      if (sub === 'set') {
        const channel = message.mentions.channels.first();
        if (!channel || channel.type !== ChannelType.GuildText) {
          return message.reply({ embeds: [createErrorEmbed('Salon invalide', 'Veuillez mentionner un salon texte du serveur.')] });
        }
        const updated = { ...logs, logChannelId: channel.id };
        setGuildConfig(message.guild.id, { logs: updated });
        const emb = new EmbedBuilder()
          .setColor(Colors.Blurple)
          .setTitle('⚙️ Configuration mise à jour')
          .setDescription(`📑 Type: Logs normaux\n📌 Nouveau salon: <#${channel.id}>\n📅 Date: ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}`)
          .setFooter({ text: 'Utilise !logs enable ou !logs disable pour activer/désactiver.' });
        return message.reply({ embeds: [emb] });
      }

      if (sub === 'enable' || sub === 'on') {
        if (!logs.logChannelId) {
          return message.reply({ embeds: [createErrorEmbed('Aucun salon configuré', 'Veuillez d\'abord définir un salon avec `!logs set #salon`.')] });
        }
        setGuildConfig(message.guild.id, { logs: { ...logs, active: true } });
        return message.reply({ embeds: [createInfoEmbed('✅ Logs activés', 'Les logs normaux sont maintenant activés.')] });
      }

      if (sub === 'disable' || sub === 'off') {
        setGuildConfig(message.guild.id, { logs: { ...logs, active: false } });
        return message.reply({ embeds: [createInfoEmbed('⛔ Logs désactivés', 'Les logs normaux sont maintenant désactivés.')] });
      }

      return message.reply({ embeds: [createErrorEmbed('Utilisation', `Usage: ${this.usage}`)] });
    } catch (error) {
      // console.error('[ERREUR] Commande prefix logs:', error);
      const { createErrorEmbed } = await import('../../../src/utils/embeds.js');
      await message.reply({ embeds: [createErrorEmbed('Erreur', "Une erreur est survenue lors de l'exécution de !logs.")] });
    }
  },
};



