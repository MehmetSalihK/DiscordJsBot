import { SlashCommandBuilder } from 'discord.js';

export default {
  category: 'utilisateur',
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Affiche la liste des commandes disponibles.'),
  async execute(interaction, client) {
    try {
      const { buildHelpInitial } = await import('../../../src/handlers/buttonHandlers.js');
      const init = buildHelpInitial(client, interaction.guildId);
      await interaction.reply({ embeds: [init.embed], components: init.components, flags: 64 }); // MessageFlags.Ephemeral
    } catch (error) {
      console.error('[ERREUR] Slash /help:', error);
      if (interaction.deferred || interaction.replied) return interaction.editReply("Une erreur est survenue lors de l'affichage de l'aide.");
      return interaction.reply({ content: "Une erreur est survenue lors de l'affichage de l'aide.", flags: 64 }); // MessageFlags.Ephemeral
    }
  },
};




