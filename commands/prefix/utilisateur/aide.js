import helpCommand from './help.js';

export default {
  name: 'aide',
  description: 'Affiche la liste des commandes disponibles avec pagination (alias de !help)',
  category: 'utilisateur',
  usage: 'aide',
  async execute(message, args, client) {
    // Réutiliser la logique de la commande help
    return await helpCommand.execute(message, args, client);
  },
};