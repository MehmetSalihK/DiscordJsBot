import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('speed')
        .setDescription('Active/désactive l\'effet accéléré (nightcore)'),
    
    async execute(interaction) {
        await interaction.client.queueManager.toggleFilter(interaction, 'nightcore');
    }
};