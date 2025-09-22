export default {
  name: 'avatar',
  description: "Affiche l'avatar de l'utilisateur spécifié (ou le vôtre).",
  category: 'utilisateur',
  usage: '!avatar [@utilisateur]',
  async execute(message) {
    try {
      const { EmbedBuilder, Colors } = await import('discord.js');
      const user = message.mentions.users.first() || message.author;
      const url = user.displayAvatarURL({ extension: 'png', size: 1024, forceStatic: false });
      const embed = new EmbedBuilder()
        .setColor(Colors.Blurple)
        .setTitle(`🖼️ Avatar de ${user.tag}`)
        .setImage(url)
        .setFooter({ text: `ID: ${user.id}` })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('[ERREUR] Commande prefix avatar:', error);
      const { createErrorEmbed } = await import('../../../src/utils/embeds.js');
      return message.reply({ embeds: [createErrorEmbed('Erreur', "Une erreur est survenue lors de la récupération de l'avatar.")] });
    }
  },
};



