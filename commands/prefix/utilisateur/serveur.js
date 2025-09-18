export default {
  name: 'serveur',
  description: 'Affiche des statistiques simples du serveur (nombre de membres, salons, rôles).',
  category: 'utilisateur',
  usage: '!serveur',
  async execute(message) {
    try {
      const { EmbedBuilder, Colors } = await import('discord.js');
      const g = message.guild;
      const channels = g.channels.cache.size;
      const roles = g.roles.cache.size;
      const embed = new EmbedBuilder()
        .setColor(Colors.Blurple)
        .setTitle('🏠 Statistiques du serveur')
        .setThumbnail(g.iconURL({ size: 256 }))
        .addFields(
          { name: '🪪 Nom', value: g.name, inline: true },
          { name: '👥 Membres', value: String(g.memberCount), inline: true },
          { name: '💬 Salons', value: String(channels), inline: true },
          { name: '📜 Rôles', value: String(roles), inline: true },
        )
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('[ERREUR] Commande prefix serveur:', error);
      const { createErrorEmbed } = await import('../../../src/utils/embeds.js');
      return message.reply({ embeds: [createErrorEmbed('Erreur', 'Une erreur est survenue lors de la récupération des statistiques du serveur.')] });
    }
  },
};
