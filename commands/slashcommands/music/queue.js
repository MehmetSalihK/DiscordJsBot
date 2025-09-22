import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Affiche la liste d\'attente des musiques')
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Numéro de page à afficher')
                .setRequired(false)
                .setMinValue(1)
        ),
    
    async execute(interaction) {
        const page = interaction.options.getInteger('page') || 1;
        await interaction.client.queueManager.showQueue(interaction, page);
    }
};



