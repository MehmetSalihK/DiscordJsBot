export default {
  name: 'xpconfig',
  description: 'Configurer le système XP (panneau, setlog, enablelogs, disablelogs, enable, disable)',
  category: 'admin',
  usage: '!xpconfig [panel|setlog #salon|enablelogs|disablelogs|enable|disable]',
  async execute(message, args) {
    try {
      const { PermissionsBitField, ChannelType, Colors, EmbedBuilder } = await import('discord.js');
      const { buildXPConfigInitial } = await import('../../../src/handlers/buttonHandlers.js');
      const { createErrorEmbed, createInfoEmbed, createSuccessEmbed } = await import('../../../src/utils/embeds.js');
      const { getGuildConfig, setGuildConfig } = await import('../../../src/store/configStore.js');

      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply({ embeds: [createErrorEmbed('Permission', "Vous devez être administrateur.")] });
      }

      const sub = (args?.[0] || 'panel').toLowerCase();
      if (sub === 'panel') {
        const init = buildXPConfigInitial(message.guild);
        return message.reply({ embeds: [init.embed], components: init.components });
      }

      const conf = getGuildConfig(message.guild.id);
      const x = conf.xpSystem || {};

      if (sub === 'setlog') {
        const channel = message.mentions.channels.first();
        if (!channel || channel.type !== ChannelType.GuildText) {
          return message.reply({ embeds: [createErrorEmbed('Salon invalide', 'Veuillez mentionner un salon texte du serveur.')] });
        }
        x.xpLogs = { ...(x.xpLogs || {}), logChannelId: channel.id };
        setGuildConfig(message.guild.id, { xpSystem: x });
        const emb = new EmbedBuilder()
          .setColor(Colors.Blurple)
          .setTitle('⚙️ Configuration mise à jour')
          .setDescription(`📑 Type: Logs d'XP\n📌 Nouveau salon: <#${channel.id}>\n📅 Date: ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}`)
          .setFooter({ text: "Utilise !xpconfig enablelogs ou !xpconfig disablelogs pour activer/désactiver." });
        return message.reply({ embeds: [emb] });
      }

      if (sub === 'enablelogs' || sub === 'enlogs') {
        if (!x.xpLogs?.logChannelId) {
          return message.reply({ embeds: [createErrorEmbed('Aucun salon configuré', "Veuillez d'abord définir un salon avec `!xpconfig setlog #salon`. ")] });
        }
        x.xpLogs = { ...(x.xpLogs || {}), active: true };
        setGuildConfig(message.guild.id, { xpSystem: x });
        return message.reply({ embeds: [createInfoEmbed('✅ Logs XP activés', "Les logs d'XP sont maintenant activés.")] });
      }

      if (sub === 'disablelogs' || sub === 'delogs') {
        x.xpLogs = { ...(x.xpLogs || {}), active: false };
        setGuildConfig(message.guild.id, { xpSystem: x });
        return message.reply({ embeds: [createInfoEmbed('⛔ Logs XP désactivés', "Les logs d'XP sont maintenant désactivés.")] });
      }

      if (sub === 'enable' || sub === 'on') {
        x.active = true;
        setGuildConfig(message.guild.id, { xpSystem: x });
        return message.reply({ embeds: [createSuccessEmbed('✅ Système XP activé', "Le système d'XP est maintenant activé.")] });
      }

      if (sub === 'disable' || sub === 'off') {
        x.active = false;
        setGuildConfig(message.guild.id, { xpSystem: x });
        return message.reply({ embeds: [createInfoEmbed('⛔ Système XP désactivé', "Le système d'XP est maintenant désactivé.")] });
      }

      return message.reply({ embeds: [createErrorEmbed('Utilisation', `Usage: ${this.usage}`)] });
    } catch (e) {
      const { createErrorEmbed } = await import('../../../src/utils/embeds.js');
      return message.reply({ embeds: [createErrorEmbed('Erreur', "Impossible d'exécuter la commande !xpconfig.")] });
    }
  },
};



