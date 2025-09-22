import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Arrête la lecture et vide la queue'),
    
    async execute(interaction) {
        await interaction.client.queueManager.stop(interaction);
    }
};



