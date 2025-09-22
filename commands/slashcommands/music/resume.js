import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Reprend la lecture en pause'),
    
    async execute(interaction) {
        await interaction.client.queueManager.resume(interaction);
    }
};



