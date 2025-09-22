import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

class MusicPanelManager {
    constructor(client) {
        this.client = client;
        this.activePanels = new Map(); // guildId -> { message, channel }
    }

    /**
     * Crée ou met à jour le panel de musique pour un serveur
     */
    async createOrUpdatePanel(queue, track, channel) {
        const guildId = queue.guild.id;
        
        try {
            const embed = this.createNowPlayingEmbed(queue, track);
            const components = this.createMusicButtons(queue);

            // Vérifier s'il y a déjà un panel actif
            const existingPanel = this.activePanels.get(guildId);
            
            if (existingPanel && existingPanel.message) {
                try {
                    // Mettre à jour le panel existant
                    await existingPanel.message.edit({
                        embeds: [embed],
                        components: components
                    });
                    return existingPanel.message;
                } catch (error) {
                    console.log('🔄 Panel existant non modifiable, création d\'un nouveau...');
                    // Si l'édition échoue, supprimer l'ancien et créer un nouveau
                    this.activePanels.delete(guildId);
                }
            }

            // Créer un nouveau panel
            const message = await channel.send({
                embeds: [embed],
                components: components
            });

            // Sauvegarder le panel actif
            this.activePanels.set(guildId, {
                message: message,
                channel: channel
            });

            return message;
        } catch (error) {
            console.error('❌ Erreur lors de la création/mise à jour du panel:', error);
            return null;
        }
    }

    /**
     * Crée l'embed "Now Playing"
     */
    createNowPlayingEmbed(queue, track) {
        const embed = new EmbedBuilder()
            .setTitle('🎶 Lecture en cours')
            .setColor(this.getEmbedColor(queue))
            .setThumbnail(track.thumbnail)
            .setTimestamp();

        // Titre avec lien cliquable
        embed.addFields({
            name: '🎵 **Titre**',
            value: `[${track.title}](${track.url})`,
            inline: false
        });

        // Barre de progression et durée
        const progressBar = this.createProgressBar(queue, track);
        embed.addFields({
            name: '⏱️ **Durée**',
            value: progressBar,
            inline: false
        });

        // File d'attente
        const queueSize = queue.tracks.data.length;
        embed.addFields({
            name: '🎼 **File d\'attente**',
            value: queueSize > 0 ? `${queueSize} musique(s) en attente` : 'Aucune musique en attente',
            inline: true
        });

        // Demandé par
        embed.addFields({
            name: '👤 **Demandé par**',
            value: `<@${track.requestedBy.id}>`,
            inline: true
        });

        // Volume
        embed.addFields({
            name: '🔊 **Volume**',
            value: `${queue.node.volume}%`,
            inline: true
        });

        // Mode de boucle
        const loopMode = this.getLoopModeText(queue);
        embed.addFields({
            name: '🔁 **Boucle**',
            value: loopMode,
            inline: true
        });

        // Footer avec source
        const source = this.getTrackSource(track);
        embed.setFooter({
            text: `Musique fournie par ${source}`,
            iconURL: this.client.user.displayAvatarURL()
        });

        return embed;
    }

    /**
     * Crée la barre de progression visuelle
     */
    createProgressBar(queue, track) {
        const current = queue.node.getTimestamp();
        const total = track.duration;
        
        if (!current || !total) {
            return `▶️ ░░░░░░░░░░ 0:00 / ${track.duration}`;
        }

        const currentMs = current.current.value;
        const totalMs = current.total.value;
        const progress = Math.floor((currentMs / totalMs) * 10);
        
        let bar = '';
        for (let i = 0; i < 10; i++) {
            bar += i < progress ? '█' : '░';
        }

        return `▶️ ${bar} ${current.current.label} / ${current.total.label}`;
    }

