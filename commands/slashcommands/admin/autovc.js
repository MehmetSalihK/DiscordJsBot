import { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';

export default {
    category: 'admin',
    data: new SlashCommandBuilder()
        .setName('autovc')
        .setDescription('Configure les salons vocaux automatiques')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Configure un salon maître pour les salons vocaux automatiques')
        ),
    
    async execute(interaction) {
        try {
            if (interaction.options.getSubcommand() === 'setup') {
                // Récupérer tous les salons vocaux du serveur
                const voiceChannels = interaction.guild.channels.cache
                    .filter(channel => channel.type === ChannelType.GuildVoice)
                    .map(channel => ({
                        label: channel.name,
                        value: channel.id,
                        description: `ID: ${channel.id}`
                    }));

                if (voiceChannels.length === 0) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#FF4444')
                        .setTitle('❌ Aucun salon vocal')
                        .setDescription('Aucun salon vocal trouvé sur ce serveur.')
                        .addFields(
                            { name: '💡 Solution', value: 'Créez d\'abord un salon vocal pour l\'utiliser comme salon maître.', inline: false }
                        )
                        .setTimestamp()
                        .setFooter({ text: '🎵 Auto Voice Channel System', iconURL: interaction.guild.iconURL() });
                    
                    return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }

                // Limiter à 25 options maximum (limite Discord)
                const limitedChannels = voiceChannels.slice(0, 25);

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_master_channel')
                    .setPlaceholder('Sélectionnez un salon vocal maître')
                    .addOptions(limitedChannels);

                const row = new ActionRowBuilder().addComponents(selectMenu);

                const embed = new EmbedBuilder()
                    .setColor('#7289DA')
                    .setTitle('🎵 Configuration des salons vocaux automatiques')
                    .setDescription('Sélectionnez un salon vocal qui servira de **salon maître**.')
                    .addFields(
                        { name: '📋 Comment ça fonctionne ?', value: 'Quand un utilisateur rejoint le salon maître, un nouveau salon vocal personnel lui sera automatiquement créé.', inline: false },
                        { name: '🎛️ Fonctionnalités', value: '• Salon personnel avec permissions\n• Panel de gestion intégré\n• Suppression automatique quand vide', inline: false },
                        { name: '⚙️ Étape suivante', value: 'Choisissez le salon vocal dans le menu ci-dessous.', inline: false }
                    )
                    .setTimestamp()
                    .setFooter({ text: '🎵 Auto Voice Channel System', iconURL: interaction.guild.iconURL() });

                await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
            }
        } catch (error) {
            console.error('[AUTO-VC] Erreur dans la commande autovc:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF4444')
                .setTitle('❌ Erreur système')
                .setDescription('Une erreur est survenue lors du traitement de votre commande.')
                .setTimestamp()
                .setFooter({ text: '🎵 Auto Voice Channel System', iconURL: interaction.guild.iconURL() });
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};