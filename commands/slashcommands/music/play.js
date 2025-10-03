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

        // Déférer la réponse immédiatement pour éviter les timeouts
        try {
            await interaction.deferReply();
        } catch (error) {
            console.error('❌ Erreur lors du deferReply:', error);
            // Si le deferReply échoue, l'interaction a probablement expiré
            return;
        }

        // Utiliser la méthode play du queueManager qui gère tout
        try {
            await interaction.client.queueManager.play(interaction, query);
        } catch (error) {
            console.error('❌ [PLAY_ERROR] Erreur lors de la lecture:', error);
            
            // Vérifier si on peut encore répondre
            try {
                const embed = new EmbedBuilder()
                    .setColor('#ff6b6b')
                    .setTitle('❌ Erreur')
                    .setDescription(`Impossible de lire cette musique: ${error.message}`)
                    .setTimestamp();
                
                if (interaction.deferred && !interaction.replied) {
                    await interaction.editReply({ embeds: [embed] });
                }
            } catch (replyError) {
                console.error('❌ Impossible de répondre à l\'interaction:', replyError.message);
            }
        }
    }
};