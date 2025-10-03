import { SlashCommandBuilder } from 'discord.js';
import helpCommand from './help.js';

export default {
  category: 'utilisateur',
  data: new SlashCommandBuilder()
    .setName('aide')
    .setDescription('Affiche la liste des commandes disponibles avec pagination (alias de /help)'),
  async execute(interaction, client) {
    // Réutiliser la logique de la commande help
    return await helpCommand.execute(interaction, client);
  },
};