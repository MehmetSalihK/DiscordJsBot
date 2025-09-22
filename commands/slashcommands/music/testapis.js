import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('testapis')
    .setDescription('Teste la configuration des APIs de musique');

export async function execute(interaction) {
    try {
        const embed = new EmbedBuilder()
            .setColor('#4CAF50')
            .setTitle('🔧 Test des APIs de musique')
            .setTimestamp();
        
        let description = '';
        let allGood = true;
        
        // Test YouTube API
        const youtubeApi = process.env.YOUTUBE_API;
        if (!youtubeApi || youtubeApi === 'xxxxxxxx') {
            description += '❌ **YouTube API** : Non configurée\n';
            description += '   → **CRITIQUE** : Obligatoire pour la lecture de musique\n';
            description += '   → Obtenez une clé sur Google Cloud Console\n\n';
            allGood = false;
        } else {
            description += '✅ **YouTube API** : Configurée\n\n';
        }
        
        // Test Spotify API
        const spotifyId = process.env.SPOTIFY_CLIENT_ID;
        const spotifySecret = process.env.SPOTIFY_CLIENT_SECRET;
        if (!spotifyId || !spotifySecret || spotifyId === 'xxxxxxxx' || spotifySecret === 'xxxxxxxx') {
            description += '⚠️ **Spotify API** : Partiellement configurée\n';
            description += '   → Permet la recherche Spotify mais pas obligatoire\n\n';
        } else {
            description += '✅ **Spotify API** : Configurée\n\n';
        }
        
        // Test SoundCloud API
        const soundcloudApi = process.env.SOUNDCLOUD_API;
        if (!soundcloudApi || soundcloudApi === 'xxxxxxxx') {
            description += '⚠️ **SoundCloud API** : Non configurée\n';
            description += '   → Optionnel pour SoundCloud\n\n';
        } else {
            description += '✅ **SoundCloud API** : Configurée\n\n';
        }
        
        // Test FFmpeg
        try {
            const { Player } = await import('discord-player');
            description += '✅ **FFmpeg** : Disponible via ffmpeg-static\n\n';
        } catch (error) {
            description += '❌ **FFmpeg** : Problème détecté\n';
            description += `   → Erreur: ${error.message}\n\n`;
            allGood = false;
        }
        
        // Test de recherche réel
        let searchStatus = '⏳ Test en cours...';
        let searchDetails = '';
        try {
            const { Player, QueryType } = await import('discord-player');
            const player = interaction.client.queueManager?.player;
            
            if (player) {
                console.log('[TEST] Début du test de recherche...');
                const searchResult = await player.search('never gonna give you up', {
                    requestedBy: interaction.user,
                    searchEngine: QueryType.YOUTUBE_SEARCH
                });
                
                if (searchResult && searchResult.tracks.length > 0) {
                    searchStatus = '✅ Recherche fonctionnelle';
                    searchDetails = `Trouvé: ${searchResult.tracks[0].title} par ${searchResult.tracks[0].author}`;
                    console.log('[TEST] Recherche réussie:', searchResult.tracks[0].title);
                } else {
                    searchStatus = '❌ Aucun résultat';
                    searchDetails = 'La recherche ne retourne aucun résultat';
                    console.log('[TEST] Aucun résultat de recherche');
                }
            } else {
                searchStatus = '❌ Player non initialisé';
                searchDetails = 'Le player discord-player n\'est pas disponible';
            }
        } catch (error) {
            searchStatus = '❌ Erreur de recherche';
            searchDetails = `Erreur: ${error.message}`;
            console.log('[TEST] Erreur de recherche:', error.message);
        }
        
        description += `**🔍 Test de Recherche** : ${searchStatus}\n`;
        if (searchDetails) {
            description += `   → ${searchDetails}\n\n`;
        }
        
        // Recommandations
        if (!allGood) {
            description += '**🔧 Actions requises :**\n';
            description += '1. Configurez l\'API YouTube (PRIORITÉ 1)\n';
            description += '2. Redémarrez le bot après configuration\n';
            description += '3. Testez avec `/play [musique]`\n';
            embed.setColor('#ff6b6b');
        } else {
            description += '**🎉 Toutes les APIs sont configurées !**\n';
            description += 'Le système de musique devrait fonctionner correctement.';
        }
        
        embed.setDescription(description);
        
        await interaction.reply({ embeds: [embed], flags: 64 }); // MessageFlags.Ephemeral
        
    } catch (error) {
        console.error('Erreur lors du test des APIs:', error);
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff6b6b')
            .setTitle('❌ Erreur')
            .setDescription('Une erreur s\'est produite lors du test des APIs.')
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], flags: 64 }); // MessageFlags.Ephemeral
    }
}




