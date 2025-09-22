import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('bass')
        .setDescription('Active/désactive l\'effet bass boost'),
    
    async execute(interaction) {
        await interaction.client.queueManager.toggleFilter(interaction, 'bassboost');
    }
};