import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { QueryType } from 'discord-player';
import ytdl from 'ytdl-core';

export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Jouer une musique')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Le nom de la musique ou l\'URL')
                .setRequired(true)
        ),
    category: 'music',
    async execute(interaction) {
        const query = interaction.options.getString('query');
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({
                content: '❌ Vous devez être dans un canal vocal pour utiliser cette commande !',
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        // Répondre immédiatement pour éviter les timeouts
        await interaction.deferReply();

        try {
            console.log('🔍 Recherche de:', query);
            
            // Utiliser directement discord-player avec ytdl-core (plus simple et fiable)
            const result = await interaction.client.queueManager.player.play(voiceChannel, query, {
                nodeOptions: {
                    metadata: {
                        channel: interaction.channel,
                        requestedBy: interaction.user,
                    },
                    selfDeaf: true,
                    volume: interaction.client.queueManager.getServerConfig(interaction.guild.id).volume,
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
                    { name: '👤 Demandé par', value: interaction.user.toString(), inline: true }
                )
                .setThumbnail(track.thumbnail || null);

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ [PLAY_ERROR] Erreur lors de la lecture:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff6b6b')
                .setTitle('❌ Erreur')
                .setDescription(`Impossible de lire cette musique: ${error.message}`)
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
        }
    }
};