import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { QueryType } from 'discord-player';

export const data = new SlashCommandBuilder()
    .setName('testplay')
    .setDescription('Test de lecture avec diagnostic détaillé')
    .addStringOption(option =>
        option.setName('query')
            .setDescription('Musique à tester')
            .setRequired(true)
    );

export async function execute(interaction) {
    try {
        const query = interaction.options.getString('query');
        const member = interaction.member;
        const channel = member.voice.channel;

        // Diagnostic initial
        let diagnosticText = '🔧 **Diagnostic de lecture**\n\n';
        
        // Vérification salon vocal
        if (!channel) {
            diagnosticText += '❌ Utilisateur pas dans un salon vocal\n';
            const embed = new EmbedBuilder()
                .setColor('#ff6b6b')
                .setTitle('Test de lecture')
                .setDescription(diagnosticText)
                .setTimestamp();
            return await interaction.reply({ embeds: [embed], flags: 64 // MessageFlags.Ephemeral });
        }
        diagnosticText += `✅ Salon vocal: ${channel.name}\n`;

        // Vérification permissions
        const permissions = channel.permissionsFor(interaction.client.user);
        if (!permissions.has(['Connect', 'Speak'])) {
            diagnosticText += '❌ Permissions manquantes (Connect/Speak)\n';
        } else {
            diagnosticText += '✅ Permissions OK\n';
        }

        // Test de recherche
        diagnosticText += '\n🔍 **Test de recherche**\n';
        
        await interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor('#ffeb3b')
                .setTitle('🔧 Test en cours...')
                .setDescription(diagnosticText + '⏳ Recherche en cours...')
                .setTimestamp()]
        });

        try {
            const player = interaction.client.queueManager.player;
            console.log('🔍 Recherche pour:', query);
            
            const searchResult = await player.search(query, {
                requestedBy: interaction.user,
                searchEngine: QueryType.YOUTUBE_SEARCH
            });

            console.log('📊 Résultat de recherche:', {
                found: !!searchResult,
                tracksCount: searchResult?.tracks?.length || 0,
                playlist: !!searchResult?.playlist
            });

            if (!searchResult || !searchResult.tracks.length) {
                diagnosticText += '❌ Aucun résultat trouvé\n';
                diagnosticText += `   → Query: "${query}"\n`;
                diagnosticText += '   → Essayez avec un autre terme\n';
            } else {
                diagnosticText += `✅ ${searchResult.tracks.length} résultat(s) trouvé(s)\n`;
                diagnosticText += `   → Titre: ${searchResult.tracks[0].title}\n`;
                diagnosticText += `   → Durée: ${searchResult.tracks[0].duration}\n`;
                diagnosticText += `   → Source: ${searchResult.tracks[0].source}\n`;
                
                // Test de création de queue
                diagnosticText += '\n🎵 **Test de queue**\n';
                
                try {
                    const queue = player.nodes.create(interaction.guild, {
                        metadata: {
                            channel: interaction.channel,
                            client: interaction.guild.members.me,
                            requestedBy: interaction.user
                        },
                        selfDeaf: true,
                        volume: 50,
                        leaveOnEmpty: true,
                        leaveOnEmptyCooldown: 300000,
                        leaveOnEnd: true,
                        leaveOnEndCooldown: 300000
                    });

                    diagnosticText += '✅ Queue créée\n';

                    // Test de connexion
                    try {
                        if (!queue.connection) {
                            await queue.connect(channel);
                            diagnosticText += '✅ Connexion au salon vocal réussie\n';
                        }

                        // Test d'ajout de track
                        queue.addTrack(searchResult.tracks[0]);
                        diagnosticText += '✅ Track ajoutée à la queue\n';

                        // Test de lecture
                        if (!queue.node.isPlaying()) {
                            await queue.node.play();
                            diagnosticText += '✅ Lecture démarrée\n';
                            diagnosticText += '\n🎉 **Test réussi !** La musique devrait jouer maintenant.';
                        }

                    } catch (connectionError) {
                        console.error('❌ Erreur de connexion:', connectionError);
                        diagnosticText += `❌ Erreur de connexion: ${connectionError.message}\n`;
                        player.nodes.delete(interaction.guild.id);
                    }

                } catch (queueError) {
                    console.error('❌ Erreur de queue:', queueError);
                    diagnosticText += `❌ Erreur de queue: ${queueError.message}\n`;
                }
            }

        } catch (searchError) {
            console.error('❌ Erreur de recherche:', searchError);
            diagnosticText += `❌ Erreur de recherche: ${searchError.message}\n`;
            
            if (searchError.message.includes('API')) {
                diagnosticText += '   → Problème avec l\'API YouTube\n';
                diagnosticText += '   → Vérifiez votre clé API\n';
            }
        }

        // Mise à jour du message avec le diagnostic complet
        const finalEmbed = new EmbedBuilder()
            .setColor(diagnosticText.includes('❌') ? '#ff6b6b' : '#4CAF50')
            .setTitle('🔧 Résultat du test de lecture')
            .setDescription(diagnosticText)
            .setTimestamp();

        await interaction.editReply({ embeds: [finalEmbed] });

    } catch (error) {
        console.error('Erreur lors du test:', error);
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff6b6b')
            .setTitle('❌ Erreur du test')
            .setDescription(`Une erreur s'est produite: ${error.message}`)
            .setTimestamp();
        
        if (interaction.replied) {
            await interaction.editReply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], flags: 64 // MessageFlags.Ephemeral });
        }
    }
}



