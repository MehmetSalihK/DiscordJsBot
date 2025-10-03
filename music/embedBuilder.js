import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export class MusicEmbedBuilder {
    static createNowPlayingEmbed(track, queue) {
        const embed = new EmbedBuilder()
            .setColor('#4ecdc4')
            .setTitle('🎵 En cours de lecture')
            .setDescription(`**[${track.title}](${track.url})**`)
            .addFields(
                { name: '👤 Artiste', value: track.author || 'Inconnu', inline: true },
                { name: '⏱️ Durée', value: track.duration || 'Inconnue', inline: true },
                { name: '🔊 Volume', value: `${queue.node.volume}%`, inline: true },
                { name: '🔁 Mode de répétition', value: this.getLoopModeText(queue.repeatMode), inline: true },
                { name: '📋 File d\'attente', value: `${queue.tracks.data.length} musique(s)`, inline: true },
                { name: '🎧 Demandé par', value: track.requestedBy ? `<@${track.requestedBy.id}>` : 'Inconnu', inline: true }
            )
            .setThumbnail(track.thumbnail)
            .setTimestamp()
            .setFooter({ text: 'Système de musique Discord Bot' });

        return embed;
    }

    static createQueueEmbed(queue, page = 1, itemsPerPage = 10) {
        const tracks = queue.tracks.data;
        const totalPages = Math.ceil(tracks.length / itemsPerPage);
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const currentTracks = tracks.slice(start, end);

        const embed = new EmbedBuilder()
            .setColor('#4ecdc4')
            .setTitle('📋 File d\'attente')
            .setTimestamp()
            .setFooter({ text: `Page ${page}/${totalPages} • ${tracks.length} musique(s) en attente` });

        if (queue.currentTrack) {
            embed.addFields({
                name: '🎵 En cours',
                value: `**[${queue.currentTrack.title}](${queue.currentTrack.url})**\n*Demandé par ${queue.currentTrack.requestedBy ? `<@${queue.currentTrack.requestedBy.id}>` : 'Inconnu'}*`,
                inline: false
            });
        }

        if (currentTracks.length > 0) {
            const queueList = currentTracks.map((track, index) => {
                const position = start + index + 1;
                return `**${position}.** [${track.title}](${track.url})\n*Demandé par ${track.requestedBy ? `<@${track.requestedBy.id}>` : 'Inconnu'}* • \`${track.duration}\``;
            }).join('\n\n');

            embed.addFields({
                name: '⏭️ À venir',
                value: queueList,
                inline: false
            });
        } else if (!queue.currentTrack) {
            embed.setDescription('La file d\'attente est vide.');
        }

        return embed;
    }

    static createSearchEmbed(results, query) {
        const embed = new EmbedBuilder()
            .setColor('#4ecdc4')
            .setTitle('🔍 Résultats de recherche')
            .setDescription(`Recherche pour : **${query}**\n\nSélectionnez une musique en cliquant sur un bouton ci-dessous :`)
            .setTimestamp()
            .setFooter({ text: 'Vous avez 30 secondes pour choisir' });

        results.slice(0, 5).forEach((track, index) => {
            embed.addFields({
                name: `${index + 1}. ${track.title}`,
                value: `**Artiste :** ${track.author}\n**Durée :** ${track.duration}\n**[Lien](${track.url})**`,
                inline: true
            });
        });

        return embed;
    }

    static createErrorEmbed(message) {
        return new EmbedBuilder()
            .setColor('#ff6b6b')
            .setTitle('❌ Erreur')
            .setDescription(message)
            .setTimestamp();
    }

    static createSuccessEmbed(message) {
        return new EmbedBuilder()
            .setColor('#51cf66')
            .setTitle('✅ Succès')
            .setDescription(message)
            .setTimestamp();
    }

    static createInfoEmbed(title, message) {
        return new EmbedBuilder()
            .setColor('#339af0')
            .setTitle(`ℹ️ ${title}`)
            .setDescription(message)
            .setTimestamp();
    }

    static getLoopModeText(mode) {
        switch (mode) {
            case 0: return 'Désactivé';
            case 1: return 'Musique actuelle';
            case 2: return 'File d\'attente';
            default: return 'Inconnu';
        }
    }

    static createPlayerButtons(queue) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_previous')
                    .setLabel('⏮️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_playpause')
                    .setLabel(queue.node.isPaused() ? '▶️' : '⏸️')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('music_skip')
                    .setLabel('⏭️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_stop')
                    .setLabel('⏹️')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('music_loop')
                    .setLabel('🔁')
                    .setStyle(queue.repeatMode > 0 ? ButtonStyle.Success : ButtonStyle.Secondary)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_volume_down')
                    .setLabel('🔉')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_volume_up')
                    .setLabel('🔊')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_queue')
                    .setLabel('📋')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_shuffle')
                    .setLabel('🔀')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_disconnect')
                    .setLabel('🚪')
                    .setStyle(ButtonStyle.Danger)
            );

        return [row, row2];
    }

    static createQueueButtons(currentPage, totalPages) {
        const row = new ActionRowBuilder();

        if (currentPage > 1) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`queue_page_${currentPage - 1}`)
                    .setLabel('⬅️ Précédent')
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        row.addComponents(
            new ButtonBuilder()
                .setCustomId('queue_refresh')
                .setLabel('🔄 Actualiser')
                .setStyle(ButtonStyle.Primary)
        );

        if (currentPage < totalPages) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`queue_page_${currentPage + 1}`)
                    .setLabel('Suivant ➡️')
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        return [row];
    }

    static createSearchButtons(resultsCount) {
        const row = new ActionRowBuilder();
        
        for (let i = 0; i < Math.min(resultsCount, 5); i++) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`search_select_${i}`)
                    .setLabel(`${i + 1}`)
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        row.addComponents(
            new ButtonBuilder()
                .setCustomId('search_cancel')
                .setLabel('❌ Annuler')
                .setStyle(ButtonStyle.Danger)
        );

        return [row];
    }
}



