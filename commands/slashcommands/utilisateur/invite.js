import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder } from 'discord.js';
import { createErrorEmbed } from '../../../src/utils/embeds.js';
import { config } from '../../../src/config.js';

export default {
  category: 'utilisateur',
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription("Obtenir le lien d'invitation du bot."),
  async execute(interaction) {
    try {
      if (!config.clientId) {
        return interaction.reply({ embeds: [createErrorEmbed('Configuration', 'CLIENT_ID manquant dans la configuration.')], flags: 64 // MessageFlags.Ephemeral });
      }
      const permissions = 8; // Administrateur
      const url = `https://discord.com/api/oauth2/authorize?client_id=${encodeURIComponent(config.clientId)}&scope=bot%20applications.commands&permissions=${permissions}`;

      const embed = new EmbedBuilder()
        .setColor(Colors.Blurple)
        .setTitle('🔗 Inviter le bot')
        .setDescription('Cliquez sur le bouton ci-dessous pour inviter le bot sur votre serveur.')
        .setFooter({ text: 'Requis: applications.commands + permissions administrateur' })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Inviter le bot')
          .setStyle(ButtonStyle.Link)
          .setEmoji('🤖')
          .setURL(url)
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error('[ERREUR] Slash /invite:', error);
      if (interaction.deferred || interaction.replied) return interaction.editReply({ embeds: [createErrorEmbed('Erreur', "Une erreur est survenue lors de la génération du lien d'invitation.")] });
      return interaction.reply({ embeds: [createErrorEmbed('Erreur', "Une erreur est survenue lors de la génération du lien d'invitation.")], flags: 64 // MessageFlags.Ephemeral });
    }
  },
};



