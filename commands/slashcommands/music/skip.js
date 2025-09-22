import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Passe à la musique suivante'),
    
    async execute(interaction) {
        await interaction.client.queueManager.skip(interaction);
    }
};



