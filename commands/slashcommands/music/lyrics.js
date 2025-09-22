import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('lyrics')
        .setDescription('Affiche les paroles d\'une musique')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Titre de la musique (optionnel, utilise la musique en cours si non spécifié)')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        let query = interaction.options.getString('title');
        
        if (!query) {
            // Si aucun argument, utiliser la musique en cours
            const queue = interaction.client.queueManager.player.nodes.get(interaction.guild.id);
            if (!queue || !queue.currentTrack) {
                return interaction.reply({ 
                    content: '❌ Aucune musique en cours ! Veuillez spécifier un titre.', 
                    flags: 64 }); // MessageFlags.Ephemeral
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

            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Erreur lors de la recherche de paroles:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff6b6b')
                .setTitle('❌ Erreur')
                .setDescription('Impossible de récupérer les paroles pour cette musique.')
                .setTimestamp();

            await interaction.reply({ embeds: [embed], flags: 64 }); // MessageFlags.Ephemeral
        }
    }
};




