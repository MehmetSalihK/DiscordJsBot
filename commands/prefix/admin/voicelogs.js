export default {
  name: 'voicelogs',
  description: 'Configurer les logs vocaux (panneau, set, enable, disable).',
  category: 'admin',
  usage: '!voicelogs [panel|set #salon|enable|disable]',
  async execute(message, args) {
    try {
      const { PermissionsBitField, ChannelType, Colors, EmbedBuilder } = await import('discord.js');
      const { buildVoiceLogsInitial } = await import('../../../src/handlers/buttonHandlers.js');
      const { createErrorEmbed, createInfoEmbed } = await import('../../../src/utils/embeds.js');
      const { getGuildConfig, setGuildConfig } = await import('../../../src/store/configStore.js');

      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply({ embeds: [createErrorEmbed('Permission insuffisante', "Vous devez être administrateur.")] });
      }

      const sub = (args?.[0] || 'panel').toLowerCase();
      if (sub === 'panel') {
        const init = buildVoiceLogsInitial(message.guild);
        return message.reply({ embeds: [init.embed], components: init.components });
      }

      const conf = getGuildConfig(message.guild.id);
      const x = conf.xpSystem || {};

      if (sub === 'set') {
        const channel = message.mentions.channels.first();
        if (!channel || channel.type !== ChannelType.GuildText) {
          return message.reply({ embeds: [createErrorEmbed('Salon invalide', 'Veuillez mentionner un salon texte du serveur.')] });
        }
        x.voiceLogs = { ...(x.voiceLogs || {}), logChannelId: channel.id };
        setGuildConfig(message.guild.id, { xpSystem: x });
        const emb = new EmbedBuilder()
          .setColor(Colors.Blurple)
          .setTitle('⚙️ Configuration mise à jour')
          .setDescription(`📑 Type: Logs vocaux\n📌 Nouveau salon: <#${channel.id}>\n📅 Date: ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}`)
          .setFooter({ text: 'Utilise !voicelogs enable ou !voicelogs disable pour activer/désactiver.' });
        return message.reply({ embeds: [emb] });
      }

      if (sub === 'enable' || sub === 'on') {
        if (!x.voiceLogs?.logChannelId) {
          return message.reply({ embeds: [createErrorEmbed('Aucun salon configuré', 'Veuillez d\'abord définir un salon avec `!voicelogs set #salon`.')] });
        }
        x.voiceLogs = { ...(x.voiceLogs || {}), active: true };
        setGuildConfig(message.guild.id, { xpSystem: x });
        return message.reply({ embeds: [createInfoEmbed('✅ Logs vocaux activés', 'Les logs vocaux sont maintenant activés.')] });
      }

      if (sub === 'disable' || sub === 'off') {
        x.voiceLogs = { ...(x.voiceLogs || {}), active: false };
        setGuildConfig(message.guild.id, { xpSystem: x });
        return message.reply({ embeds: [createInfoEmbed('⛔ Logs vocaux désactivés', 'Les logs vocaux sont maintenant désactivés.')] });
      }

      return message.reply({ embeds: [createErrorEmbed('Utilisation', `Usage: ${this.usage}`)] });
    } catch (e) {
      const { createErrorEmbed } = await import('../../../src/utils/embeds.js');
      return message.reply({ embeds: [createErrorEmbed('Erreur', "Impossible d'exécuter la commande !voicelogs.")] });
    }
  },
};



