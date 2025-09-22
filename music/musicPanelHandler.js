import { EmbedBuilder } from 'discord.js';

class MusicPanelHandler {
    constructor(client, queueManager, panelManager) {
        this.client = client;
        this.queueManager = queueManager;
        this.panelManager = panelManager;
    }

    /**
     * Gère les interactions avec les boutons du panel de musique
     */
    async handleMusicPanelInteraction(interaction) {
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith('music_')) return;

        await interaction.deferReply({ flags: 64 }); // MessageFlags.Ephemeral

        const queue = this.queueManager.player.nodes.get(interaction.guild.id);
        if (!queue || !queue.currentTrack) {
            return await interaction.editReply({
                content: '❌ Aucune musique n\'est en cours de lecture.',
                flags: 64 }); // MessageFlags.Ephemeral
        }

        // Vérifier si l'utilisateur est dans le même canal vocal
        const memberChannel = interaction.member.voice.channel;
        const botChannel = queue.channel;
        
        if (!memberChannel || memberChannel.id !== botChannel.id) {
            return await interaction.editReply({
                content: '❌ Vous devez être dans le même canal vocal que le bot.',
                flags: 64 }); // MessageFlags.Ephemeral
        }

        try {
            switch (interaction.customId) {
                case 'music_pause':
                    await this.handlePause(interaction, queue);
                    break;
                case 'music_resume':
                    await this.handleResume(interaction, queue);
                    break;
                case 'music_skip':
                    await this.handleSkip(interaction, queue);
                    break;
                case 'music_stop':
                    await this.handleStop(interaction, queue);
                    break;
                case 'music_disconnect':
                    await this.handleDisconnect(interaction, queue);
                    break;
                case 'music_loop':
                    await this.handleLoop(interaction, queue);
                    break;
                case 'music_volume_up':
                    await this.handleVolumeUp(interaction, queue);
                    break;
                case 'music_volume_down':
                    await this.handleVolumeDown(interaction, queue);
                    break;
                case 'music_mute':
                    await this.handleMute(interaction, queue);
                    break;
                case 'music_queue':
                    await this.handleShowQueue(interaction, queue);
                    break;
                default:
                    await interaction.editReply({
                        content: '❌ Action non reconnue.',
                        flags: 64 }); // MessageFlags.Ephemeral
            }
        } catch (error) {
            console.error('❌ Erreur lors du traitement de l\'interaction du panel:', error);
            await interaction.editReply({
                content: '❌ Une erreur est survenue lors de l\'exécution de cette action.',
                flags: 64 }); // MessageFlags.Ephemeral
        }
    }

    async handlePause(interaction, queue) {
        if (queue.node.isPaused()) {
            return await interaction.editReply({
                content: '⏸️ La musique est déjà en pause.',
                flags: 64 }); // MessageFlags.Ephemeral
        }

        queue.node.pause();
        await this.updatePanel(queue);
        await this.logAction(interaction.guild.id, interaction.user, '⏸️ Pause', queue.currentTrack.title);
        
        await interaction.editReply({
            content: '⏸️ Musique mise en pause.',
            flags: 64 }); // MessageFlags.Ephemeral
    }

    async handleResume(interaction, queue) {
        if (!queue.node.isPaused()) {
            return await interaction.editReply({
                content: '▶️ La musique n\'est pas en pause.',
                flags: 64 }); // MessageFlags.Ephemeral
        }

        queue.node.resume();
        await this.updatePanel(queue);
        await this.logAction(interaction.guild.id, interaction.user, '▶️ Reprise', queue.currentTrack.title);
        
        await interaction.editReply({
            content: '▶️ Musique reprise.',
            flags: 64 }); // MessageFlags.Ephemeral
    }

    async handleSkip(interaction, queue) {
        const currentTrack = queue.currentTrack;
        queue.node.skip();
        await this.logAction(interaction.guild.id, interaction.user, '⏭️ Skip', currentTrack.title);
        
        await interaction.editReply({
            content: `⏭️ Musique **${currentTrack.title}** passée.`,
            flags: 64 }); // MessageFlags.Ephemeral
    }

    async handleStop(interaction, queue) {
        const currentTrack = queue.currentTrack;
        queue.node.stop();
        await this.logAction(interaction.guild.id, interaction.user, '⏹️ Stop', currentTrack.title);
        
        await interaction.editReply({
            content: '⏹️ Lecture arrêtée et file d\'attente vidée.',
            flags: 64 }); // MessageFlags.Ephemeral
    }

    async handleDisconnect(interaction, queue) {
        queue.delete();
        this.panelManager.updateStoppedPanel(interaction.guild.id, 'Bot déconnecté');
        await this.logAction(interaction.guild.id, interaction.user, '❌ Déconnexion', 'Bot déconnecté du canal vocal');
        
        await interaction.editReply({
            content: '❌ Bot déconnecté du canal vocal.',
            flags: 64 }); // MessageFlags.Ephemeral
    }

    async handleLoop(interaction, queue) {
        let newMode;
        let modeText;

        switch (queue.repeatMode) {
            case 0: // Désactivé -> Boucle musique
                newMode = 1;
                modeText = '🔂 Boucle de la musique activée';
                break;
            case 1: // Boucle musique -> Boucle queue
                newMode = 2;
                modeText = '🔁 Boucle de la file d\'attente activée';
                break;
            case 2: // Boucle queue -> Désactivé
                newMode = 0;
                modeText = '❌ Boucle désactivée';
                break;
            default:
                newMode = 0;
                modeText = '❌ Boucle désactivée';
        }

        queue.setRepeatMode(newMode);
        await this.updatePanel(queue);
        await this.logAction(interaction.guild.id, interaction.user, '🔁 Loop', modeText);
        
        await interaction.editReply({
            content: modeText,
            flags: 64 }); // MessageFlags.Ephemeral
    }

    async handleVolumeUp(interaction, queue) {
        const currentVolume = queue.node.volume;
        const newVolume = Math.min(currentVolume + 10, 100);
        
        if (currentVolume >= 100) {
            return await interaction.editReply({
                content: '🔊 Le volume est déjà au maximum (100%).',
                flags: 64 }); // MessageFlags.Ephemeral
        }

        queue.node.setVolume(newVolume);
        await this.updatePanel(queue);
        await this.logAction(interaction.guild.id, interaction.user, '🔊 Volume +', `${currentVolume}% → ${newVolume}%`);
        
        await interaction.editReply({
            content: `🔊 Volume augmenté à ${newVolume}%.`,
            flags: 64 }); // MessageFlags.Ephemeral
    }

    async handleVolumeDown(interaction, queue) {
        const currentVolume = queue.node.volume;
        const newVolume = Math.max(currentVolume - 10, 0);
        
        if (currentVolume <= 0) {
            return await interaction.editReply({
                content: '🔉 Le volume est déjà au minimum (0%).',
                flags: 64 }); // MessageFlags.Ephemeral
        }

        queue.node.setVolume(newVolume);
        await this.updatePanel(queue);
        await this.logAction(interaction.guild.id, interaction.user, '🔉 Volume -', `${currentVolume}% → ${newVolume}%`);
        
        await interaction.editReply({
            content: `🔉 Volume diminué à ${newVolume}%.`,
            flags: 64 }); // MessageFlags.Ephemeral
    }

    async handleMute(interaction, queue) {
        const currentVolume = queue.node.volume;
        
        if (currentVolume === 0) {
            // Unmute - restaurer le volume précédent ou 50%
            const newVolume = queue.previousVolume || 50;
            queue.node.setVolume(newVolume);
            await this.updatePanel(queue);
            await this.logAction(interaction.guild.id, interaction.user, '🔊 Unmute', `Volume restauré à ${newVolume}%`);
            
            await interaction.editReply({
                content: `🔊 Son réactivé. Volume: ${newVolume}%.`,
                flags: 64 }); // MessageFlags.Ephemeral
        } else {
            // Mute - sauvegarder le volume actuel et mettre à 0
            queue.previousVolume = currentVolume;
            queue.node.setVolume(0);
            await this.updatePanel(queue);
            await this.logAction(interaction.guild.id, interaction.user, '🔇 Mute', 'Son coupé');
            
            await interaction.editReply({
                content: '🔇 Son coupé.',
                flags: 64 }); // MessageFlags.Ephemeral
        }
    }

    async handleShowQueue(interaction, queue) {
        const tracks = queue.tracks.data;
        const currentTrack = queue.currentTrack;
        
        if (tracks.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('📜 File d\'attente')
                .setDescription('Aucune musique en attente.')
                .setColor('#ff9900')
                .addFields({
                    name: '🎵 En cours',
                    value: `[${currentTrack.title}](${currentTrack.url})\nDemandé par <@${currentTrack.requestedBy.id}>`,
                    inline: false
                });

            return await interaction.editReply({
                embeds: [embed],
                flags: 64 }); // MessageFlags.Ephemeral
        }

        const embed = new EmbedBuilder()
            .setTitle('📜 File d\'attente')
            .setColor('#00ff00')
            .addFields({
                name: '🎵 En cours',
                value: `[${currentTrack.title}](${currentTrack.url})\nDemandé par <@${currentTrack.requestedBy.id}>`,
                inline: false
            });

        // Afficher les 10 prochaines musiques
        const nextTracks = tracks.slice(0, 10);
        let queueText = '';
        
        nextTracks.forEach((track, index) => {
            queueText += `**${index + 1}.** [${track.title}](${track.url})\n`;
            queueText += `Demandé par <@${track.requestedBy.id}>\n\n`;
        });

        if (tracks.length > 10) {
            queueText += `... et ${tracks.length - 10} autre(s) musique(s)`;
        }

        embed.addFields({
            name: `🎼 Prochaines musiques (${tracks.length})`,
            value: queueText || 'Aucune musique en attente',
            inline: false
        });

        await interaction.editReply({
            embeds: [embed],
            flags: 64 }); // MessageFlags.Ephemeral
    }

    /**
     * Met à jour le panel de musique
     */
    async updatePanel(queue) {
        if (!queue.currentTrack) return;
        
        const panel = this.panelManager.getActivePanel(queue.guild.id);
        if (!panel) return;

        await this.panelManager.createOrUpdatePanel(queue, queue.currentTrack, panel.channel);
    }

    /**
     * Enregistre une action dans les logs
     */
    async logAction(guildId, user, action, details) {
        try {
            await this.queueManager.logAction(guildId, user, action, details);
        } catch (error) {
            console.error('❌ Erreur lors de l\'enregistrement du log:', error);
        }
    }
}

export default MusicPanelHandler;






