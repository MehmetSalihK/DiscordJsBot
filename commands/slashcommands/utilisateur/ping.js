import { SlashCommandBuilder } from 'discord.js';

export default {
  category: 'utilisateur',
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Vérifie la latence du bot'),
  async execute(interaction, client) {
    const { EmbedBuilder, Colors } = await import('discord.js');
    const sent = await interaction.reply({ content: '🏓 Calcul de la latence...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const embed = new EmbedBuilder()
      .setColor(Colors.Blurple)
      .setTitle('🏓 Ping')
      .setDescription(`Latence du message: **${latency}ms**\nLatence API: **${Math.round(client.ws.ping)}ms**`)
      .setTimestamp();
    await interaction.editReply({ content: '', embeds: [embed] });
  },
};
