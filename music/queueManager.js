import { Player, QueryType } from 'discord-player';
import { DefaultExtractors } from '@discord-player/extractor';
import { YoutubeiExtractor } from 'discord-player-youtubei';
import ytdl from 'ytdl-core';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { MusicEmbedBuilder } from './embedBuilder.js';
import MusicPanelManager from './musicPanelManager.js';
import MusicPanelHandler from './musicPanelHandler.js';
import fs from 'fs';
import path from 'path';
import ffmpegStatic from 'ffmpeg-static';

// Supprimer les erreurs YouTube.js encombrants
const originalConsoleError = console.error;
console.error = (...args) => {
    const message = args.join(' ');
    // Ignorer les erreurs spécifiques de YouTube.js
    if (message.includes('GridShelfView') || 
        message.includes('SectionHeaderView') || 
        message.includes('youtubei.js') ||
        message.includes('Failed to find class') ||
        message.includes('Unknown class')) {
        return; // Ne pas afficher ces erreurs
    }
    originalConsoleError.apply(console, args);
};

class QueueManager {
    constructor(client) {
        this.client = client;
        this.player = new Player(client, {
            skipFFmpeg: false, // ✅ Assurer que FFmpeg est utilisé pour le décodage audio
            ytdlOptions: {
                quality: 'highestaudio',
                highWaterMark: 1 << 25,
                filter: 'audioonly'
            },
            // Configuration pour utiliser ffmpeg-static
            ffmpegPath: ffmpegStatic
        });
        this.nowPlayingMessages = new Map();
        
        // Initialisation du panel de musique
        this.panelManager = new MusicPanelManager(client);
        this.panelHandler = new MusicPanelHandler(client, this, this.panelManager);
        
        console.log('🚀 Initialisation du QueueManager...');
        this.setupPlayer().catch(error => {
            console.error('âŒ Erreur lors de l\'initialisation du player:', error);
        });
        this.loadServerConfigs();
    }

    async setupPlayer() {
        // Configuration du player - Extracteurs
        console.log('ðŸ”§ Chargement des extracteurs...');
        try {
            // Charger les extracteurs par défaut (Spotify, SoundCloud, YouTube, etc.)
            await this.player.extractors.loadMulti(DefaultExtractors);
            console.log('✅ Extracteurs par défaut chargés avec succès');
            
            // Enregistrer YoutubeiExtractor pour YouTube
            await this.player.extractors.register(YoutubeiExtractor, {});
            console.log('✅ YoutubeiExtractor enregistré pour YouTube');
            
            // Configuration ytdl-core pour YouTube (plus fiable)
            console.log('ðŸ”‘ Configuration de l\'extracteur YouTube avec ytdl-core...');
            
            // Vérifier que ytdl-core fonctionne
            try {
                const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
                const isValid = ytdl.validateURL(testUrl);
                if (isValid) {
                    console.log('✅ ytdl-core configuré et fonctionnel');
                } else {
                    console.warn('âš ï¸ ytdl-core ne peut pas valider les URLs YouTube');
                }
            } catch (error) {
                console.warn('âš ï¸ Problème avec ytdl-core:', error.message);
            }

            // Enregistrer play-dl comme extracteur de fallback pour YouTube
            try {
                const playdl = await import('play-dl');
                
                // Configuration de play-dl pour YouTube
                await playdl.default.setToken({
                    youtube: {
                        cookie: process.env.YOUTUBE_COOKIE || ''
                    }
                });
                
                console.log('✅ Extracteur play-dl configuré comme fallback pour YouTube');
            } catch (error) {
                console.log('âš ï¸ Impossible de configurer l\'extracteur play-dl:', error.message);
            }
        } catch (error) {
            console.error('âŒ Erreur lors du chargement des extracteurs:', error);
        }
        
        // Ã‰vénements du player
        this.player.events.on('playerStart', (queue, track) => {
            console.log('▶️ [PLAYER_START] Démarrage de la lecture');
            console.log(`   🎵 Track: ${track.title}`);
            console.log(`   ðŸ‘¤ Artiste: ${track.author}`);
            console.log(`   ðŸ  Serveur: ${queue.guild.name} (${queue.guild.id})`);
            console.log(`   ðŸ“Š Queue: ${queue.tracks.size} tracks en attente`);
            console.log(`   ðŸ”Š Volume: ${queue.node.volume}%`);
            
            // Utiliser le nouveau panel de musique
            this.panelManager.createOrUpdatePanel(queue, track, queue.metadata.channel);
        });

        this.player.events.on('playerFinish', (queue, track) => {
            console.log('â¹ï¸ [PLAYER_FINISH] Fin de lecture');
            console.log(`   🎵 Track terminé: ${track.title}`);
            console.log(`   ðŸ  Serveur: ${queue.guild.name} (${queue.guild.id})`);
            console.log(`   ðŸ“Š Tracks restants: ${queue.tracks.data.length}`);
            
            // Mettre Ã  jour le panel si il y a encore des musiques
            if (queue.tracks.data.length > 0) {
                console.log(`   â­ï¸ Passage au track suivant dans 1 seconde...`);
                setTimeout(() => {
                    if (queue.currentTrack) {
                        console.log(`   ✅ Mise Ã  jour du panel pour: ${queue.currentTrack.title}`);
                        this.panelManager.createOrUpdatePanel(queue, queue.currentTrack, queue.metadata.channel);
                    }
                }, 1000);
            } else {
                console.log(`   ðŸ“­ Aucun track suivant`);
            }
        });

        this.player.events.on('emptyQueue', (queue) => {
            console.log('ðŸ“­ [EMPTY_QUEUE] Queue vide');
            console.log(`   ðŸ  Serveur: ${queue.guild.name} (${queue.guild.id})`);
            console.log(`   ðŸ“ Canal: ${queue.metadata.channel.name}`);
            
            // Afficher le panel arrêté
            this.panelManager.updateStoppedPanel(queue.guild.id, 'File d\'attente terminée');
            const embed = new EmbedBuilder()
                .setColor('#ff6b6b')
                .setTitle('🎵 Queue terminée')
                .setDescription('Toutes les musiques ont été jouées !')
                .setTimestamp();
            
            queue.metadata.channel.send({ embeds: [embed] });
        });

        this.player.events.on('error', (queue, error) => {
            console.error('âŒ [PLAYER_ERROR] Erreur du player');
            console.error(`   ðŸ  Serveur: ${queue?.guild?.name || 'Inconnu'} (${queue?.guild?.id || 'Inconnu'})`);
            console.error(`   ðŸ“ Canal: ${queue?.metadata?.channel?.name || 'Inconnu'}`);
            console.error(`   🎵 Track actuel: ${queue?.currentTrack?.title || 'Aucun'}`);
            console.error(`   âŒ Erreur: ${error.message}`);
            console.error(`   ðŸ“Š Stack trace:`, error.stack);
            
            const embed = new EmbedBuilder()
                .setColor('#ff6b6b')
                .setTitle('âŒ Erreur')
                .setDescription(`Une erreur s'est produite: ${error.message}`)
                .setTimestamp();
            
            if (queue?.metadata?.channel) {
                queue.metadata.channel.send({ embeds: [embed] });
            }
        });

        // Event spécifique pour les erreurs de lecture audio
        this.player.events.on('playerError', (queue, error) => {
            console.error('ðŸ”Š [PLAYER_ERROR] Erreur de lecture audio');
            console.error(`   ðŸ  Serveur: ${queue?.guild?.name || 'Inconnu'} (${queue?.guild?.id || 'Inconnu'})`);
            console.error(`   🎵 Track: ${queue?.currentTrack?.title || 'Aucun'}`);
            console.error(`   ðŸ”— URL: ${queue?.currentTrack?.url || 'Aucune'}`);
            console.error(`   âŒ Erreur Player: ${error.message}`);
            console.error(`   ðŸ“Š Type d'erreur:`, error.name);
            
            // Tentative de skip automatique en cas d'erreur
            if (queue && queue.tracks.data.length > 0) {
                console.log('â­ï¸ Tentative de skip automatique...');
                try {
                    queue.node.skip();
                } catch (skipError) {
                    console.error('âŒ Impossible de skip:', skipError.message);
                }
            }
        });
    }

