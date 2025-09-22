import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('disconnect')
        .setDescription('Déconnecte le bot du salon vocal'),
    
    async execute(interaction) {
        await interaction.client.queueManager.disconnect(interaction);
    }
};



