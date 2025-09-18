export default {
  name: 'invite',
  description: "Obtenir le lien d'invitation du bot.",
  category: 'utilisateur',
  usage: '!invite',
  async execute(message) {
    try {
      const { EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');
      const { config } = await import('../../../src/config.js');
      if (!config.clientId) {
        return message.reply({ content: "CLIENT_ID manquant dans la configuration." });
      }
      const permissions = 8; // Administrateur
      const url = `https://discord.com/api/oauth2/authorize?client_id=${encodeURIComponent(config.clientId)}&scope=bot%20applications.commands&permissions=${permissions}`;

      const embed = new EmbedBuilder()
        .setColor(Colors.Blurple)
        .setTitle('🔗 Inviter le bot')
        .setDescription('Cliquez sur le bouton ci-dessous pour inviter le bot sur votre serveur.')
        .setFooter({ text: `Requis: applications.commands + permissions administrateur` })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Inviter le bot')
          .setStyle(ButtonStyle.Link)
          .setEmoji('🤖')
          .setURL(url)
      );

      await message.reply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error('[ERREUR] Commande prefix invite:', error);
      const { createErrorEmbed } = await import('../../../src/utils/embeds.js');
      return message.reply({ embeds: [createErrorEmbed('Erreur', "Une erreur est survenue lors de la génération du lien d'invitation.")] });
    }
  },
};
