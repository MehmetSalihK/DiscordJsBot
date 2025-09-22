import { SlashCommandBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('testpanel')
        .setDescription('🎵 Teste le nouveau panel de musique avec différents types de recherche')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type de test à effectuer')
                .setRequired(false)
                .addChoices(
                    { name: '🎵 Recherche textuelle (mrc la rue)', value: 'text' },
                    { name: '🔗 Lien YouTube', value: 'youtube' },
                    { name: '🎧 Lien Spotify (si disponible)', value: 'spotify' },
                    { name: '📋 Playlist test', value: 'playlist' }
                )
        ),
    
    category: 'music',
    
    async execute(interaction, client) {
        try {
            // Vérifier si l'utilisateur est dans un canal vocal
            if (!interaction.member.voice.channel) {
                return await interaction.reply({
                    content: '❌ Vous devez être dans un canal vocal pour utiliser cette commande.',
                    flags: 64 // MessageFlags.Ephemeral
                });
            }

            await interaction.deferReply();

            const testType = interaction.options.getString('type') || 'text';
            let testQuery;

            switch (testType) {
                case 'text':
                    testQuery = 'mrc la rue'; // Test de recherche textuelle
                    break;
                case 'youtube':
                    testQuery = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Rick Roll
                    break;
                case 'spotify':
                    testQuery = 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC'; // Never Gonna Give You Up
                    break;
                case 'playlist':
                    testQuery = 'chill music playlist'; // Recherche de playlist
                    break;
                default:
                    testQuery = 'Never Gonna Give You Up Rick Astley';
            }

            console.log(`🧪 Test du panel avec type: ${testType}, query: ${testQuery}`);
            
            await client.queueManager.play(interaction, testQuery);
            
        } catch (error) {
            console.error('❌ Erreur lors du test du panel:', error);
            
            const reply = {
                content: '❌ Une erreur est survenue lors du test du panel de musique.',
                flags: 64 // MessageFlags.Ephemeral
            };
            
            if (interaction.deferred) {
                await interaction.editReply(reply);
            } else {
                await interaction.reply(reply);
            }
        }
    }
};



