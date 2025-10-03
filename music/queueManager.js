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
            skipFFmpeg: false,
            ytdlOptions: {
                quality: 'highestaudio',
                filter: 'audioonly'
            }
        });
        this.nowPlayingMessages = new Map();
        
        // Initialisation du panel de musique
        this.panelManager = new MusicPanelManager(client);
        this.panelHandler = new MusicPanelHandler(client, this, this.panelManager);
        
        console.log('🚀 Initialisation du QueueManager...');
        this.setupPlayer().catch(error => {
            console.error('❌ Erreur lors de l\'initialisation du player:', error);
        });
        this.loadServerConfigs();
    }

    async setupPlayer() {
        // Configuration du player - Extracteurs
        console.log('🔧 Chargement des extracteurs...');
        try {
            // Charger les extracteurs par défaut
            await this.player.extractors.loadMulti(DefaultExtractors);
            console.log('✅ Extracteurs par défaut chargés avec succès');
            
            // Enregistrer YoutubeiExtractor pour YouTube
            await this.player.extractors.register(YoutubeiExtractor, {});
            console.log('✅ YoutubeiExtractor enregistré pour YouTube');
            
        } catch (error) {
            console.error('❌ Erreur lors du chargement des extracteurs:', error);
        }
        
        // Événements du player
        this.player.events.on('debug', (message) => {
            console.log('🐛 [PLAYER_DEBUG]', message);
        });

        this.player.events.on('playerStart', (queue, track) => {
            console.log('▶️ [PLAYER_START] Démarrage de la lecture');
            console.log(`   🎵 Track: ${track.title}`);
            console.log(`   👤 Artiste: ${track.author}`);
            console.log(`   🏠 Serveur: ${queue.guild.name} (${queue.guild.id})`);
            console.log(`   📊 Queue: ${queue.tracks.size} tracks en attente`);
            console.log(`   🔊 Volume: ${queue.node.volume}%`);
            console.log(`   🎧 État de connexion: ${queue.connection?.state?.status || 'Inconnu'}`);
            console.log(`   🎼 État du player: ${queue.node.isPlaying() ? 'En lecture' : 'Arrêté'}`);
            
            // Utiliser le nouveau panel de musique
            this.panelManager.createOrUpdatePanel(queue, track, queue.metadata.channel);
        });

        this.player.events.on('playerFinish', (queue, track) => {
            console.log('ℹ️ [PLAYER_FINISH] Fin de lecture');
            console.log(`   🎵 Track terminé: ${track.title}`);
            console.log(`   🏠 Serveur: ${queue.guild.name} (${queue.guild.id})`);
            console.log(`   📊 Tracks restants: ${queue.tracks.data.length}`);
            
            // Mettre à jour le panel si il y a encore des musiques
            if (queue.tracks.data.length > 0) {
                console.log(`   ⭐ Passage au track suivant dans 1 seconde...`);
                const delay = Math.max(1000, 1000); // S'assurer que le délai est positif
                setTimeout(() => {
                    if (queue.currentTrack) {
                        console.log(`   ✅ Mise à jour du panel pour: ${queue.currentTrack.title}`);
                        this.panelManager.createOrUpdatePanel(queue, queue.currentTrack, queue.metadata.channel);
                    }
                }, delay);
            } else {
                console.log(`   🔭 Aucun track suivant`);
            }
        });

        this.player.events.on('emptyQueue', (queue) => {
            console.log('🔭 [EMPTY_QUEUE] Queue vide');
            console.log(`   🏠 Serveur: ${queue.guild.name} (${queue.guild.id})`);
            console.log(`   📍 Canal: ${queue.metadata.channel.name}`);
            
            // Afficher le panel arrêté
            this.panelManager.updateStoppedPanel(queue.guild.id, 'File d\'attente terminée');
            const embed = new EmbedBuilder()
                .setColor('#ff6b6b')
                .setTitle('🎵 Queue terminée')
                .setDescription('Toutes les musiques ont été jouées !')
                .setTimestamp();
            
            queue.metadata.channel.send({ embeds: [embed] }).catch(err => {
                console.error('❌ Impossible d\'envoyer le message de queue terminée:', err.message);
            });
        });

        this.player.events.on('error', (queue, error) => {
            console.error('❌ [PLAYER_ERROR] Erreur du player');
            console.error(`   🏠 Serveur: ${queue?.guild?.name || 'Inconnu'} (${queue?.guild?.id || 'Inconnu'})`);
            console.error(`   📍 Canal: ${queue?.metadata?.channel?.name || 'Inconnu'}`);
            console.error(`   🎵 Track actuel: ${queue?.currentTrack?.title || 'Aucun'}`);
            console.error(`   ❌ Erreur: ${error.message}`);
            if (error.stack) {
                console.error(`   📊 Stack trace:`);
                console.error(error.stack);
            }
            
            const embed = new EmbedBuilder()
                .setColor('#ff6b6b')
                .setTitle('❌ Erreur')
                .setDescription(`Une erreur s'est produite: ${error.message}`)
                .setTimestamp();
            
            if (queue?.metadata?.channel) {
                queue.metadata.channel.send({ embeds: [embed] }).catch(err => {
                    console.error('❌ Impossible d\'envoyer le message d\'erreur:', err.message);
                });
            }
        });

        // Événement pour les problèmes de connexion
        this.player.events.on('connectionError', (queue, error) => {
            console.error('🔌 [CONNECTION_ERROR] Erreur de connexion audio');
            console.error(`   🏠 Serveur: ${queue?.guild?.name || 'Inconnu'} (${queue?.guild?.id || 'Inconnu'})`);
            console.error(`   ❌ Erreur de connexion: ${error.message}`);
            if (error.stack) {
                console.error(`   📊 Stack trace:`);
                console.error(error.stack);
            }
        });

        // Event spécifique pour les erreurs de lecture audio
        this.player.events.on('playerError', (queue, error) => {
            console.error('🔊 [PLAYER_ERROR] Erreur de lecture audio');
            console.error(`   🏠 Serveur: ${queue?.guild?.name || 'Inconnu'} (${queue?.guild?.id || 'Inconnu'})`);
            console.error(`   🎵 Track: ${queue?.currentTrack?.title || 'Aucun'}`);
            console.error(`   🔗 URL: ${queue?.currentTrack?.url || 'Aucune'}`);
            console.error(`   ❌ Erreur Player: ${error.message}`);
            console.error(`   📊 Type d'erreur: ${error.name}`);
            if (error.stack) {
                console.error(`   📊 Stack trace:`);
                console.error(error.stack);
            }
            
            // Tentative de skip automatique en cas d'erreur
            if (queue && queue.tracks.data.length > 0) {
                console.log('⭐ Tentative de skip automatique...');
                try {
                    queue.node.skip();
                } catch (skipError) {
                    console.error('❌ Impossible de skip:', skipError.message);
                }
            }
        });

        // Événement pour détecter l'ajout de tracks
        this.player.events.on('audioTrackAdd', (queue, track) => {
            console.log('➕ [TRACK_ADD] Track ajouté à la queue');
            console.log(`   🎵 Track: ${track.title}`);
            console.log(`   🏠 Serveur: ${queue.guild.name} (${queue.guild.id})`);
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
            console.error('❌ [CONFIG_ERROR] Erreur lors du chargement des configs serveur:');
            console.error(`   📍 Chemin: ${configPath}`);
            console.error(`   ⚠️ Erreur:`, error);
            this.serverConfigs = {};
        }
    }

    saveServerConfigs() {
        const configPath = path.join(process.cwd(), 'json', 'servers.json');
        try {
            fs.writeFileSync(configPath, JSON.stringify(this.serverConfigs, null, 2));
        } catch (error) {
            console.error('❌ [CONFIG_SAVE_ERROR] Erreur lors de la sauvegarde des configs serveur:');
            console.error(`   📍 Chemin: ${configPath}`);
            console.error(`   ⚠️ Erreur:`, error);
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

    // Méthode utilitaire pour répondre en toute sécurité
    async safeReply(interaction, options) {
        try {
            if (interaction.deferred && !interaction.replied) {
                return await interaction.editReply(options);
            } else if (!interaction.replied && !interaction.deferred) {
                return await interaction.reply(options);
            }
        } catch (error) {
            if (error.code === 10062) {
                console.log('⚠️ Interaction expirée - impossible de répondre');
                return null;
            }
            console.error('❌ Erreur lors de la réponse à l\'interaction:', error.message);
        }
    }

    // Méthode utilitaire pour envoyer un embed d'erreur
    async sendErrorEmbed(interaction, message) {
        const embed = new EmbedBuilder()
            .setColor('#ff6b6b')
            .setTitle('❌ Erreur')
            .setDescription(message)
            .setTimestamp();
        
        return this.safeReply(interaction, { embeds: [embed] });
    }

    // Méthodes de contrôle de la musique simplifiées
    async play(interaction, query) {
        console.log(`🎵 [PLAY] Nouvelle demande de lecture`);
        console.log(`   👤 Utilisateur: ${interaction.user.tag} (${interaction.user.id})`);
        console.log(`   🏠 Serveur: ${interaction.guild.name} (${interaction.guild.id})`);
        console.log(`   📍 Requête: "${query}"`);

        const member = interaction.member;
        const channel = member.voice.channel;

        if (!channel) {
            return this.sendErrorEmbed(interaction, 'Vous devez être dans un salon vocal pour utiliser cette commande !');
        }

        const permissions = channel.permissionsFor(interaction.client.user);
        if (!permissions.has(['Connect', 'Speak'])) {
            return this.sendErrorEmbed(interaction, 'Je n\'ai pas les permissions pour rejoindre ou parler dans ce salon vocal !');
        }

        // Vérifier si l'interaction est encore valide
        if (!interaction.deferred && !interaction.replied) {
            console.log('⚠️ Interaction non différée - tentative de différer...');
            try {
                await interaction.deferReply();
            } catch (error) {
                if (error.code === 10062) {
                    console.log('❌ Interaction expirée - abandon');
                    return;
                }
                throw error;
            }
        }

        try {
            console.log('🔍 Recherche YouTube pour:', query);
            const searchResult = await this.player.search(query, {
                requestedBy: interaction.user,
                searchEngine: QueryType.YOUTUBE_SEARCH
            });

            if (!searchResult || !searchResult.tracks || searchResult.tracks.length === 0) {
                return this.sendErrorEmbed(interaction, `Aucun résultat trouvé pour: ${query}`);
            }

            const serverConfig = this.getServerConfig(interaction.guild.id);
            const queue = this.player.nodes.create(interaction.guild, {
                metadata: {
                    channel: interaction.channel,
                    client: interaction.guild.members.me,
                    requestedBy: interaction.user
                },
                selfDeaf: true,
                volume: serverConfig.volume,
                leaveOnEmpty: false,
                leaveOnEnd: false
            });

            try {
                if (!queue.connection) {
                    console.log('🔌 Connexion au salon vocal...');
                    await queue.connect(channel);
                    console.log('✅ Connecté au salon vocal avec succès');
                    
                    // Vérifier l'état de la connexion
                    setTimeout(() => {
                        if (queue.connection) {
                            console.log(`🎧 État de connexion: ${queue.connection.state.status}`);
                            console.log(`🔊 Prêt pour la lecture audio`);
                        }
                    }, 1000);
                }
            } catch (connectionError) {
                console.error('❌ [CONNECTION_ERROR] Erreur de connexion vocale:', connectionError);
                this.player.nodes.delete(interaction.guild.id);
                return this.sendErrorEmbed(interaction, 'Impossible de rejoindre le salon vocal !');
            }

            if (searchResult.playlist) {
                queue.addTrack(searchResult.tracks);
                const embed = new EmbedBuilder()
                    .setColor('#4ecdc4')
                    .setTitle('📋 Playlist ajoutée')
                    .setDescription(`**${searchResult.playlist.title}** a été ajoutée à la queue\n🎵 **${searchResult.tracks.length}** musiques ajoutées`)
                    .setThumbnail(searchResult.playlist.thumbnail)
                    .addFields(
                        { name: '👤 Demandé par', value: interaction.user.toString(), inline: true }
                    )
                    .setTimestamp();

                await this.safeReply(interaction, { embeds: [embed] });
            } else {
                queue.addTrack(searchResult.tracks[0]);
                
                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('🎶 Musique ajoutée à la queue')
                    .setDescription(`**${searchResult.tracks[0].title}**`)
                    .addFields(
                        { name: '⏱️ Durée', value: searchResult.tracks[0].duration || 'Inconnu', inline: true },
                        { name: '👤 Demandé par', value: interaction.user.toString(), inline: true }
                    )
                    .setThumbnail(searchResult.tracks[0].thumbnail || null);

                await this.safeReply(interaction, { embeds: [embed] });
            }

            if (!queue.node.isPlaying()) {
                console.log('▶️ Démarrage de la lecture...');
                console.log(`   🎵 Track à jouer: ${searchResult.tracks[0].title}`);
                console.log(`   🔗 URL: ${searchResult.tracks[0].url}`);
                try {
                    await queue.node.play();
                    console.log('✅ Lecture démarrée avec succès');
                    
                    // Vérifier après 2 secondes si la lecture a vraiment commencé
                    setTimeout(() => {
                        if (queue.node.isPlaying()) {
                            console.log('🎶 Confirmation: Audio en cours de lecture');
                        } else {
                            console.log('⚠️ Attention: La lecture ne semble pas avoir commencé');
                        }
                    }, 2000);
                } catch (playError) {
                    console.error('❌ Erreur lors du démarrage de la lecture:', playError);
                    return this.sendErrorEmbed(interaction, 'Erreur lors du démarrage de la lecture !');
                }
            }

        } catch (error) {
            console.error('❌ Erreur lors de la lecture:', error);
            return this.sendErrorEmbed(interaction, 'Une erreur s\'est produite lors de la lecture de la musique !');
        }
    }

    async skip(interaction) {
        const queue = this.player.nodes.get(interaction.guild.id);
        
        if (!queue || !queue.currentTrack) {
            return this.sendErrorEmbed(interaction, 'Aucune musique à passer !');
        }

        const currentTrack = queue.currentTrack;
        queue.node.skip();
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('⭐ Musique passée')
            .setDescription(`**${currentTrack.title}** a été passée.`)
            .setTimestamp();
        
        await this.safeReply(interaction, { embeds: [embed] });
    }

    async stop(interaction) {
        const queue = this.player.nodes.get(interaction.guild.id);
        
        if (!queue) {
            return this.sendErrorEmbed(interaction, 'Aucune musique en cours de lecture !');
        }

        queue.node.stop();
        
        const embed = new EmbedBuilder()
            .setColor('#ff6b6b')
            .setTitle('⏹️ Lecture arrêtée')
            .setDescription('Lecture arrêtée et file d\'attente vidée.')
            .setTimestamp();
        
        await this.safeReply(interaction, { embeds: [embed] });
    }

    async pause(interaction) {
        const queue = this.player.nodes.get(interaction.guild.id);
        
        if (!queue || !queue.node.isPlaying()) {
            return this.sendErrorEmbed(interaction, 'Aucune musique en cours de lecture !');
        }

        queue.node.pause();
        
        const embed = new EmbedBuilder()
            .setColor('#ffff00')
            .setTitle('⏸️ Lecture en pause')
            .setDescription('Lecture mise en pause.')
            .setTimestamp();
        
        await this.safeReply(interaction, { embeds: [embed] });
    }

    async resume(interaction) {
        const queue = this.player.nodes.get(interaction.guild.id);
        
        if (!queue || !queue.node.isPaused()) {
            return this.sendErrorEmbed(interaction, 'Aucune musique en pause !');
        }

        queue.node.resume();
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('▶️ Lecture reprise')
            .setDescription('Lecture reprise.')
            .setTimestamp();
        
        await this.safeReply(interaction, { embeds: [embed] });
    }

    // Méthode pour logger les actions
    async logAction(guildId, user, action, details) {
        const config = this.getServerConfig(guildId);
        if (!config.logsEnabled || !config.logChannelId) return;

        try {
            const guild = this.client.guilds.cache.get(guildId);
            const logChannel = guild?.channels.cache.get(config.logChannelId);
            
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('🎵 Action Musique')
                    .addFields(
                        { name: '👤 Utilisateur', value: user.toString(), inline: true },
                        { name: '🎯 Action', value: action, inline: true },
                        { name: '📝 Détails', value: details, inline: false }
                    )
                    .setTimestamp();

                await logChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('❌ Erreur lors du logging:', error.message);
        }
    }
}

export default QueueManager;