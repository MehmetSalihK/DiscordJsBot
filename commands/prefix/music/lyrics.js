import { EmbedBuilder } from 'discord.js';

export default {
    name: 'lyrics',
    aliases: ['paroles', 'lyric'],
    description: 'Affiche les paroles d\'une musique',
    usage: '!lyrics [titre]',
    category: 'music',
    
    async execute(message, args, client) {
        let query;
        
        if (args.length) {
            query = args.join(' ');
        } else {
            // Si aucun argument, utiliser la musique en cours
            const queue = client.queueManager.player.nodes.get(message.guild.id);
            if (!queue || !queue.currentTrack) {
                return message.reply('❌ Aucune musique en cours ! Veuillez spécifier un titre.');
            }
            query = queue.currentTrack.title;
        }

        try {
            // Simulation d'une recherche de paroles (vous pouvez intégrer une vraie API comme Genius)
            const embed = new EmbedBuilder()
                .setColor('#4ecdc4')
                .setTitle('🎤 Paroles')
                .setDescription(`Recherche des paroles pour : **${query}**`)
                .addFields({
                    name: '📝 Information',
                    value: 'Cette fonctionnalité nécessite une intégration avec une API de paroles comme Genius API.\nVeuillez configurer votre clé API dans le fichier .env pour activer cette fonctionnalité.'
                })
                .setTimestamp();

            await message.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Erreur lors de la recherche de paroles:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff6b6b')
                .setTitle('❌ Erreur')
                .setDescription('Impossible de récupérer les paroles pour cette musique.')
                .setTimestamp();

            await message.reply({ embeds: [embed] });
        }
    }
};



