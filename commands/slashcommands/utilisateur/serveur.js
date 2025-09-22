import { SlashCommandBuilder } from 'discord.js';

export default {
  category: 'utilisateur',
  data: new SlashCommandBuilder()
    .setName('serveur')
    .setDescription('Affiche des statistiques simples du serveur (nombre de membres, salons, rôles).'),
  async execute(interaction) {
    try {
      const g = interaction.guild;
      const channels = g.channels.cache.size;
      const roles = g.roles.cache.size;
      const lines = [
        `Nom: ${g.name}`,
        `Membres: ${g.memberCount}`,
        `Salons: ${channels}`,
        `Rôles: ${roles}`,
      ];
      return interaction.reply({ content: `Statistiques du serveur:\n${lines.join('\n')}`, flags: 64 // MessageFlags.Ephemeral });
    } catch (error) {
      console.error('[ERREUR] Slash /serveur:', error);
      if (interaction.deferred || interaction.replied) return interaction.editReply("Une erreur est survenue lors de la récupération des statistiques du serveur.");
      return interaction.reply({ content: "Une erreur est survenue lors de la récupération des statistiques du serveur.", flags: 64 // MessageFlags.Ephemeral });
    }
  },
};