    /**
     * Crée les boutons du panel de musique
     */
    createMusicButtons(queue) {
        // Ligne 1: Contrôles principaux
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_pause')
                    .setLabel('Pause')
                    .setEmoji('⏸️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(queue.node.isPaused()),
                new ButtonBuilder()
                    .setCustomId('music_resume')
                    .setLabel('Reprendre')
                    .setEmoji('▶️')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(!queue.node.isPaused()),
                new ButtonBuilder()
                    .setCustomId('music_skip')
                    .setLabel('Skip')
                    .setEmoji('⏭️')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('music_stop')
                    .setLabel('Stop')
                    .setEmoji('⏹️')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('music_disconnect')
                    .setLabel('Déconnecter')
                    .setEmoji('❌')
                    .setStyle(ButtonStyle.Danger)
            );

        // Ligne 2: Options avancées
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_loop')
                    .setLabel('Loop')
                    .setEmoji('🔁')
                    .setStyle(this.getLoopButtonStyle(queue)),
                new ButtonBuilder()
                    .setCustomId('music_volume_up')
                    .setLabel('Volume +')
                    .setEmoji('🔊')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_volume_down')
                    .setLabel('Volume -')
                    .setEmoji('🔉')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_mute')
                    .setLabel(queue.node.volume === 0 ? 'Unmute' : 'Mute')
                    .setEmoji(queue.node.volume === 0 ? '🔊' : '🔇')
                    .setStyle(queue.node.volume === 0 ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_queue')
                    .setLabel('Queue')
                    .setEmoji('📜')
                    .setStyle(ButtonStyle.Secondary)
            );

        return [row1, row2];
    }

    /**
     * Met à jour le panel pour indiquer que la lecture est arrêtée
     */
    async updateStoppedPanel(guildId, reason = 'Lecture arrêtée') {
        const panel = this.activePanels.get(guildId);
        if (!panel || !panel.message) return;

        try {
            const embed = new EmbedBuilder()
                .setTitle('⏹️ Lecture arrêtée')
                .setDescription('Plus de musique dans la file d\'attente.')
                .setColor('#ff0000')
                .setTimestamp()
                .setFooter({
                    text: reason,
                    iconURL: this.client.user.displayAvatarURL()
                });

            await panel.message.edit({
                embeds: [embed],
                components: [] // Supprimer tous les boutons
            });

            // Supprimer le panel de la liste active après 30 secondes
            setTimeout(() => {
                this.activePanels.delete(guildId);
            }, 30000);

        } catch (error) {
            console.error('❌ Erreur lors de la mise à jour du panel arrêté:', error);
            this.activePanels.delete(guildId);
        }
    }

    /**
     * Obtient la couleur de l'embed selon l'état
     */
    getEmbedColor(queue) {
        if (queue.node.isPaused()) return '#ffff00'; // Jaune pour pause
        if (!queue.currentTrack) return '#ff0000'; // Rouge pour arrêt
        return '#00ff00'; // Vert pour lecture
    }

    /**
     * Obtient le texte du mode de boucle
     */
    getLoopModeText(queue) {
        switch (queue.repeatMode) {
            case 1: return '🔂 Musique';
            case 2: return '🔁 File d\'attente';
            default: return '❌ Désactivée';
        }
    }

    /**
     * Obtient le style du bouton de boucle
     */
    getLoopButtonStyle(queue) {
        switch (queue.repeatMode) {
            case 1: return ButtonStyle.Success; // Vert pour boucle musique
            case 2: return ButtonStyle.Primary; // Bleu pour boucle queue
            default: return ButtonStyle.Secondary; // Gris pour désactivé
        }
    }

    /**
     * Détermine la source de la musique
     */
    getTrackSource(track) {
        const url = track.url.toLowerCase();
        if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
        if (url.includes('soundcloud.com')) return 'SoundCloud';
        if (url.includes('spotify.com')) return 'Spotify';
        return 'Source inconnue';
    }

    /**
     * Supprime un panel actif
     */
    removePanel(guildId) {
        this.activePanels.delete(guildId);
    }

    /**
     * Obtient le panel actif d'un serveur
     */
    getActivePanel(guildId) {
        return this.activePanels.get(guildId);
    }
}

export default MusicPanelManager;



