import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Affiche la musique actuellement en cours de lecture'),
    
    async execute(interaction) {
        await interaction.client.queueManager.nowPlaying(interaction);
    }
};



