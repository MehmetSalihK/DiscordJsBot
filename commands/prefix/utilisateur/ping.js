export default {
  name: 'ping',
  description: 'Vérifie la latence du bot',
  category: 'utilisateur',
  async execute(message, args, client) {
    const { EmbedBuilder, Colors } = await import('discord.js');
    const sent = await message.reply('🏓 Calcul de la latence...');
    const latency = sent.createdTimestamp - message.createdTimestamp;
    const embed = new EmbedBuilder()
      .setColor(Colors.Blurple)
      .setTitle('🏓 Ping')
      .setDescription(`Latence du message: **${latency}ms**\nLatence API: **${Math.round(client.ws.ping)}ms**`)
      .setTimestamp();
    await sent.edit({ content: '', embeds: [embed] });
  },
};
