import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('back')
        .setDescription('Retour en arrière dans la musique')
        .addIntegerOption(option =>
            option.setName('secondes')
                .setDescription('Nombre de secondes à reculer (1-300)')
                .setMinValue(1)
                .setMaxValue(300)
                .setRequired(false)
        ),
    
    async execute(interaction) {
        await interaction.client.queueManager.seekBackward(interaction);
    }
};


