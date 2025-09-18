export default {
  name: 'serverinfo',
  description: 'Affiche les informations détaillées du serveur.',
  category: 'admin',
  usage: '!serverinfo',
  async execute(message) {
    try {
      const { buildServerInfoInitial } = await import('../../../src/handlers/buttonHandlers.js');
      const init = await buildServerInfoInitial(message.guild);
      return message.reply({ embeds: [init.embed], components: init.components });
    } catch (error) {
      console.error('[ERREUR] Commande prefix serverinfo:', error);
      const { createErrorEmbed } = await import('../../../src/utils/embeds.js');
      return message.reply({ embeds: [createErrorEmbed('Erreur', "Une erreur est survenue lors de la récupération des informations du serveur.")] });
    }
  },
};
