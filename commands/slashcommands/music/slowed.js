import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('slowed')
        .setDescription('Active/désactive l\'effet ralenti (vaporwave)'),
    
    async execute(interaction) {
        await interaction.client.queueManager.toggleFilter(interaction, 'vaporwave');
    }
};