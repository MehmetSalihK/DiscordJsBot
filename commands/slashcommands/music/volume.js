import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Ajuste le volume de la musique')
        .addIntegerOption(option =>
            option.setName('level')
                .setDescription('Niveau de volume (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),
    
    async execute(interaction) {
        const volume = interaction.options.getInteger('level');
        await interaction.client.queueManager.setVolume(interaction, volume);
    }
};