    loadServerConfigs() {
        const configPath = path.join(process.cwd(), 'json', 'servers.json');
        try {
            if (fs.existsSync(configPath)) {
                this.serverConfigs = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            } else {
                this.serverConfigs = {};
                this.saveServerConfigs();
            }
        } catch (error) {
            console.error('âŒ [CONFIG_ERROR] Erreur lors du chargement des configs serveur:');
            console.error(`   ðŸ“ Chemin: ${configPath}`);
            console.error(`   âš ï¸ Erreur:`, error);
            this.serverConfigs = {};
        }
    }

    saveServerConfigs() {
        const configPath = path.join(process.cwd(), 'json', 'servers.json');
        try {
            fs.writeFileSync(configPath, JSON.stringify(this.serverConfigs, null, 2));
        } catch (error) {
            console.error('âŒ [CONFIG_SAVE_ERROR] Erreur lors de la sauvegarde des configs serveur:');
            console.error(`   ðŸ“ Chemin: ${configPath}`);
            console.error(`   âš ï¸ Erreur:`, error);
        }
    }

    getServerConfig(guildId) {
        if (!this.serverConfigs[guildId]) {
            this.serverConfigs[guildId] = {
                volume: 50,
                logsEnabled: false,
                logChannelId: null
            };
            this.saveServerConfigs();
        }
        return this.serverConfigs[guildId];
    }

