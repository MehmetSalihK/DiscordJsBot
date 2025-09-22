import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import ytdl from 'ytdl-core';
import ytdlDiscord from 'ytdl-core-discord';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } from '@discordjs/voice';

export default {
    data: new SlashCommandBuilder()
        .setName('playyt')
        .setDescription('Joue une musique YouTube avec ytdl-core direct')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('URL YouTube ou mots-clés à rechercher')
                .setRequired(true)
        ),
    
    async execute(interaction) {
        const query = interaction.options.getString('query');
        const member = interaction.member;
        const channel = member.voice.channel;

        if (!channel) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Erreur')
                    .setDescription('Vous devez être dans un salon vocal !')],
                flags: 64
            });
        }

        const permissions = channel.permissionsFor(interaction.client.user);
        if (!permissions.has(['Connect', 'Speak'])) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Erreur')
                    .setDescription('Je n\'ai pas les permissions pour rejoindre ce salon vocal !')],
                flags: 64
            });
        }

        await interaction.deferReply();

        try {
            let url = query;
            
            // Si ce n'est pas une URL YouTube, on cherche
            if (!ytdl.validateURL(query)) {
                // Pour simplifier, on demande une URL directe pour ce test
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor('#ffeb3b')
                        .setTitle('⚠️ URL requise')
                        .setDescription('Pour ce test, veuillez fournir une URL YouTube directe.\nExemple: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`')]
                });
            }

            // Vérifier que l'URL est valide
            if (!ytdl.validateURL(url)) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor('#ff6b6b')
                        .setTitle('❌ Erreur')
                        .setDescription('URL YouTube invalide !')]
                });
            }

            // Obtenir les informations de la vidéo
            console.log('🔍 Récupération des infos pour:', url);
            const songInfo = await ytdl.getBasicInfo(url);
            const song = {
                title: songInfo.videoDetails.title,
                url: songInfo.videoDetails.video_url,
                duration: songInfo.videoDetails.lengthSeconds,
                thumbnail: songInfo.videoDetails.thumbnails[0]?.url
            };

            console.log('🎵 Chanson trouvée:', song.title);

            // Rejoindre le salon vocal
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });

            // Créer le player audio
            const player = createAudioPlayer();
            
            // Créer le stream audio
            console.log('🎧 Création du stream audio...');
            const stream = await ytdlDiscord(song.url, { 
                filter: 'audioonly',
                highWaterMark: 1 << 25,
                quality: 'highestaudio'
            });
            
            const resource = createAudioResource(stream, { 
                inputType: 'opus' 
            });

            // Jouer la musique
            player.play(resource);
            connection.subscribe(player);

            // Embed de confirmation
            const embed = new EmbedBuilder()
                .setColor('#4ecdc4')
                .setTitle('🎵 Lecture démarrée (ytdl-core)')
                .setDescription(`**[${song.title}](${song.url})**`)
                .addFields(
                    { name: '⏱️ Durée', value: `${Math.floor(song.duration / 60)}:${(song.duration % 60).toString().padStart(2, '0')}`, inline: true },
                    { name: '🎧 Demandé par', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setThumbnail(song.thumbnail)
                .setTimestamp()
                .setFooter({ text: 'Test avec ytdl-core direct' });

            await interaction.editReply({ embeds: [embed] });

            // Gestion des événements
            player.on(AudioPlayerStatus.Playing, () => {
                console.log('✅ Lecture démarrée !');
            });

            player.on(AudioPlayerStatus.Idle, () => {
                console.log('⏹️ Lecture terminée');
                connection.destroy();
            });

            player.on('error', error => {
                console.error('❌ Erreur du player:', error);
                connection.destroy();
            });

            connection.on(VoiceConnectionStatus.Disconnected, () => {
                console.log('🔌 Déconnecté du salon vocal');
                connection.destroy();
            });

        } catch (error) {
            console.error('❌ Erreur lors de la lecture:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff6b6b')
                .setTitle('❌ Erreur de lecture')
                .setDescription(`Une erreur s'est produite: ${error.message}`)
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};



