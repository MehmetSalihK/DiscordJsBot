import { SlashCommandBuilder } from 'discord.js';

export default {
  category: 'utilisateur',
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Le bot répète votre message.')
    .addStringOption(opt => opt.setName('message').setDescription('Texte à répéter').setRequired(true)),
  async execute(interaction) {
    try {
      const text = interaction.options.getString('message', true);
      const safe = text.replace(/@everyone/g, '@\u200Beveryone').replace(/@here/g, '@\u200Bhere');
      await interaction.reply(safe);
    } catch (error) {
      console.error('[ERREUR] Slash /say:', error);
      if (interaction.deferred || interaction.replied) return interaction.editReply("Une erreur est survenue lors de l\'envoi du message.");
      return interaction.reply({ content: "Une erreur est survenue lors de l'envoi du message.", ephemeral: true });
    }
  },
};
