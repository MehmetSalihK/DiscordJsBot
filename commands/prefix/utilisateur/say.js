export default {
  name: 'say',
  description: 'Le bot répète votre message.',
  category: 'utilisateur',
  usage: '!say <message>',
  async execute(message, args) {
    try {
      const text = args.join(' ');
      if (!text) return message.reply({ content: `Utilisation: ${this.usage}` });
      const { EmbedBuilder, Colors } = await import('discord.js');
      // Éviter les mentions massives
      const safe = text.replace(/@everyone/g, '@\u200Beveryone').replace(/@here/g, '@\u200Bhere');
      const embed = new EmbedBuilder()
        .setColor(Colors.Blurple)
        .setTitle('🗣️ Message')
        .setDescription(safe)
        .setFooter({ text: `Par ${message.author.tag}` })
        .setTimestamp();
      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('[ERREUR] Commande prefix say:', error);
      return message.reply("Une erreur est survenue lors de l'envoi du message.");
    }
  },
};



