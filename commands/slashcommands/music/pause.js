import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Met en pause la lecture actuelle'),
    
    async execute(interaction) {
        await interaction.client.queueManager.pause(interaction);
    }
};



