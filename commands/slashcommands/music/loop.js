import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Active/désactive la boucle')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Mode de boucle')
                .setRequired(true)
                .addChoices(
                    { name: 'Désactivé', value: 'off' },
                    { name: 'Musique actuelle', value: 'track' },
                    { name: 'Queue entière', value: 'queue' }
                )
        ),
    
    async execute(interaction) {
        const mode = interaction.options.getString('mode');
        await interaction.client.queueManager.setLoop(interaction, mode);
    }
};



