import { EmbedBuilder } from 'discord.js';
import { QueryType } from 'discord-player';
import ytdl from 'ytdl-core';

export default {
    name: 'play',
    category: 'music',
    description: 'Jouer une musique',
    usage: '!play <nom de la musique ou URL>',
    async execute(message, args) {
        const query = args.join(' ');
        const voiceChannel = message.member.voice.channel;

        if (!voiceChannel) {
            return message.reply('❌ Vous devez être dans un salon vocal pour utiliser cette commande !');
        }

        if (!voiceChannel.permissionsFor(message.guild.members.me).has(['Connect', 'Speak'])) {
            return message.reply('❌ Je n\'ai pas les permissions pour rejoindre ou parler dans ce salon vocal !');
        }

        if (!query) {
            return message.reply('❌ Veuillez spécifier une musique à jouer !');
        }

        try {
            console.log('🔍 Recherche de:', query);
            
            // Utiliser directement discord-player avec ytdl-core (plus simple et fiable)
            const result = await message.client.queueManager.player.play(voiceChannel, query, {
                nodeOptions: {
                    metadata: {
                        channel: message.channel,
                        requestedBy: message.author,
                    },
                    selfDeaf: true,
                    volume: message.client.queueManager.getServerConfig(message.guild.id).volume,
                    leaveOnEmpty: true,
                    leaveOnEmptyCooldown: 300000,
                    leaveOnEnd: true,
                    leaveOnEndCooldown: 300000
                },
                searchEngine: QueryType.YOUTUBE_SEARCH
            });

            const track = result.track;
            console.log('✅ Lecture réussie:', track.title);

            // Créer l'embed de confirmation
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🎶 Musique en cours de lecture')
                .setDescription(`**${track.title}**`)
                .addFields(
                    { name: '⏱️ Durée', value: track.duration || 'Inconnu', inline: true },
                    { name: '👤 Demandé par', value: message.author.toString(), inline: true }
                )
                .setThumbnail(track.thumbnail || null);

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ [PLAY_ERROR] Erreur lors de la lecture:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff6b6b')
                .setTitle('❌ Erreur')
                .setDescription(`Impossible de lire cette musique: ${error.message}`)
                .setTimestamp();
            
            await message.reply({ embeds: [embed] });
        }
    }
};