    async play(interaction, query) {
        // Logs de débogage pour tracer l'activité
        console.log(`🎵 [PLAY] Nouvelle demande de lecture`);
        console.log(`   ðŸ‘¤ Utilisateur: ${interaction.user.tag} (${interaction.user.id})`);
        console.log(`   ðŸ  Serveur: ${interaction.guild.name} (${interaction.guild.id})`);
        console.log(`   ðŸ“ Requête: "${query}"`);
        console.log(`   ðŸ“ Canal: #${interaction.channel.name}`);

        // Déférer la réponse immédiatement pour éviter les erreurs d'interaction
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.deferReply();
                console.log(`   â³ Réponse différée avec succès`);
            }
        } catch (error) {
            console.log(`   âŒ Erreur lors du deferReply: ${error.message}`);
            // Si l'interaction a expiré, on ne peut plus répondre
            if (error.code === 10062) {
                console.log(`   âš ï¸ Interaction expirée - impossible de répondre`);
                return;
            }
        }

        const member = interaction.member;
        const channel = member.voice.channel;

        if (!channel) {
            return this.sendErrorEmbed(interaction, 'Vous devez être dans un salon vocal pour utiliser cette commande !');
        }

        const permissions = channel.permissionsFor(interaction.client.user);
        if (!permissions.has(['Connect', 'Speak'])) {
            return this.sendErrorEmbed(interaction, 'Je n\'ai pas les permissions pour rejoindre ou parler dans ce salon vocal !');
        }

        let searchResult = null;
        let searchEngine = 'youtubeSearch';

        try {
            // Première tentative avec YOUTUBE_SEARCH (meilleur pour les recherches textuelles)
            console.log('ðŸ” Recherche YouTube pour:', query);
            searchResult = await this.player.search(query, {
                requestedBy: interaction.user,
                searchEngine: QueryType.YOUTUBE_SEARCH,
                fallbackSearchEngine: QueryType.YOUTUBE,
                blockStreamFrom: [],
                ignoreInternalSearch: false
            });

            // Vérifier si on a des résultats (discord-player peut utiliser .data ou directement .tracks)
            const tracks = searchResult?.tracks?.data || searchResult?.tracks || [];
            const hasResults = tracks && tracks.length > 0;

            console.log('ðŸ“Š Résultats trouvés:', tracks.length, 'tracks');

            // Si aucun résultat avec YOUTUBE_SEARCH, essayer avec YOUTUBE
            if (!hasResults) {
                console.log('ðŸ”„ Fallback activé - Tentative avec QueryType.YOUTUBE...');
                searchEngine = 'youtube';
                
                searchResult = await this.player.search(query, {
                    requestedBy: interaction.user,
                    searchEngine: QueryType.YOUTUBE
                });

                const fallbackTracks = searchResult?.tracks?.data || searchResult?.tracks || [];
                const hasFallbackResults = fallbackTracks && fallbackTracks.length > 0;

                if (hasFallbackResults) {
                    console.log('✅ Fallback réussi - Résultats trouvés:', fallbackTracks.length, 'tracks');
                } else {
                    console.log('âŒ Fallback échoué - Aucun résultat trouvé');
                }
            }

            // Vérification finale des résultats après tous les fallbacks
            const finalTracksAfterFallback = searchResult?.tracks?.data || searchResult?.tracks || [];
            const finalHasResults = finalTracksAfterFallback && finalTracksAfterFallback.length > 0;

            if (!finalHasResults) {
                if (query.includes('spotify.com')) {
                    console.log('🎵 Tentative de recherche Spotify...');
                    searchEngine = 'spotify';
                    
                    try {
                        // Détecter le type de lien Spotify
                        let spotifyEngine = QueryType.SPOTIFY_SONG;
                        if (query.includes('/playlist/')) {
                            spotifyEngine = QueryType.SPOTIFY_PLAYLIST;
                        } else if (query.includes('/album/')) {
                            spotifyEngine = QueryType.SPOTIFY_ALBUM;
                        }

                        searchResult = await this.player.search(query, {
                            requestedBy: interaction.user,
                            searchEngine: spotifyEngine
                        });

                        const spotifyTracks = searchResult?.tracks?.data || searchResult?.tracks || [];
                        const hasSpotifyResults = spotifyTracks && spotifyTracks.length > 0;

                        if (hasSpotifyResults) {
                            console.log('✅ Fallback Spotify réussi - Résultats trouvés:', spotifyTracks.length, 'tracks');
                        } else {
                            console.log('âŒ Fallback Spotify échoué - Aucun résultat trouvé');
                        }
                    } catch (spotifyError) {
                        console.error('âŒ [SPOTIFY_ERROR] Erreur lors du fallback Spotify:');
                        console.error(`   ðŸ” Requête: ${query}`);
                        console.error(`   ðŸ‘¤ Utilisateur: ${interaction.user.tag} (${interaction.user.id})`);
                        console.error(`   ðŸ  Serveur: ${interaction.guild?.name || 'DM'} (${interaction.guild?.id || 'N/A'})`);
                        console.error(`   âš ï¸ Erreur:`, spotifyError);
                    }
                }
            }

            // Vérification finale des résultats après tous les fallbacks
            const finalTracksResult = searchResult?.tracks?.data || searchResult?.tracks || [];
            const hasAnyResults = finalTracksResult && finalTracksResult.length > 0;

            // Si aucun résultat trouvé avec tous les moteurs
            if (!hasAnyResults) {
                console.log('âŒ Aucun résultat trouvé pour:', query);
                
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('âŒ Aucun résultat trouvé')
                    .setDescription(`Impossible de trouver **${query}**.`)
                    .addFields({
                        name: 'ðŸ” Moteurs testés',
                        value: 'â€¢ YouTube Search\nâ€¢ YouTube Direct' + (query.includes('spotify.com') ? '\nâ€¢ Spotify' : ''),
                        inline: false
                    })
                    .setTimestamp();
                
                return interaction.editReply({ embeds: [embed] });
            }

            console.log(`ðŸŽ›ï¸ [QUEUE] Création de la queue pour le serveur ${interaction.guild.name}`);
            const serverConfig = this.getServerConfig(interaction.guild.id);
            console.log(`   ðŸ”Š Volume configuré: ${serverConfig.volume}%`);
            
            const queue = this.player.nodes.create(interaction.guild, {
                metadata: {
                    channel: interaction.channel,
                    client: interaction.guild.members.me,
                    requestedBy: interaction.user
                },
                selfDeaf: true,
                volume: serverConfig.volume,
                leaveOnEmpty: true,
                leaveOnEmptyCooldown: 300000,
                leaveOnEnd: true,
                leaveOnEndCooldown: 300000
            });
            console.log(`   ✅ Queue créée avec succès`);

            try {
                if (!queue.connection) {
                    console.log('ðŸ”— Connexion au salon vocal:', channel.name);
                    await queue.connect(channel);
                    console.log('✅ Connecté au salon vocal avec succès');
                } else {
                    console.log('ðŸ”— DéjÃ  connecté au salon vocal');
                }
            } catch (connectionError) {
                console.error('âŒ [CONNECTION_ERROR] Erreur de connexion vocale:');
                console.error(`   ðŸŽ¤ Salon: ${channel.name} (${channel.id})`);
                console.error(`   ðŸ‘¤ Utilisateur: ${interaction.user.tag} (${interaction.user.id})`);
                console.error(`   ðŸ  Serveur: ${interaction.guild?.name || 'DM'} (${interaction.guild?.id || 'N/A'})`);
                console.error(`   âš ï¸ Erreur:`, connectionError);
                this.player.nodes.delete(interaction.guild.id);
                return this.sendErrorEmbed(interaction, 'Impossible de rejoindre le salon vocal !');
            }

            if (searchResult.playlist) {
                console.log(`ðŸ“‹ [PLAYLIST] Traitement de la playlist: ${searchResult.playlist.title}`);
                console.log(`   ðŸ“Š Tracks dans la playlist: ${finalTracks.length}`);
                
                // Filtrer les doublons pour les playlists
                const uniqueTracks = finalTracks.filter(track => !this.isDuplicateTrack(queue, track));
                const duplicatesCount = finalTracks.length - uniqueTracks.length;
                
                console.log(`   ✅ Tracks uniques: ${uniqueTracks.length}`);
                console.log(`   âš ï¸ Doublons ignorés: ${duplicatesCount}`);

                if (uniqueTracks.length === 0) {
                    console.log(`   âŒ Aucun track unique - playlist déjÃ  présente`);
                    const embed = new EmbedBuilder()
                        .setColor('#ff9500')
                        .setTitle('âš ï¸ Playlist déjÃ  présente')
                        .setDescription(`Toutes les musiques de **${searchResult.playlist.title}** sont déjÃ  dans la queue.`)
                        .setTimestamp();
                    
                    return interaction.editReply({ embeds: [embed] });
                }

                console.log(`   âž• Ajout des tracks Ã  la queue...`);
                queue.addTrack(uniqueTracks);
                console.log(`   ✅ Playlist ajoutée avec succès`);
                const embed = new EmbedBuilder()
                    .setColor('#4ecdc4')
                    .setTitle('ðŸ“‹ Playlist ajoutée')
                    .setDescription(`**${searchResult.playlist.title}** a été ajoutée Ã  la queue\n🎵 **${uniqueTracks.length}** musiques ajoutées${duplicatesCount > 0 ? `\nâš ï¸ ${duplicatesCount} doublon(s) ignoré(s)` : ''}`)
                    .setThumbnail(searchResult.playlist.thumbnail)
                    .addFields(
                        { name: 'ðŸ‘¤ Demandé par', value: interaction.user.toString(), inline: true },
                        { name: 'â±ï¸ Durée totale', value: this.formatDuration(uniqueTracks.reduce((acc, track) => acc + track.duration, 0)), inline: true }
                    )
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            } else {
                console.log(`🎵 [TRACK] Traitement du track: ${finalTracks[0].title}`);
                console.log(`   ðŸ‘¤ Artiste: ${finalTracks[0].author}`);
                console.log(`   â±ï¸ Durée: ${finalTracks[0].duration}`);
                
                // Vérifier les doublons pour une seule musique
                if (this.isDuplicateTrack(queue, finalTracks[0])) {
                    console.log(`   âš ï¸ Track déjÃ  présent dans la queue`);
                    const embed = new EmbedBuilder()
                        .setColor('#ff9500')
                        .setTitle('âš ï¸ Musique déjÃ  présente')
                        .setDescription(`**${finalTracks[0].title}** est déjÃ  dans la queue.`)
                        .setTimestamp();
                    
                    return interaction.editReply({ embeds: [embed] });
                }

                console.log(`   âž• Ajout du track Ã  la queue...`);
                queue.addTrack(finalTracks[0]);
                console.log(`   ✅ Track ajouté avec succès`);
                
                // Envoyer un message de confirmation avec boutons interactifs
                const embed = MusicEmbedBuilder.createNowPlayingEmbed(finalTracks[0], queue);
                const buttons = MusicEmbedBuilder.createPlayerButtons(queue);

                await interaction.editReply({ 
                    embeds: [embed],
                    components: buttons
                });
            }

            console.log('🎵 Ã‰tat de la queue avant lecture:', {
                isPlaying: queue.node.isPlaying(),
                tracksCount: queue.tracks.size,
                currentTrack: queue.currentTrack?.title
            });

            if (!queue.node.isPlaying()) {
                console.log('▶️ Démarrage de la lecture...');
                try {
                    await queue.node.play();
                    console.log('✅ Lecture démarrée avec succès');
                } catch (playError) {
                    console.error('âŒ Erreur lors du démarrage de la lecture:', playError);
                    return this.sendErrorEmbed(interaction, 'Erreur lors du démarrage de la lecture !');
                }
            } else {
                console.log('🎵 Musique déjÃ  en cours de lecture');
            }

            // Log avec informations sur le moteur de recherche
            const trackInfo = tracks[0]?.title || searchResult.playlist?.title;
            const logDetails = `${trackInfo} (Moteur: ${searchEngine})`;
            this.logAction(interaction.guild.id, interaction.user, 'play', logDetails);

            // Log de succès dans la console
            if (searchEngine !== 'youtubeSearch') {
                console.log(`✅ Musique trouvée avec le moteur: ${searchEngine}`);
            }

        } catch (error) {
            console.error('Erreur lors de la lecture:', error);
            return this.sendErrorEmbed(interaction, 'Une erreur s\'est produite lors de la lecture de la musique !');
        }
    }

    async skip(interaction) {
        console.log('â­ï¸ [COMMAND_SKIP] Commande skip reçue');
        console.log(`   ðŸ‘¤ Utilisateur: ${interaction.user.tag} (${interaction.user.id})`);
        console.log(`   ðŸ  Serveur: ${interaction.guild.name} (${interaction.guild.id})`);
        
        const queue = this.player.nodes.get(interaction.guild.id);
        
        if (!queue || !queue.currentTrack) {
            console.log('   âŒ Aucune queue ou track actuel trouvé');
            const embed = MusicEmbedBuilder.createErrorEmbed('Aucune musique Ã  passer !');
            return interaction.editReply({ embeds: [embed] });
        }

        const currentTrack = queue.currentTrack;
        console.log(`   🎵 Track Ã  passer: ${currentTrack.title}`);
        console.log(`   ðŸ“Š Tracks restants: ${queue.tracks.size}`);
        
        queue.node.skip();
        console.log('   ✅ Track passé avec succès');
        
        const embed = MusicEmbedBuilder.createSuccessEmbed(`â­ï¸ **${currentTrack.title}** a été passée.`);
        await this.safeReply(interaction, { embeds: [embed] });
    }

    async stop(interaction) {
        console.log('â¹ï¸ [COMMAND_STOP] Commande stop reçue');
        console.log(`   ðŸ‘¤ Utilisateur: ${interaction.user.tag} (${interaction.user.id})`);
        console.log(`   ðŸ  Serveur: ${interaction.guild.name} (${interaction.guild.id})`);
        
        const queue = this.player.nodes.get(interaction.guild.id);
        
        if (!queue) {
            console.log('   âŒ Aucune queue trouvée');
            const embed = MusicEmbedBuilder.createErrorEmbed('Aucune musique en cours de lecture !');
            return this.safeReply(interaction, { embeds: [embed], flags: 64 }); // MessageFlags.Ephemeral
        }

        console.log(`   🎵 Track actuel: ${queue.currentTrack?.title || 'Aucun'}`);
        console.log(`   ðŸ“Š Tracks dans la queue: ${queue.tracks.size}`);
        
        queue.node.stop();
        console.log('   ✅ Lecture arrêtée et queue vidée');
        
        const embed = MusicEmbedBuilder.createSuccessEmbed('â¹ï¸ Lecture arrêtée et file d\'attente vidée.');
        await this.safeReply(interaction, { embeds: [embed] });
    }

    async pause(interaction) {
        console.log('â¸ï¸ [COMMAND_PAUSE] Commande pause reçue');
        console.log(`   ðŸ‘¤ Utilisateur: ${interaction.user.tag} (${interaction.user.id})`);
        console.log(`   ðŸ  Serveur: ${interaction.guild.name} (${interaction.guild.id})`);
        
        const queue = this.player.nodes.get(interaction.guild.id);
        
        if (!queue || !queue.node.isPlaying()) {
            console.log('   âŒ Aucune queue trouvée ou pas en cours de lecture');
            const embed = MusicEmbedBuilder.createErrorEmbed('Aucune musique en cours de lecture !');
            return this.safeReply(interaction, { embeds: [embed], flags: 64 }); // MessageFlags.Ephemeral
        }

        console.log(`   🎵 Track actuel: ${queue.currentTrack?.title || 'Aucun'}`);
        console.log(`   ðŸ“Š Ã‰tat: ${queue.node.isPaused() ? 'DéjÃ  en pause' : 'En lecture'}`);
        
        queue.node.pause();
        console.log('   ✅ Lecture mise en pause');
        
        const embed = MusicEmbedBuilder.createSuccessEmbed('â¸ï¸ Lecture mise en pause.');
        await this.safeReply(interaction, { embeds: [embed] });
    }

    async resume(interaction) {
        console.log('▶️ [COMMAND_RESUME] Commande resume reçue');
        console.log(`   ðŸ‘¤ Utilisateur: ${interaction.user.tag} (${interaction.user.id})`);
        console.log(`   ðŸ  Serveur: ${interaction.guild.name} (${interaction.guild.id})`);
        
        const queue = this.player.nodes.get(interaction.guild.id);
        
        if (!queue || !queue.node.isPaused()) {
            console.log('   âŒ Aucune queue trouvée ou pas en pause');
            const embed = MusicEmbedBuilder.createErrorEmbed('Aucune musique en pause !');
            return this.safeReply(interaction, { embeds: [embed], flags: 64 }); // MessageFlags.Ephemeral
        }

        console.log(`   🎵 Track actuel: ${queue.currentTrack?.title || 'Aucun'}`);
        console.log(`   ðŸ“Š Ã‰tat: En pause`);
        
        queue.node.resume();
        console.log('   ✅ Lecture reprise');
        
        const embed = MusicEmbedBuilder.createSuccessEmbed('▶️ Lecture reprise.');
        await this.safeReply(interaction, { embeds: [embed] });
    }

    async setVolume(interaction, volume) {
        const queue = this.player.nodes.get(interaction.guild.id);
        
        if (!queue) {
            const embed = MusicEmbedBuilder.createErrorEmbed('Aucune musique en cours de lecture !');
            return this.safeReply(interaction, { embeds: [embed], flags: 64 }); // MessageFlags.Ephemeral
        }

        if (volume < 0 || volume > 100) {
            const embed = MusicEmbedBuilder.createErrorEmbed('Le volume doit être entre 0 et 100 !');
            return this.safeReply(interaction, { embeds: [embed], flags: 64 }); // MessageFlags.Ephemeral
        }

        queue.node.setVolume(volume);
        
        // Sauvegarder le volume par défaut pour ce serveur
        this.serverConfigs[interaction.guild.id].volume = volume;
        this.saveServerConfigs();

        const embed = MusicEmbedBuilder.createSuccessEmbed(`ðŸ”Š Volume réglé Ã  **${volume}%**`);
        await this.safeReply(interaction, { embeds: [embed] });
        this.logAction(interaction.guild.id, interaction.user, 'volume', `${volume}%`);
    }

    async showQueue(interaction, page = 1) {
        const queue = this.player.nodes.get(interaction.guild.id);
        
        if (!queue || (!queue.currentTrack && queue.tracks.data.length === 0)) {
            const embed = MusicEmbedBuilder.createErrorEmbed('Aucune musique dans la file d\'attente.');
            return this.safeReply(interaction, { embeds: [embed], flags: 64 }); // MessageFlags.Ephemeral
        }

        const embed = MusicEmbedBuilder.createQueueEmbed(queue, page);
        const totalPages = Math.ceil(queue.tracks.data.length / 10);
        const buttons = MusicEmbedBuilder.createQueueButtons(page, totalPages);

        await this.safeReply(interaction, { 
            embeds: [embed], 
            components: buttons, 
            flags: 64 // MessageFlags.Ephemeral
        });
    }

    async nowPlaying(interaction) {
        const queue = this.player.nodes.get(interaction.guild.id);
        
        if (!queue || !queue.currentTrack) {
            const embed = MusicEmbedBuilder.createErrorEmbed('Aucune musique n\'est en cours de lecture.');
            return this.safeReply(interaction, { embeds: [embed], flags: 64 }); // MessageFlags.Ephemeral
        }

        const embed = MusicEmbedBuilder.createNowPlayingEmbed(queue.currentTrack, queue);
        const buttons = MusicEmbedBuilder.createPlayerButtons(queue);

        await this.safeReply(interaction, { 
            embeds: [embed], 
            components: buttons 
        });
    }

    async setLoop(interaction, mode) {
        const queue = this.player.nodes.get(interaction.guild.id);
        
        if (!queue) {
            const embed = MusicEmbedBuilder.createErrorEmbed('Aucune musique en cours de lecture !');
            return this.safeReply(interaction, { embeds: [embed], flags: 64 }); // MessageFlags.Ephemeral
        }

        const modes = {
            'off': 0,
            'track': 1,
            'queue': 2
        };

        if (!modes.hasOwnProperty(mode.toLowerCase())) {
            const embed = MusicEmbedBuilder.createErrorEmbed('Mode invalide ! Utilisez: off, track, ou queue');
            return this.safeReply(interaction, { embeds: [embed], flags: 64 }); // MessageFlags.Ephemeral
        }

        const loopMode = modes[mode.toLowerCase()];
        queue.setRepeatMode(loopMode);
        
        const modeText = MusicEmbedBuilder.getLoopModeText(loopMode);
        const embed = MusicEmbedBuilder.createSuccessEmbed(`ðŸ” Mode de répétition : **${modeText}**`);
        await this.safeReply(interaction, { embeds: [embed] });
    }

    async disconnect(interaction) {
        const queue = this.player.nodes.get(interaction.guild.id);
        
        if (!queue) {
            const embed = MusicEmbedBuilder.createErrorEmbed('Le bot n\'est pas connecté !');
            return this.safeReply(interaction, { embeds: [embed], flags: 64 }); // MessageFlags.Ephemeral
        }

        queue.node.stop();

        const embed = MusicEmbedBuilder.createSuccessEmbed('ðŸ‘‹ Le bot a été déconnecté du salon vocal.');
        await this.safeReply(interaction, { embeds: [embed] });
    }

    async sendErrorEmbed(interaction, message) {
        const embed = MusicEmbedBuilder.createErrorEmbed(message);
        return await this.safeReply(interaction, { embeds: [embed], flags: 64 }); // MessageFlags.Ephemeral
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
            console.error('âŒ [REPLY_ERROR] Erreur lors de la réponse Ã  l\'interaction:');
            console.error(`   ðŸ‘¤ Utilisateur: ${interaction.user.tag} (${interaction.user.id})`);
            console.error(`   ðŸ  Serveur: ${interaction.guild?.name || 'DM'} (${interaction.guild?.id || 'N/A'})`);
            console.error(`   ðŸ“ Canal: ${interaction.channel?.name || 'Inconnu'} (${interaction.channel?.id || 'N/A'})`);
            console.error(`   ðŸ”„ Ã‰tat: replied=${interaction.replied}, deferred=${interaction.deferred}`);
            console.error(`   âš ï¸ Erreur:`, error);
            // Tentative de fallback avec followUp si possible
            if (!interaction.replied && !interaction.deferred) {
                try {
                    return await interaction.reply({ 
                        content: 'Une erreur est survenue lors du traitement de votre demande.', 
                        flags: 64 // MessageFlags.Ephemeral 
                    });
                } catch (fallbackError) {
                    console.error('âŒ [FALLBACK_ERROR] Erreur lors du fallback de réponse:');
                    console.error(`   ðŸ‘¤ Utilisateur: ${interaction.user.tag} (${interaction.user.id})`);
                    console.error(`   âš ï¸ Erreur:`, fallbackError);
                }
            }
        }
    }

    async sendNowPlayingEmbed(queue, track) {
        try {
            const embed = MusicEmbedBuilder.createNowPlayingEmbed(track, queue);
            const message = await queue.metadata.channel.send({ embeds: [embed] });
            
            // Stocker le message pour pouvoir le supprimer plus tard
            if (!this.nowPlayingMessages) {
                this.nowPlayingMessages = new Map();
            }
            this.nowPlayingMessages.set(queue.guild.id, message);
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'embed now playing:', error);
        }
    }

    deleteNowPlayingMessage(guildId) {
        try {
            if (this.nowPlayingMessages && this.nowPlayingMessages.has(guildId)) {
                const message = this.nowPlayingMessages.get(guildId);
                if (message && message.deletable) {
                    message.delete().catch(console.error);
                }
                this.nowPlayingMessages.delete(guildId);
            }
        } catch (error) {
            console.error('Erreur lors de la suppression du message now playing:', error);
        }
    }

    async logAction(guildId, user, action, details = '') {
        try {
            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                guildId,
                userId: user.id,
                username: user.username,
                action,
                details
            };
            
            console.log(`[MUSIC LOG] ${timestamp} - ${user.username} (${user.id}) - ${action}: ${details}`);
            
            // Envoyer un embed de log dans le salon de logs si configuré
            await this.sendMusicLogEmbed(guildId, user, action, details);
            
            // Optionnel : sauvegarder dans un fichier de logs
            // fs.appendFileSync('music-logs.txt', JSON.stringify(logEntry) + '\n');
        } catch (error) {
            console.error('âŒ Erreur lors de l\'écriture du log musical:', error);
        }
    }

    /**
     * Envoie un embed de log musical dans le salon de logs configuré
     */
    async sendMusicLogEmbed(guildId, user, action, details) {
        try {
            // Vérifier si un salon de logs est configuré
            const serversPath = path.join(process.cwd(), 'json', 'servers.json');
            if (!fs.existsSync(serversPath)) return;

            const serversData = JSON.parse(fs.readFileSync(serversPath, 'utf8'));
            const serverConfig = serversData[guildId];
            
            if (!serverConfig || !serverConfig.logChannelId) return;

            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) return;

            const logChannel = guild.channels.cache.get(serverConfig.logChannelId);
            if (!logChannel) return;

            // Créer l'embed de log musical
            const embed = new EmbedBuilder()
                .setTitle('🎵 Log musique')
                .setColor('#00ff00')
                .addFields(
                    {
                        name: 'ðŸ‘¤ Utilisateur',
                        value: `<@${user.id}>`,
                        inline: true
                    },
                    {
                        name: 'ðŸŽ¯ Action',
                        value: action,
                        inline: true
                    },
                    {
                        name: 'ðŸ“ Détails',
                        value: details || 'Aucun détail',
                        inline: false
                    }
                )
                .setTimestamp()
                .setFooter({
                    text: `ID: ${user.id}`,
                    iconURL: user.displayAvatarURL()
                });

            await logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('âŒ Erreur lors de l\'envoi du log musical:', error);
        }
    }

    /**
     * Vérifie si une musique est déjÃ  dans la queue pour éviter les doublons
     */
    isDuplicateTrack(queue, newTrack) {
        // Vérifier la musique en cours
        if (queue.currentTrack && queue.currentTrack.url === newTrack.url) {
            return true;
        }

        // Vérifier les musiques en attente
        return queue.tracks.data.some(track => track.url === newTrack.url);
    }

    /**
     * Recule dans la musique actuelle
     */
    async seekBackward(interaction) {
        const queue = this.player.nodes.get(interaction.guild.id);
        
        if (!queue || !queue.currentTrack) {
            return interaction.reply({
                content: 'âŒ Aucune musique en cours de lecture !',
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        const member = interaction.member;
        if (!member.voice.channel) {
            return interaction.reply({
                content: 'âŒ Vous devez être dans un salon vocal !',
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        if (queue.channel.id !== member.voice.channel.id) {
            return interaction.reply({
                content: 'âŒ Vous devez être dans le même salon vocal que le bot !',
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        const seconds = interaction.options?.getInteger('secondes') || 10;
        const currentPosition = queue.node.getTimestamp().current.value;
        const newPosition = Math.max(0, currentPosition - (seconds * 1000));

        try {
            await queue.node.seek(newPosition);
            
            const embed = new EmbedBuilder()
                .setColor('#4CAF50')
                .setTitle('âª Retour en arrière')
                .setDescription(`Retour de **${seconds}** secondes dans la musique`)
                .addFields({
                    name: '🎵 Musique',
                    value: queue.currentTrack.title,
                    inline: false
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            
            // Log de l'action
            this.logMusicAction(interaction.user, 'Retour en arrière', `${seconds} secondes`);
        } catch (error) {
            console.error('âŒ Erreur lors du retour en arrière:', error);
            await interaction.reply({
                content: 'âŒ Impossible de reculer dans cette musique !',
                flags: 64 // MessageFlags.Ephemeral
            });
        }
    }

    /**
     * Avance dans la musique actuelle
     */
    async seekForward(interaction) {
        const queue = this.player.nodes.get(interaction.guild.id);
        
        if (!queue || !queue.currentTrack) {
            return interaction.reply({
                content: 'âŒ Aucune musique en cours de lecture !',
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        const member = interaction.member;
        if (!member.voice.channel) {
            return interaction.reply({
                content: 'âŒ Vous devez être dans un salon vocal !',
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        if (queue.channel.id !== member.voice.channel.id) {
            return interaction.reply({
                content: 'âŒ Vous devez être dans le même salon vocal que le bot !',
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        const seconds = interaction.options?.getInteger('secondes') || 10;
        const currentPosition = queue.node.getTimestamp().current.value;
        const trackDuration = queue.currentTrack.durationMS;
        const newPosition = Math.min(trackDuration - 1000, currentPosition + (seconds * 1000));

        try {
            await queue.node.seek(newPosition);
            
            const embed = new EmbedBuilder()
                .setColor('#4CAF50')
                .setTitle('â© Avance rapide')
                .setDescription(`Avance de **${seconds}** secondes dans la musique`)
                .addFields({
                    name: '🎵 Musique',
                    value: queue.currentTrack.title,
                    inline: false
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            
            // Log de l'action
            this.logMusicAction(interaction.user, 'Avance rapide', `${seconds} secondes`);
        } catch (error) {
            console.error('âŒ Erreur lors de l\'avance rapide:', error);
            await interaction.reply({
                content: 'âŒ Impossible d\'avancer dans cette musique !',
                flags: 64 // MessageFlags.Ephemeral
            });
        }
    }

    /**
     * Active/désactive un filtre audio
     */
    async toggleFilter(interaction, filterName) {
        const queue = this.player.nodes.get(interaction.guild.id);
        
        if (!queue || !queue.currentTrack) {
            return interaction.reply({
                content: 'âŒ Aucune musique en cours de lecture !',
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        const member = interaction.member;
        if (!member.voice.channel) {
            return interaction.reply({
                content: 'âŒ Vous devez être dans un salon vocal !',
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        if (queue.channel.id !== member.voice.channel.id) {
            return interaction.reply({
                content: 'âŒ Vous devez être dans le même salon vocal que le bot !',
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        try {
            const filters = queue.filters.ffmpeg;
            const isEnabled = filters.filters.includes(filterName);
            
            if (isEnabled) {
                await filters.setFilters([]);
            } else {
                await filters.setFilters([filterName]);
            }

            const filterNames = {
                'bassboost': 'Bass Boost ðŸ”Š',
                'vaporwave': 'Ralenti (Vaporwave) ðŸŒŠ',
                'nightcore': 'Accéléré (Nightcore) âš¡'
            };

            const displayName = filterNames[filterName] || filterName;
            const status = isEnabled ? 'désactivé' : 'activé';
            const emoji = isEnabled ? 'âŒ' : '✅';

            const embed = new EmbedBuilder()
                .setColor(isEnabled ? '#ff6b6b' : '#4CAF50')
                .setTitle(`${emoji} Filtre ${status}`)
                .setDescription(`Le filtre **${displayName}** a été ${status}`)
                .addFields({
                    name: '🎵 Musique',
                    value: queue.currentTrack.title,
                    inline: false
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            
            // Log de l'action
            this.logMusicAction(interaction.user, `Filtre ${status}`, displayName);
        } catch (error) {
            console.error(`âŒ Erreur lors de l'application du filtre ${filterName}:`, error);
            await interaction.reply({
                content: 'âŒ Impossible d\'appliquer ce filtre !',
                flags: 64 // MessageFlags.Ephemeral
            });
        }
    }

    /**
     * Gère les interactions avec le panel de musique
     */
    async handlePanelInteraction(interaction) {
        return await this.panelHandler.handleMusicPanelInteraction(interaction);
    }

    /**
     * Obtient le gestionnaire de panel
     */
    getPanelManager() {
        return this.panelManager;
    }
}

export default QueueManager;

