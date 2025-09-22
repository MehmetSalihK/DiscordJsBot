import { MusicEmbedBuilder } from './embedBuilder.js';

export class MusicButtonHandler {
    constructor(client) {
        this.client = client;
        this.searchSessions = new Map();
    }

    // Méthode utilitaire pour répondre de manière sécurisée aux interactions
    async safeReply(interaction, options) {
        try {
            if (interaction.replied || interaction.deferred) {
                return await interaction.editReply(options);
            } else {
                return await interaction.reply(options);
            }
        } catch (error) {
            console.error('Erreur lors de la réponse à l\'interaction:', error);
            // Tentative de fallback avec followUp si possible
            if (!interaction.replied && !interaction.deferred) {
                try {
                    return await interaction.reply({ 
                        content: 'Une erreur est survenue lors du traitement de votre demande.', 
                        flags: 64 // MessageFlags.Ephemeral 
                    });
                } catch (fallbackError) {
                    console.error('Erreur lors du fallback de réponse:', fallbackError);
                }
            }
         }
    }

    async handleButtonInteraction(interaction) {
        if (!interaction.isButton()) return;

        const customId = interaction.customId;
        
        console.log('🔘 [BUTTON_INTERACTION] Interaction de bouton reçue');
        console.log(`   🆔 Custom ID: ${customId}`);
        console.log(`   👤 Utilisateur: ${interaction.user.tag} (${interaction.user.id})`);
        console.log(`   🏠 Serveur: ${interaction.guild.name} (${interaction.guild.id})`);
        console.log(`   📍 Canal: ${interaction.channel.name} (${interaction.channel.id})`);
        
        // Vérifier si c'est un bouton de musique
        if (!customId.startsWith('music_') && !customId.startsWith('queue_') && !customId.startsWith('search_')) {
            console.log(`   ❌ Bouton non-musical ignoré`);
            return;
        }

        const queue = this.client.queueManager.player.nodes.get(interaction.guild.id);
        console.log(`   🎵 Queue trouvée: ${queue ? 'Oui' : 'Non'}`);
        if (queue) {
            console.log(`   📊 État de la queue: ${queue.tracks.size} tracks, en cours: ${queue.node.isPlaying() ? 'Oui' : 'Non'}`);
        }

        try {
            switch (true) {
                case customId === 'music_playpause':
                    await this.handlePlayPause(interaction, queue);
                    break;
                
                case customId === 'music_skip':
                    await this.handleSkip(interaction, queue);
                    break;
                
                case customId === 'music_stop':
                    await this.handleStop(interaction, queue);
                    break;
                
                case customId === 'music_loop':
                    await this.handleLoop(interaction, queue);
                    break;
                
                case customId === 'music_volume_up':
                    await this.handleVolumeUp(interaction, queue);
                    break;
                
                case customId === 'music_volume_down':
                    await this.handleVolumeDown(interaction, queue);
                    break;
                
                case customId === 'music_queue':
                    await this.handleShowQueue(interaction, queue);
                    break;
                
                case customId === 'music_shuffle':
                    await this.handleShuffle(interaction, queue);
                    break;
                
                case customId === 'music_disconnect':
                    await this.handleDisconnect(interaction, queue);
                    break;
                
                case customId.startsWith('queue_page_'):
                    await this.handleQueuePage(interaction, queue, customId);
                    break;
                
                case customId === 'queue_refresh':
                    await this.handleQueueRefresh(interaction, queue);
                    break;
                
                case customId.startsWith('search_select_'):
                    await this.handleSearchSelect(interaction, customId);
                    break;
                
                case customId === 'search_cancel':
                    await this.handleSearchCancel(interaction);
                    break;
                
                default:
                    break;
            }
        } catch (error) {
            console.error('❌ [BUTTON_ERROR] Erreur lors du traitement du bouton:');
            console.error(`   🏷️ Bouton: ${customId}`);
            console.error(`   👤 Utilisateur: ${interaction.user.tag} (${interaction.user.id})`);
            console.error(`   🏠 Serveur: ${interaction.guild?.name || 'DM'} (${interaction.guild?.id || 'N/A'})`);
            console.error(`   📍 Canal: ${interaction.channel?.name || 'Inconnu'} (${interaction.channel?.id || 'N/A'})`);
            console.error(`   ⚠️ Erreur:`, error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    embeds: [MusicEmbedBuilder.createErrorEmbed('Une erreur est survenue lors du traitement de votre demande.')],
                    flags: 64 // MessageFlags.Ephemeral
                });
            }
        }
    }

    async handlePlayPause(interaction, queue) {
        console.log('⏯️ [PLAY_PAUSE] Action play/pause demandée');
        
        if (!queue) {
            console.log('   ❌ Aucune queue trouvée');
            return this.safeReply(interaction, {
                embeds: [MusicEmbedBuilder.createErrorEmbed('Aucune musique en cours de lecture.')],
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        const wasPaused = queue.node.isPaused();
        console.log(`   📊 État actuel: ${wasPaused ? 'En pause' : 'En lecture'}`);
        console.log(`   🎵 Track actuel: ${queue.currentTrack?.title || 'Aucun'}`);

        if (wasPaused) {
            queue.node.resume();
            console.log('   ▶️ Lecture reprise');
            await this.safeReply(interaction, {
                embeds: [MusicEmbedBuilder.createSuccessEmbed('▶️ Lecture reprise.')],
                flags: 64 // MessageFlags.Ephemeral
            });
        } else {
            queue.node.pause();
            console.log('   ⏸️ Lecture mise en pause');
            await this.safeReply(interaction, {
                embeds: [MusicEmbedBuilder.createSuccessEmbed('⏸️ Lecture mise en pause.')],
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        // Mettre à jour l'embed principal
        await this.updateNowPlayingEmbed(interaction, queue);
        console.log('   ✅ Embed mis à jour');
    }

    async handleSkip(interaction, queue) {
        console.log('⏭️ [SKIP] Action skip demandée');
        
        if (!queue || !queue.currentTrack) {
            console.log('   ❌ Aucune queue ou track actuel trouvé');
            return this.safeReply(interaction, {
                embeds: [MusicEmbedBuilder.createErrorEmbed('Aucune musique à passer.')],
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        const currentTrack = queue.currentTrack;
        console.log(`   🎵 Track à passer: ${currentTrack.title}`);
        console.log(`   📊 Tracks restants: ${queue.tracks.size}`);
        
        queue.node.skip();
        console.log('   ✅ Track passé avec succès');
        
        await this.safeReply(interaction, {
            embeds: [MusicEmbedBuilder.createSuccessEmbed(`⏭️ **${currentTrack.title}** a été passée.`)],
            flags: 64 // MessageFlags.Ephemeral
        });
    }

    async handleStop(interaction, queue) {
        console.log('⏹️ [STOP] Action stop demandée');
        
        if (!queue) {
            console.log('   ❌ Aucune queue trouvée');
            return this.safeReply(interaction, {
                embeds: [MusicEmbedBuilder.createErrorEmbed('Aucune musique en cours de lecture.')],
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        console.log(`   🎵 Track actuel: ${queue.currentTrack?.title || 'Aucun'}`);
        console.log(`   📊 Tracks dans la queue: ${queue.tracks.size}`);
        
        queue.node.stop();
        console.log('   ✅ Lecture arrêtée et queue vidée');
        
        await this.safeReply(interaction, {
            embeds: [MusicEmbedBuilder.createSuccessEmbed('⏹️ Lecture arrêtée et file d\'attente vidée.')],
            flags: 64 // MessageFlags.Ephemeral
        });
    }

    async handleLoop(interaction, queue) {
        if (!queue) {
            return this.safeReply(interaction, {
                embeds: [MusicEmbedBuilder.createErrorEmbed('Aucune musique en cours de lecture.')],
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        const modes = [0, 1, 2]; // Off, Track, Queue
        const currentMode = queue.repeatMode;
        const nextMode = modes[(modes.indexOf(currentMode) + 1) % modes.length];
        
        queue.setRepeatMode(nextMode);
        
        const modeText = MusicEmbedBuilder.getLoopModeText(nextMode);
        await this.safeReply(interaction, {
            embeds: [MusicEmbedBuilder.createSuccessEmbed(`🔁 Mode de répétition : **${modeText}**`)],
            flags: 64 // MessageFlags.Ephemeral
        });

        await this.updateNowPlayingEmbed(interaction, queue);
    }

    async handleVolumeUp(interaction, queue) {
        if (!queue) {
            return this.safeReply(interaction, {
                embeds: [MusicEmbedBuilder.createErrorEmbed('Aucune musique en cours de lecture.')],
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        const currentVolume = queue.node.volume;
        const newVolume = Math.min(currentVolume + 10, 100);
        
        queue.node.setVolume(newVolume);
        
        await this.safeReply(interaction, {
            embeds: [MusicEmbedBuilder.createSuccessEmbed(`🔊 Volume : **${newVolume}%**`)],
            flags: 64 // MessageFlags.Ephemeral
        });

        await this.updateNowPlayingEmbed(interaction, queue);
    }

    async handleVolumeDown(interaction, queue) {
        if (!queue) {
            return this.safeReply(interaction, {
                embeds: [MusicEmbedBuilder.createErrorEmbed('Aucune musique en cours de lecture.')],
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        const currentVolume = queue.node.volume;
        const newVolume = Math.max(currentVolume - 10, 0);
        
        queue.node.setVolume(newVolume);
        
        await this.safeReply(interaction, {
            embeds: [MusicEmbedBuilder.createSuccessEmbed(`🔉 Volume : **${newVolume}%**`)],
            flags: 64 // MessageFlags.Ephemeral
        });

        await this.updateNowPlayingEmbed(interaction, queue);
    }

    async handleShowQueue(interaction, queue) {
        if (!queue || (!queue.currentTrack && queue.tracks.data.length === 0)) {
            return this.safeReply(interaction, {
                embeds: [MusicEmbedBuilder.createErrorEmbed('Aucune musique dans la file d\'attente.')],
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        const embed = MusicEmbedBuilder.createQueueEmbed(queue, 1);
        const totalPages = Math.ceil(queue.tracks.data.length / 10);
        const buttons = MusicEmbedBuilder.createQueueButtons(1, totalPages);

        await this.safeReply(interaction, { 
            embeds: [embed], 
            components: buttons, 
            flags: 64 // MessageFlags.Ephemeral 
        });
    }

    async handleShuffle(interaction, queue) {
        if (!queue || queue.tracks.data.length === 0) {
            return this.safeReply(interaction, {
                embeds: [MusicEmbedBuilder.createErrorEmbed('Aucune musique dans la file d\'attente à mélanger.')],
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        queue.tracks.shuffle();
        
        await this.safeReply(interaction, {
            embeds: [MusicEmbedBuilder.createSuccessEmbed('🔀 File d\'attente mélangée.')],
            flags: 64 // MessageFlags.Ephemeral
        });
    }

    async handleDisconnect(interaction, queue) {
        if (!queue) {
            return this.safeReply(interaction, {
                embeds: [MusicEmbedBuilder.createErrorEmbed('Le bot n\'est pas connecté.')],
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        queue.node.stop();
        
        await this.safeReply(interaction, {
            embeds: [MusicEmbedBuilder.createSuccessEmbed('👋 Bot déconnecté.')],
            flags: 64 // MessageFlags.Ephemeral
        });
    }

    async handleQueuePage(interaction, queue, customId) {
        const page = parseInt(customId.split('_')[2]);
        const embed = MusicEmbedBuilder.createQueueEmbed(queue, page);
        const totalPages = Math.ceil(queue.tracks.data.length / 10);
        const buttons = MusicEmbedBuilder.createQueueButtons(page, totalPages);

        await this.safeReply(interaction, { 
            embeds: [embed], 
            components: buttons, 
            flags: 64 // MessageFlags.Ephemeral 
        });
    }

    async handleQueueRefresh(interaction, queue) {
        if (!queue || (!queue.currentTrack && queue.tracks.data.length === 0)) {
            return this.safeReply(interaction, {
                embeds: [MusicEmbedBuilder.createErrorEmbed('Aucune musique dans la file d\'attente.')],
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        const embed = MusicEmbedBuilder.createQueueEmbed(queue, 1);
        const totalPages = Math.ceil(queue.tracks.data.length / 10);
        const buttons = MusicEmbedBuilder.createQueueButtons(1, totalPages);

        await this.safeReply(interaction, { 
            embeds: [embed], 
            components: buttons, 
            flags: 64 // MessageFlags.Ephemeral 
        });
    }

    async handleSearchSelect(interaction, customId) {
        const index = parseInt(customId.split('_')[2]);
        const sessionId = interaction.message.id;
        const session = this.searchSessions.get(sessionId);

        if (!session) {
            return this.safeReply(interaction, {
                embeds: [MusicEmbedBuilder.createErrorEmbed('Session de recherche expirée.')],
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        const selectedTrack = session.results[index];
        if (!selectedTrack) {
            return this.safeReply(interaction, {
                embeds: [MusicEmbedBuilder.createErrorEmbed('Sélection invalide.')],
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        // Jouer la musique sélectionnée
        await this.client.queueManager.play(interaction, selectedTrack.url);
        
        // Nettoyer la session
        this.searchSessions.delete(sessionId);
        
        // Supprimer les boutons du message original
        await interaction.update({
            components: []
        });
    }

    async handleSearchCancel(interaction) {
        const messageId = interaction.message.id;
        this.searchSessions.delete(messageId);
        
        await this.safeReply(interaction, {
            embeds: [MusicEmbedBuilder.createSuccessEmbed('🚫 Recherche annulée.')],
            flags: 64 // MessageFlags.Ephemeral
        });
    }

    async updateNowPlayingEmbed(interaction, queue) {
        if (!queue || !queue.currentTrack) return;

        try {
            const embed = MusicEmbedBuilder.createNowPlayingEmbed(queue.currentTrack, queue);
            const buttons = MusicEmbedBuilder.createPlayerButtons(queue);

            // Trouver le message "Now Playing" dans le canal et le mettre à jour
            const messages = await interaction.channel.messages.fetch({ limit: 10 });
            const nowPlayingMessage = messages.find(msg => 
                msg.author.id === this.client.user.id && 
                msg.embeds.length > 0 && 
                msg.embeds[0].title?.includes('En cours de lecture')
            );

            if (nowPlayingMessage) {
                await nowPlayingMessage.edit({
                    embeds: [embed],
                    components: buttons
                });
            }
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'embed:', error);
        }
    }

    // Méthode pour créer une session de recherche
    createSearchSession(messageId, results, query) {
        this.searchSessions.set(messageId, {
            results,
            query,
            createdAt: Date.now()
        });

        // Nettoyer automatiquement après 30 secondes
        setTimeout(() => {
            this.searchSessions.delete(messageId);
        }, 30000);
    }
}



