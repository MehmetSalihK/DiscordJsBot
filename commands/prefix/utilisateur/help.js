export default {
  name: 'help',
  description: 'Affiche la liste des commandes disponibles.',
  category: 'utilisateur',
  usage: '!help',
  async execute(message, args, client) {
    try {
      const { buildHelpInitial } = await import('../../../src/handlers/buttonHandlers.js');
      const init = buildHelpInitial(client, message.guild.id);
      await message.reply({ embeds: [init.embed], components: init.components });
    } catch (error) {
      console.error('[ERREUR] Commande prefix help:', error);
      await message.reply("Une erreur est survenue lors de l'affichage de l'aide.");
    }
  },
};
