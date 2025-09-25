import { SlashCommandBuilder, PermissionFlagsBits, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, ChannelType } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    data: new SlashCommandBuilder()
        .setName('cc')
        .setDescription('🎤 Configure le système de canaux vocaux automatiques')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    async execute(interaction) {
        try {
            // Vérifier les permissions
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return await interaction.reply({
                    content: '❌ Vous n\'avez pas la permission de gérer les canaux.',
                    ephemeral: true
                });
            }

            // Récupérer tous les canaux vocaux du serveur
            const voiceChannels = interaction.guild.channels.cache.filter(
                channel => channel.type === ChannelType.GuildVoice
            );

            if (voiceChannels.size === 0) {
                return await interaction.reply({
                    content: '❌ Aucun canal vocal trouvé sur ce serveur.',
                    ephemeral: true
                });
            }

            // Créer le menu de sélection
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('cc_master_channel_select')
                .setPlaceholder('🎤 Sélectionnez le canal vocal maître')
                .setMinValues(1)
                .setMaxValues(1);

            // Ajouter les options de canaux vocaux
            voiceChannels.forEach(channel => {
                const categoryName = channel.parent ? ` (${channel.parent.name})` : '';
                selectMenu.addOptions({
                    label: `🎤 ${channel.name}${categoryName}`,
                    description: `Définir ${channel.name} comme canal maître`,
                    value: channel.id
                });
            });

            const row = new ActionRowBuilder().addComponents(selectMenu);

            // Créer l'embed
            const embed = new EmbedBuilder()
                .setTitle('🎤 Configuration des Canaux Vocaux Automatiques')
                .setDescription(
                    '**Sélectionnez un canal vocal maître :**\n\n' +
                    '• Quand un utilisateur rejoint ce canal, un nouveau canal vocal sera créé automatiquement\n' +
                    '• L\'utilisateur sera déplacé dans son nouveau canal personnel\n' +
                    '• Le canal sera supprimé automatiquement quand il sera vide\n\n' +
                    '**Fonctionnalités incluses :**\n' +
                    '🦵 Expulser des membres\n' +
                    '🔨 Bannir/débannir des membres\n' +
                    '🚫 Liste noire d\'utilisateurs\n' +
                    '🔑 Gérer les permissions\n' +
                    '✏️ Modifier le canal (nom, limite, bitrate)'
                )
                .setColor('#00ff88')
                .setFooter({ 
                    text: 'Système de canaux vocaux automatiques',
                    iconURL: interaction.client.user.displayAvatarURL()
                })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            console.error('[AUTO-VC] Erreur dans la commande /cc:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
                ephemeral: true
            });
        }
    }
};