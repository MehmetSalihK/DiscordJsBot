import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('testplay')
        .setDescription('Test simple de lecture musicale')
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
                content: '❌ Vous devez être dans un canal vocal !',
                flags: 64
            });
        }

        await interaction.deferReply();

        try {
            console.log('🧪 [TEST_PLAY] Début du test simple');
            console.log(`   🔍 Recherche: ${query}`);
            console.log(`   🎤 Canal vocal: ${voiceChannel.name}`);
            console.log(`   👤 Utilisateur: ${interaction.user.tag}`);

            // Utiliser directement l'API discord-player la plus simple
            const result = await interaction.client.queueManager.player.play(voiceChannel, query, {
                nodeOptions: {
                    metadata: {
                        channel: interaction.channel,
                        requestedBy: interaction.user,
                    },
                    selfDeaf: true,
                    volume: 50,
                    // Configuration minimale pour test
                    leaveOnEmpty: false,
                    leaveOnEnd: false
                }
            });

            console.log('✅ [TEST_PLAY] Résultat obtenu');
            console.log(`   🎵 Track: ${result.track.title}`);
            console.log(`   🔗 URL: ${result.track.url}`);
            console.log(`   ⏱️ Durée: ${result.track.duration}`);

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🧪 Test de lecture')
                .setDescription(`**${result.track.title}**`)
                .addFields(
                    { name: '🔍 Recherche', value: query, inline: true },
                    { name: '⏱️ Durée', value: result.track.duration || 'Inconnu', inline: true },
                    { name: '🎤 Canal', value: voiceChannel.name, inline: true }
                )
                .setFooter({ text: 'Test simple - Si ça ne joue pas, le problème est dans la configuration audio' });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ [TEST_PLAY] Erreur:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur de test')
                .setDescription(`Erreur: ${error.message}`)
                .addFields(
                    { name: '🔍 Recherche', value: query, inline: true },
                    { name: '🎤 Canal', value: voiceChannel.name, inline: true }
                )
                .setFooter({ text: 'Erreur détectée - Vérifier les logs' });
            
            await interaction.editReply({ embeds: [embed] });
        }
    }
};