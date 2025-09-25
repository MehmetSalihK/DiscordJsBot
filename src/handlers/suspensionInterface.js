import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder,
    ChannelType,
    PermissionFlagsBits,
    MessageFlags
} from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import {
    loadSuspensionData,
    saveSuspensionData,
    createAllSuspensionRoles,
    configureChannelPermissions,
    checkSuspensionRoles,
    deleteAllSuspensionRoles,
    updateSuspensionRole
} from './suspensionRoles.js';
import {
    startSuspensionTimer,
    cancelSuspension,
    getSuspensionInfo,
    getActiveSuspensions,
    formatDuration
} from './suspensionTimers.js';
import { applyAllLevelPermissions, setVisibleChannels, getVisibleChannels, createPermissionStatusEmbed, PERMISSION_CONFIGS } from './suspensionPermissions.js';
import {
    showCustomSuspensionModal,
    showCancelSuspensionModal,
    handleCustomSuspensionModalSubmit,
    handleCancelSuspensionModalSubmit
} from './suspensionModals.js';
import {
    saveSuspensionState,
    showRollbackPanel,
    confirmRollback,
    performRollback
} from './suspensionRollback.js';
import {
    validateSuspensionAction,
    validateSuspensionCancellation,
    createErrorEmbed,
    performSystemHealthCheck
} from './suspensionValidation.js';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SUSPENSIONS_FILE = path.join(__dirname, '../data/suspensions.json');

// Charger les données de suspension (utilise le nouveau système)
async function loadSuspensions() {
    return await loadSuspensionData();
}

// Sauvegarder les données de suspension (utilise le nouveau système)
async function saveSuspensions(data) {
    return await saveSuspensionData(data);
}

// Obtenir la configuration du serveur
async function getGuildConfig(guildId) {
    const data = await loadSuspensions();
    if (!data.guilds[guildId]) {
        data.guilds[guildId] = {
            config: {
                autopunish: false,
                threshold: 3,
                autoResetDays: 30,
                notifyUser: true,
                roles: {
                    suspension1: null,
                    suspension2: null,
                    suspension3: null
                },
                durations: {
                    suspension1: 24,
                    suspension2: 72,
                    suspension3: 168
                },
                visibleChannels: [],
                logsChannel: null
            },
            users: {}
        };
        await saveSuspensions(data);
    }
    return data.guilds[guildId].config;
}

// Gestionnaire principal des boutons de suspension
export async function handleSuspensionInterface(interaction) {
    const customId = interaction.customId;

    try {
        switch (customId) {
            case 'suspension_config':
                await showConfigPanel(interaction);
                break;
            case 'suspension_status':
                await showServerStatus(interaction);
                break;
            case 'suspension_logs':
                await showLogsPanel(interaction);
                break;
            case 'suspension_toggle':
                await toggleAutoPunish(interaction);
                break;
            case 'suspension_test':
                await showTestPanel(interaction);
                break;
            case 'suspension_close':
                await closePanel(interaction);
                break;
            case 'suspension_back':
                await showMainPanel(interaction);
                break;
            
            // Configuration panels
            case 'suspension_config_general':
                await showGeneralConfig(interaction);
                break;
            case 'suspension_config_roles':
                await showRolesConfig(interaction);
                break;
            case 'suspension_config_durations':
                await showDurationsConfig(interaction);
                break;
            case 'suspension_config_channels':
                await showChannelsConfig(interaction);
                break;
            case 'suspension_config_logs':
                await showLogsConfig(interaction);
                break;
            case 'suspension_config_reset':
                await resetConfig(interaction);
                break;

            // Roles configuration
            case 'suspension_roles_auto':
                await createAutomaticRoles(interaction);
                break;
            case 'suspension_roles_select':
                await showRoleSelection(interaction);
                break;
            case 'suspension_create_all_roles':
                await createAutomaticRoles(interaction);
                break;
            case 'suspension_select_roles':
                await showRoleSelection(interaction);
                break;
            case 'suspension_roles_check':
                await checkRolesStatus(interaction);
                break;
            case 'suspension_roles_delete':
                await deleteRoles(interaction);
                break;
            case 'suspension_roles_permissions':
                await configureRolePermissions(interaction);
                break;

            // Advanced permissions management
            case 'suspension_permissions_apply_all':
                await handlePermissionsApplyAll(interaction);
                break;
            case 'suspension_permissions_configure':
                await showPermissionsPanel(interaction);
                break;
            case 'suspension_permissions_level1':
                await handlePermissionsLevel(interaction, 1);
                break;
            case 'suspension_permissions_level2':
                await handlePermissionsLevel(interaction, 2);
                break;
            case 'suspension_permissions_level3':
                await handlePermissionsLevel(interaction, 3);
                break;
            case 'suspension_permissions_status':
                await handlePermissionsStatus(interaction);
                break;

            // Navigation
            case 'suspension_back_main':
                await showMainPanel(interaction);
                break;
            case 'suspension_back_config':
                await showConfigPanel(interaction);
                break;
            case 'suspension_config_back':
                await showConfigPanel(interaction);
                break;

            // General configuration actions
            case 'suspension_toggle_autopunish':
                await toggleAutoPunish(interaction);
                break;
            case 'suspension_toggle_notify':
                await toggleNotifyUser(interaction);
                break;

            // Suspension actions
            case 'suspension_apply_level1':
                await showSuspensionModal(interaction, 1);
                break;
            case 'suspension_apply_level2':
                await showSuspensionModal(interaction, 2);
                break;
            case 'suspension_apply_level3':
                await showSuspensionModal(interaction, 3);
                break;
            case 'suspension_cancel':
                await showCancelSuspensionModal(interaction);
                break;
            case 'suspension_view_active':
                await showActiveSuspensions(interaction);
                break;

            // Rollback system
            case 'suspension_rollback':
                await showRollbackPanel(interaction);
                break;

            // System diagnostic
            case 'suspension_diagnostic':
                await showSystemDiagnostic(interaction);
                break;

            // Custom duration suspension
            case 'suspension_custom_duration':
                await showCustomDurationPanel(interaction);
                break;
            case 'suspension_custom_level1':
                await showCustomSuspensionModal(interaction, 1);
                break;
            case 'suspension_custom_level2':
                await showCustomSuspensionModal(interaction, 2);
                break;
            case 'suspension_custom_level3':
                await showCustomSuspensionModal(interaction, 3);
                break;
            case 'suspension_custom_cancel':
                await showCancelSuspensionModal(interaction);
                break;

            // Channel permissions
            case 'suspension_apply_permissions':
                await applyChannelPermissions(interaction);
                break;

            // Rollback confirmation
            case 'suspension_rollback_cancel':
                await showRollbackPanel(interaction);
                break;

            default:
                if (customId.startsWith('suspension_rollback_confirm_')) {
                    const rollbackId = customId.replace('suspension_rollback_confirm_', '');
                    await handleRollbackConfirm(interaction, rollbackId);
                } else if (customId.startsWith('suspension_rollback_')) {
                    const rollbackId = customId.replace('suspension_rollback_', '');
                    await confirmRollback(interaction, rollbackId);
                } else if (customId.startsWith('suspension_confirm_')) {
                    await handleSuspensionConfirm(interaction);
                } else if (customId.startsWith('suspension_')) {
                    await interaction.reply({ 
                        content: '⚠️ Cette fonctionnalité est en cours de développement.', 
                        flags: MessageFlags.Ephemeral 
                    });
                }
        }

        // Gestion des modals
        if (interaction.isModalSubmit()) {
            const customId = interaction.customId;

            switch (customId) {
                case 'suspension_modal_level1':
                case 'suspension_modal_level2':
                case 'suspension_modal_level3':
                    await handleSuspensionModalSubmit(interaction);
                    break;
                case 'suspension_cancel_modal':
                    await handleCancelSuspensionModalSubmit(interaction);
                    break;
                default:
                    if (customId.startsWith('suspension_custom_modal_')) {
                        await handleCustomSuspensionModalSubmit(interaction);
                    } else if (customId.startsWith('suspension_cancel_modal_')) {
                        await handleCancelSuspensionModalSubmit(interaction);
                    } else if (customId.startsWith('suspension_modal_')) {
                        await interaction.reply({ 
                            content: '⚠️ Cette fonctionnalité est en cours de développement.', 
                            flags: MessageFlags.Ephemeral 
                        });
                    }
            }
        }
    } catch (error) {
        // console.error('Erreur dans handleSuspensionInterface:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors du traitement de votre demande.')
            .setTimestamp();

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }
    }
}

async function showMainPanel(interaction) {
    const introEmbed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('🔒 Système de suspensions progressives')
        .setDescription(`Ce module permet de :
• Enregistrer des avertissements (\`/warn\`)
• Appliquer automatiquement des suspensions progressives (3 niveaux)
• Configurer les rôles, durées, salons de logs et actions
• Gérer les utilisateurs via un panneau avec boutons

ℹ️ **Actions rapides :**`)
        .addFields(
            { name: '⚙️ Configuration', value: 'Paramétrer les rôles, durées et options', inline: true },
            { name: '📊 Statut serveur', value: 'Voir les statistiques et utilisateurs sanctionnés', inline: true },
            { name: '🧾 Logs', value: 'Consulter l\'historique des sanctions', inline: true },
            { name: '🔔 Activation', value: 'Activer/désactiver le système automatique', inline: true },
            { name: '🔄 Test', value: 'Tester le système en mode sandbox', inline: true },
            { name: '❌ Fermer', value: 'Fermer ce panneau', inline: true }
        )
        .setFooter({ text: 'Système de Suspensions Progressives • Cliquez sur les boutons ci-dessous' })
        .setTimestamp();

    const actionRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_config')
                .setLabel('Configurer')
                .setEmoji('⚙️')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('suspension_status')
                .setLabel('Statut serveur')
                .setEmoji('📊')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('suspension_logs')
                .setLabel('Voir logs')
                .setEmoji('🧾')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('suspension_toggle')
                .setLabel('Activer/Désactiver')
                .setEmoji('🔔')
                .setStyle(ButtonStyle.Success)
        );

    const actionRow2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_apply_level1')
                .setLabel('Suspension Niv.1')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('suspension_apply_level2')
                .setLabel('Suspension Niv.2')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('suspension_apply_level3')
                .setLabel('Suspension Niv.3')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('suspension_cancel')
                .setLabel('Annuler suspension')
                .setEmoji('🔓')
                .setStyle(ButtonStyle.Success)
        );

    const actionRow3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_view_active')
                .setLabel('Voir suspensions actives')
                .setEmoji('📋')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('suspension_custom_duration')
                .setLabel('Durée Custom')
                .setEmoji('⏰')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('suspension_rollback')
                .setLabel('Rollback')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('suspension_test')
                .setLabel('Test')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Secondary)
        );

    const actionRow4 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_diagnostic')
                .setLabel('Diagnostic Système')
                .setEmoji('🔧')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('suspension_close')
                .setLabel('Fermer')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Danger)
        );

    await interaction.update({ 
        embeds: [introEmbed], 
        components: [actionRow, actionRow2, actionRow3, actionRow4]
    });
}

async function showConfigPanel(interaction) {
    const guildId = interaction.guild.id;
    const config = await getGuildConfig(guildId);
    
    const embed = new EmbedBuilder()
        .setTitle('🔧 Configuration du Système de Suspension')
        .setDescription('Configurez tous les aspects du système de suspension progressif.')
        .setColor('#3498db')
        .addFields(
            {
                name: '⚙️ Paramètres Généraux',
                value: `• Auto-punition: ${config.autopunish ? '✅ Activée' : '❌ Désactivée'}
• Seuil d'avertissements: ${config.threshold || 3}
• Reset automatique: ${config.autoResetDays || 30} jours
• Notification utilisateur: ${config.notifyUser ? '✅ Oui' : '❌ Non'}`,
                inline: true
            },
            {
                name: '🎭 Rôles de Suspension',
                value: `• Suspension 1: ${config.roles?.suspension1 ? `<@&${config.roles.suspension1}>` : '❌ Non configuré'}
• Suspension 2: ${config.roles?.suspension2 ? `<@&${config.roles.suspension2}>` : '❌ Non configuré'}
• Suspension 3: ${config.roles?.suspension3 ? `<@&${config.roles.suspension3}>` : '❌ Non configuré'}`,
                inline: true
            },
            {
                name: '⏱️ Durées par Niveau',
                value: `• Niveau 1: ${config.durations?.level1 || '1h'}
• Niveau 2: ${config.durations?.level2 || '6h'}
• Niveau 3: ${config.durations?.level3 || '24h'}`,
                inline: true
            },
            {
                name: '📋 Canaux et Logs',
                value: `• Canal de logs: ${config.logsChannel ? `<#${config.logsChannel}>` : '❌ Non configuré'}
• Canaux visibles: ${config.visibleChannels?.length || 0} configurés`,
                inline: false
            }
        )
        .setFooter({ text: 'Utilisez les boutons ci-dessous pour configurer chaque aspect' });

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_config_general')
                .setLabel('Paramètres Généraux')
                .setEmoji('⚙️')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('suspension_config_roles')
                .setLabel('Rôles de Suspension')
                .setEmoji('🎭')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('suspension_config_durations')
                .setLabel('Durées')
                .setEmoji('⏱️')
                .setStyle(ButtonStyle.Primary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_config_channels')
                .setLabel('Canaux Visibles')
                .setEmoji('👁️')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('suspension_config_logs')
                .setLabel('Canal de Logs')
                .setEmoji('📋')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('suspension_permissions_configure')
                .setLabel('Permissions Avancées')
                .setEmoji('🔐')
                .setStyle(ButtonStyle.Secondary)
        );

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_back_main')
                .setLabel('Retour')
                .setEmoji('🔙')
                .setStyle(ButtonStyle.Danger)
        );

    await interaction.editReply({
        embeds: [embed],
        components: [row1, row2, row3]
    });
}

async function showGeneralConfig(interaction) {
    const guildId = interaction.guild.id;
    const config = await getGuildConfig(guildId);
    
    const embed = new EmbedBuilder()
        .setTitle('⚙️ Configuration Générale')
        .setDescription('Configurez les paramètres généraux du système de suspension.')
        .setColor('#e74c3c')
        .addFields(
            {
                name: 'Paramètres Actuels',
                value: `• Auto-punition: ${config.autopunish ? '✅ Activée' : '❌ Désactivée'}
• Seuil d'avertissements: ${config.threshold || 3}
• Reset automatique: ${config.autoResetDays || 30} jours
• Notification utilisateur: ${config.notifyUser ? '✅ Oui' : '❌ Non'}`,
                inline: false
            }
        );

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_toggle_autopunish')
                .setLabel(config.autopunish ? 'Désactiver Auto-punition' : 'Activer Auto-punition')
                .setEmoji(config.autopunish ? '❌' : '✅')
                .setStyle(config.autopunish ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('suspension_set_threshold')
                .setLabel('Modifier Seuil')
                .setEmoji('🔢')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('suspension_set_autoreset')
                .setLabel('Modifier Reset Auto')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Primary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_toggle_notify')
                .setLabel(config.notifyUser ? 'Désactiver Notifications' : 'Activer Notifications')
                .setEmoji(config.notifyUser ? '🔕' : '🔔')
                .setStyle(config.notifyUser ? ButtonStyle.Danger : ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('suspension_back_config')
                .setLabel('Retour Config')
                .setEmoji('🔙')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.editReply({
        embeds: [embed],
        components: [row1, row2]
    });
}

async function showRolesConfig(interaction) {
    const guildId = interaction.guild.id;
    const config = await getGuildConfig(guildId);
    
    const embed = new EmbedBuilder()
        .setTitle('🎭 Configuration des Rôles de Suspension')
        .setDescription('Configurez ou créez automatiquement les rôles de suspension.')
        .setColor('#9b59b6')
        .addFields(
            {
                name: 'Rôles Actuels',
                value: `• **Suspension 1**: ${config.roles?.suspension1 ? `<@&${config.roles.suspension1}>` : '❌ Non configuré'}
• **Suspension 2**: ${config.roles?.suspension2 ? `<@&${config.roles.suspension2}>` : '❌ Non configuré'}
• **Suspension 3**: ${config.roles?.suspension3 ? `<@&${config.roles.suspension3}>` : '❌ Non configuré'}`,
                inline: false
            },
            {
                name: 'Actions Disponibles',
                value: '• **Création Automatique**: Crée tous les rôles avec les bonnes permissions\n• **Sélection Manuelle**: Choisissez des rôles existants\n• **Configuration Individuelle**: Configurez chaque niveau séparément',
                inline: false
            }
        );

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_create_all_roles')
                .setLabel('Créer Tous les Rôles')
                .setEmoji('🆕')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('suspension_select_roles')
                .setLabel('Sélectionner Rôles')
                .setEmoji('🎯')
                .setStyle(ButtonStyle.Primary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_config_role_1')
                .setLabel('Config Niveau 1')
                .setEmoji('1️⃣')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('suspension_config_role_2')
                .setLabel('Config Niveau 2')
                .setEmoji('2️⃣')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('suspension_config_role_3')
                .setLabel('Config Niveau 3')
                .setEmoji('3️⃣')
                .setStyle(ButtonStyle.Secondary)
        );

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_back_config')
                .setLabel('Retour Config')
                .setEmoji('🔙')
                .setStyle(ButtonStyle.Danger)
        );

    await interaction.editReply({
        embeds: [embed],
        components: [row1, row2, row3]
    });
}

async function showDurationsConfig(interaction) {
    const guildId = interaction.guild.id;
    const config = await getGuildConfig(guildId);
    
    const embed = new EmbedBuilder()
        .setTitle('⏱️ Configuration des Durées')
        .setDescription('Configurez les durées par défaut pour chaque niveau de suspension.')
        .setColor('#f39c12')
        .addFields(
            {
                name: 'Durées Actuelles',
                value: `• **Niveau 1**: ${config.durations?.level1 || '1h'}
• **Niveau 2**: ${config.durations?.level2 || '6h'}
• **Niveau 3**: ${config.durations?.level3 || '24h'}`,
                inline: false
            },
            {
                name: 'Format Accepté',
                value: 'Exemples: `30m`, `2h`, `1d`, `1w`\n• m = minutes\n• h = heures\n• d = jours\n• w = semaines',
                inline: false
            }
        );

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_set_duration_1')
                .setLabel('Modifier Niveau 1')
                .setEmoji('1️⃣')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('suspension_set_duration_2')
                .setLabel('Modifier Niveau 2')
                .setEmoji('2️⃣')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('suspension_set_duration_3')
                .setLabel('Modifier Niveau 3')
                .setEmoji('3️⃣')
                .setStyle(ButtonStyle.Primary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_reset_durations')
                .setLabel('Réinitialiser Durées')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('suspension_back_config')
                .setLabel('Retour Config')
                .setEmoji('🔙')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.editReply({
        embeds: [embed],
        components: [row1, row2]
    });
}

async function showLogsPanel(interaction) {
    const logsEmbed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('🧾 Logs du système')
        .setDescription('Fonctionnalité en cours de développement.')
        .setTimestamp();

    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_back')
                .setLabel('Retour')
                .setEmoji('⬅️')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.update({ 
        embeds: [logsEmbed], 
        components: [backRow]
    });
}

async function showTestPanel(interaction) {
    const testEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🔄 Mode test')
        .setDescription('Fonctionnalité en cours de développement.')
        .setTimestamp();

    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_back')
                .setLabel('Retour')
                .setEmoji('⬅️')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.update({ 
        embeds: [testEmbed], 
        components: [backRow]
    });
}

async function showChannelsConfig(interaction) {
    const channelsEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🧭 Configuration des canaux')
        .setDescription('Fonctionnalité en cours de développement.')
        .setTimestamp();

    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_config')
                .setLabel('Retour')
                .setEmoji('⬅️')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.update({ 
        embeds: [channelsEmbed], 
        components: [backRow]
    });
}

async function showLogsConfig(interaction) {
    const logsConfigEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('📢 Configuration du salon de logs')
        .setDescription('Fonctionnalité en cours de développement.')
        .setTimestamp();

    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_config')
                .setLabel('Retour')
                .setEmoji('⬅️')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.update({ 
        embeds: [logsConfigEmbed], 
        components: [backRow]
    });
}

async function showRoleSelection(interaction) {
    const roleSelectionEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🎯 Sélection manuelle des rôles')
        .setDescription('Fonctionnalité en cours de développement.')
        .setTimestamp();

    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_config_roles')
                .setLabel('Retour')
                .setEmoji('⬅️')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.update({ 
        embeds: [roleSelectionEmbed], 
        components: [backRow]
    });
}

async function resetConfig(interaction) {
    const resetEmbed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('↩️ Réinitialisation de la configuration')
        .setDescription('Fonctionnalité en cours de développement.')
        .setTimestamp();

    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_config')
                .setLabel('Retour')
                .setEmoji('⬅️')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.update({ 
        embeds: [resetEmbed], 
        components: [backRow]
    });
}

async function createAutomaticRoles(interaction) {
    await interaction.deferUpdate();

    try {
        const guild = interaction.guild;
        
        // Utiliser le nouveau système de création des rôles
        const result = await createAllSuspensionRoles(guild);
        
        if (result.success) {
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Rôles créés avec succès')
                .setDescription(result.message)
                .addFields(
                    { name: '🟠 Suspension Niveau 1', value: result.roles.suspension1 ? `<@&${result.roles.suspension1}>` : 'Non créé', inline: true },
                    { name: '🔴 Suspension Niveau 2', value: result.roles.suspension2 ? `<@&${result.roles.suspension2}>` : 'Non créé', inline: true },
                    { name: '⚫ Suspension Niveau 3', value: result.roles.suspension3 ? `<@&${result.roles.suspension3}>` : 'Non créé', inline: true }
                )
                .setFooter({ text: 'Rôles de suspension configurés avec permissions automatiques' })
                .setTimestamp();

            const backRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('suspension_back_config')
                        .setLabel('Retour à la configuration')
                        .setEmoji('⬅️')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.editReply({ 
                embeds: [successEmbed], 
                components: [backRow]
            });
        } else {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Erreur lors de la création')
                .setDescription(result.error || 'Une erreur inconnue est survenue.')
                .setTimestamp();

            const backRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('suspension_config_roles')
                        .setLabel('Retour')
                        .setEmoji('⬅️')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.editReply({ 
                embeds: [errorEmbed], 
                components: [backRow]
            });
        }

    } catch (error) {
        // console.error('Erreur lors de la création des rôles:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur lors de la création des rôles')
            .setDescription('Impossible de créer les rôles. Vérifiez que le bot a les permissions nécessaires.')
            .setTimestamp();

        const backRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('suspension_config_roles')
                    .setLabel('Retour')
                    .setEmoji('⬅️')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ 
            embeds: [errorEmbed], 
            components: [backRow]
        });
    }
}

async function toggleNotifyUser(interaction) {
    const data = await loadSuspensions();
    const config = await getGuildConfig(interaction.guild.id);
    
    config.notifyUser = !config.notifyUser;
    data[interaction.guild.id].config = config;
    await saveSuspensions(data);

    await showGeneralConfig(interaction);
}

async function showServerStatus(interaction) {
    const data = await loadSuspensions();
    const guildData = data[interaction.guild.id] || { users: {} };
    
    const users = Object.keys(guildData.users);
    const suspendedUsers = users.filter(userId => guildData.users[userId].suspension_level > 0);
    const totalWarnings = users.reduce((total, userId) => total + (guildData.users[userId].warnings || 0), 0);

    const statusEmbed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('📊 Statut du serveur')
        .setDescription('Statistiques du système de suspensions progressives')
        .addFields(
            { name: '👥 Utilisateurs surveillés', value: users.length.toString(), inline: true },
            { name: '🚫 Utilisateurs suspendus', value: suspendedUsers.length.toString(), inline: true },
            { name: '⚠️ Total avertissements', value: totalWarnings.toString(), inline: true }
        )
        .setTimestamp();

    if (suspendedUsers.length > 0) {
        const suspendedList = suspendedUsers.slice(0, 10).map(userId => {
            const userData = guildData.users[userId];
            return `<@${userId}> - Niveau ${userData.suspension_level}`;
        }).join('\n');
        
        statusEmbed.addFields({ 
            name: '🔒 Utilisateurs suspendus', 
            value: suspendedList + (suspendedUsers.length > 10 ? `\n... et ${suspendedUsers.length - 10} autres` : ''), 
            inline: false 
        });
    }

    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_back_main')
                .setLabel('Retour')
                .setEmoji('⬅️')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.editReply({ 
        embeds: [statusEmbed], 
        components: [backRow]
    });
}

async function closePanel(interaction) {
    const closeEmbed = new EmbedBuilder()
        .setColor('#808080')
        .setTitle('❌ Panneau fermé')
        .setDescription('Le panneau de configuration a été fermé.')
        .setTimestamp();

    await interaction.editReply({ 
        embeds: [closeEmbed], 
        components: []
    });
}

// Nouvelles fonctions pour la gestion avancée des rôles

async function checkRolesStatus(interaction) {
    try {
        const guild = interaction.guild;
        const result = await checkSuspensionRoles(guild);
        
        const statusEmbed = new EmbedBuilder()
            .setColor(result.exists ? '#00FF00' : '#FFA500')
            .setTitle('🔍 Statut des rôles de suspension')
            .setDescription(result.exists ? 
                '✅ Tous les rôles de suspension sont configurés et existent.' : 
                '⚠️ Certains rôles de suspension sont manquants ou mal configurés.')
            .setTimestamp();

        if (result.roles) {
            const fields = [];
            for (const [level, roleData] of Object.entries(result.roles)) {
                const status = roleData.exists ? '✅' : '❌';
                const name = roleData.name || 'Non défini';
                fields.push({
                    name: `${status} ${level.charAt(0).toUpperCase() + level.slice(1)}`,
                    value: roleData.exists ? `<@&${roleData.id}> (${name})` : 'Rôle manquant',
                    inline: true
                });
            }
            statusEmbed.addFields(fields);
        }

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('suspension_create_all_roles')
                    .setLabel('Créer les rôles manquants')
                    .setEmoji('🔧')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(result.exists),
                new ButtonBuilder()
                    .setCustomId('suspension_back_config')
                    .setLabel('Retour')
                    .setEmoji('⬅️')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ 
            embeds: [statusEmbed], 
            components: [actionRow]
        });

    } catch (error) {
        // console.error('Erreur lors de la vérification des rôles:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de la vérification des rôles.')
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
     }
 }

async function deleteRoles(interaction) {
    try {
        const guild = interaction.guild;
        const result = await deleteAllSuspensionRoles(guild);
        
        const resultEmbed = new EmbedBuilder()
            .setColor(result.success ? '#00FF00' : '#FF0000')
            .setTitle(result.success ? '✅ Rôles supprimés' : '❌ Erreur')
            .setDescription(result.message || result.error)
            .setTimestamp();

        const backRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('suspension_back_config')
                    .setLabel('Retour à la configuration')
                    .setEmoji('⬅️')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ embeds: [resultEmbed], components: [backRow] });

    } catch (error) {
        // console.error('Erreur lors de la suppression des rôles:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de la suppression des rôles.')
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function configureRolePermissions(interaction) {
    try {
        const guild = interaction.guild;
        const config = await getGuildConfig(guild.id);
        
        const permissionsEmbed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('🔧 Configuration des permissions')
            .setDescription(`Configurez les canaux visibles pour les utilisateurs suspendus.
            
**Canaux actuellement visibles :** ${config.visibleChannels.length} canaux`)
            .addFields(
                { name: '📝 Instructions', value: 'Utilisez le menu déroulant ci-dessous pour sélectionner les canaux que les utilisateurs suspendus peuvent voir.', inline: false },
                { name: '⚠️ Important', value: 'Les permissions seront automatiquement appliquées à tous les canaux du serveur.', inline: false }
            )
            .setTimestamp();

        const channelSelect = new ActionRowBuilder()
            .addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId('suspension_select_visible_channels')
                    .setPlaceholder('Sélectionnez les canaux visibles...')
                    .setChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice)
                    .setMinValues(0)
                    .setMaxValues(25)
            );

        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('suspension_apply_permissions')
                    .setLabel('Appliquer les permissions')
                    .setEmoji('✅')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('suspension_back_config')
                    .setLabel('Retour')
                    .setEmoji('⬅️')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ 
            embeds: [permissionsEmbed], 
            components: [channelSelect, actionRow]
        });

    } catch (error) {
        // console.error('Erreur lors de la configuration des permissions:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de la configuration des permissions.')
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

// Affiche le modal pour appliquer une suspension
async function showSuspensionModal(interaction, level) {
    try {
        const modal = new ModalBuilder()
            .setCustomId(`suspension_modal_level${level}`)
            .setTitle(`🔒 Suspension Niveau ${level}`);

        const userInput = new TextInputBuilder()
            .setCustomId('target_user')
            .setLabel('Utilisateur à suspendre')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('ID ou mention de l\'utilisateur')
            .setRequired(true);

        const reasonInput = new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('Raison de la suspension')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Décrivez la raison de cette suspension...')
            .setRequired(true)
            .setMaxLength(1000);

        const durationInput = new TextInputBuilder()
            .setCustomId('duration')
            .setLabel('Durée (optionnel)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: 1h, 30m, 2d (laissez vide pour durée par défaut)')
            .setRequired(false);

        const firstRow = new ActionRowBuilder().addComponents(userInput);
        const secondRow = new ActionRowBuilder().addComponents(reasonInput);
        const thirdRow = new ActionRowBuilder().addComponents(durationInput);

        modal.addComponents(firstRow, secondRow, thirdRow);

        await interaction.showModal(modal);

    } catch (error) {
        // console.error('Erreur lors de l\'affichage du modal de suspension:', error);
        await interaction.reply({ 
            content: '❌ Erreur lors de l\'ouverture du modal.', 
            flags: MessageFlags.Ephemeral 
        });
    }
}

// Gère la soumission du modal de suspension
async function handleSuspensionModalSubmit(interaction) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const level = parseInt(interaction.customId.replace('suspension_modal_level', ''));
        const targetUserInput = interaction.fields.getTextInputValue('target_user');
        const reason = interaction.fields.getTextInputValue('reason');
        const durationInput = interaction.fields.getTextInputValue('duration') || '';

        // Résoudre l'utilisateur
        const userId = targetUserInput.replace(/[<@!>]/g, '');
        const targetMember = await interaction.guild.members.fetch(userId).catch(() => null);

        if (!targetMember) {
            const errorEmbed = createErrorEmbed('Utilisateur Introuvable', [
                'Vérifiez l\'ID ou la mention de l\'utilisateur',
                'Assurez-vous que l\'utilisateur est sur ce serveur'
            ]);
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }

        // Validation complète
        const validation = await validateSuspensionAction(
            interaction, 
            targetMember, 
            targetUserInput, 
            reason, 
            durationInput
        );

        if (!validation.isValid) {
            const errorEmbed = createErrorEmbed('Validation Échouée', validation.errors, validation.warnings);
            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }

        // Afficher les avertissements s'il y en a
        if (validation.warnings.length > 0) {
            const warningEmbed = new EmbedBuilder()
                .setTitle('⚠️ Avertissements Détectés')
                .setDescription('Des avertissements ont été détectés. Voulez-vous continuer ?')
                .setColor('#f39c12')
                .addFields({
                    name: 'Avertissements',
                    value: validation.warnings.map(w => `• ${w}`).join('\n'),
                    inline: false
                })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`suspension_confirm_${level}_${userId}_${encodeURIComponent(reason)}_${encodeURIComponent(durationInput)}`)
                        .setLabel('Continuer malgré les avertissements')
                        .setEmoji('⚠️')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('suspension_back_main')
                        .setLabel('Annuler')
                        .setEmoji('❌')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.editReply({ embeds: [warningEmbed], components: [row] });
            return;
        }

        // Calculer la durée
        let duration = getDefaultDuration(level);
        if (durationInput.trim()) {
            const customDuration = parseDuration(durationInput);
            if (customDuration > 0) {
                duration = customDuration;
            }
        }

        // Appliquer la suspension
        const result = await applySuspension(interaction, targetMember, level, reason, duration);

        if (result.success) {
            const embed = new EmbedBuilder()
                .setColor('#FF6B35')
                .setTitle('🔒 Suspension appliquée')
                .setDescription(`${targetMember.user.tag} a été suspendu avec succès.`)
                .addFields(
                    { name: '📊 Niveau', value: `Niveau ${level}`, inline: true },
                    { name: '⏱️ Durée', value: formatDuration(duration), inline: true },
                    { name: '📝 Raison', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.editReply({ 
                content: `❌ Erreur lors de l'application de la suspension: ${result.error}` 
            });
        }

    } catch (error) {
        // console.error('Erreur lors de la soumission du modal de suspension:', error);
        await interaction.editReply({ 
            content: '❌ Une erreur est survenue lors de l\'application de la suspension.' 
        });
    }
}

// Applique une suspension à un utilisateur
async function applySuspension(interaction, targetMember, level, reason, duration) {
    try {
        const guild = interaction.guild;
        const config = await getGuildConfig(guild.id);

        // Vérifier que les rôles existent
        const roleId = config.roles[`level${level}`];
        if (!roleId) {
            return { success: false, error: 'Rôle de suspension non configuré' };
        }

        const role = guild.roles.cache.get(roleId);
        if (!role) {
            return { success: false, error: 'Rôle de suspension introuvable' };
        }

        // Sauvegarder l'état avant la suspension pour le rollback
        const previousState = {
            roles: targetMember.roles.cache.map(r => r.id),
            suspensionLevel: null
        };

        // Vérifier s'il y a déjà une suspension active
        const existingSuspension = await getSuspensionInfo(guild.id, targetMember.id);
        if (existingSuspension) {
            previousState.suspensionLevel = existingSuspension.level;
        }

        // Retirer les autres rôles de suspension s'ils existent
        const rolesToRemove = [];
        for (let i = 1; i <= 3; i++) {
            const otherRoleId = config.roles[`level${i}`];
            if (otherRoleId && i !== level && targetMember.roles.cache.has(otherRoleId)) {
                rolesToRemove.push(otherRoleId);
            }
        }

        if (rolesToRemove.length > 0) {
            await targetMember.roles.remove(rolesToRemove, `Suspension niveau ${level}: ${reason}`);
        }

        // Ajouter le nouveau rôle
        await targetMember.roles.add(role, `Suspension niveau ${level}: ${reason}`);

        // Sauvegarder pour le rollback
        const newState = {
            suspensionRole: roleId,
            suspensionLevel: level,
            removedRoles: rolesToRemove
        };

        await saveSuspensionState(
            guild.id,
            targetMember.id,
            'suspension_apply',
            previousState,
            newState,
            interaction.user.id
        );

        // Démarrer le timer
        const suspensionId = await startSuspensionTimer(
            interaction.client,
            guild.id,
            targetMember.id,
            duration,
            reason,
            interaction.user.id,
            level
        );

        // Envoyer une notification à l'utilisateur si activé
        if (config.notifyUser) {
            await sendSuspensionNotification(targetMember, level, reason, duration);
        }

        // Envoyer un log
        await sendSuspensionLog(interaction, targetMember, level, reason, duration);

        return { success: true, suspensionId };

    } catch (error) {
        // console.error('Erreur lors de l\'application de la suspension:', error);
        return { success: false, error: error.message };
    }
}

// Envoie une notification de suspension à l'utilisateur
async function sendSuspensionNotification(member, level, reason, duration) {
    try {
        const embed = new EmbedBuilder()
            .setColor('#FF6B35')
            .setTitle('🔒 Vous avez été suspendu')
            .setDescription(`Vous avez reçu une suspension de niveau ${level} sur le serveur **${member.guild.name}**.`)
            .addFields(
                { name: '📊 Niveau', value: `Niveau ${level}`, inline: true },
                { name: '⏱️ Durée', value: formatDuration(duration), inline: true },
                { name: '📝 Raison', value: reason, inline: false },
                { name: '🕐 Expiration', value: `<t:${Math.floor((Date.now() + duration) / 1000)}:F>`, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'Cette suspension expirera automatiquement' });

        await member.send({ embeds: [embed] }).catch(() => {
            // console.log(`Impossible d'envoyer un MP à ${member.user.tag}`);
        });

    } catch (error) {
        // console.error('Erreur lors de l\'envoi de la notification:', error);
    }
}

// Envoie un log de suspension
async function sendSuspensionLog(interaction, targetMember, level, reason, duration) {
    try {
        const config = await getGuildConfig(interaction.guild.id);
        if (!config.logChannel) return;

        const logChannel = interaction.guild.channels.cache.get(config.logChannel);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor('#FF6B35')
            .setTitle('🔒 Suspension appliquée')
            .setDescription(`${targetMember.user.tag} a été suspendu.`)
            .addFields(
                { name: '👤 Utilisateur', value: `${targetMember.user.tag} (${targetMember.id})`, inline: true },
                { name: '🛡️ Modérateur', value: `${interaction.user.tag}`, inline: true },
                { name: '📊 Niveau', value: `Niveau ${level}`, inline: true },
                { name: '⏱️ Durée', value: formatDuration(duration), inline: true },
                { name: '🕐 Expiration', value: `<t:${Math.floor((Date.now() + duration) / 1000)}:F>`, inline: true },
                { name: '📝 Raison', value: reason, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'Système de suspension automatique' });

        // Boutons d'action pour le staff
        const actionRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`suspension_log_cancel_${targetMember.id}`)
                    .setLabel('Annuler')
                    .setEmoji('🔓')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`suspension_log_modify_${targetMember.id}`)
                    .setLabel('Modifier')
                    .setEmoji('✏️')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`suspension_log_info_${targetMember.id}`)
                    .setLabel('Infos')
                    .setEmoji('ℹ️')
                    .setStyle(ButtonStyle.Secondary)
            );

        await logChannel.send({ embeds: [embed], components: [actionRow] });

    } catch (error) {
        // console.error('Erreur lors de l\'envoi du log:', error);
    }
}

// Affiche les suspensions actives
async function showActiveSuspensions(interaction) {
    try {
        const activeSuspensions = await getActiveSuspensions(interaction.guild.id);

        if (activeSuspensions.length === 0) {
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Aucune suspension active')
                .setDescription('Il n\'y a actuellement aucune suspension active sur ce serveur.')
                .setTimestamp();

            const backButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('suspension_back_main')
                        .setLabel('Retour')
                        .setEmoji('⬅️')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.editReply({ embeds: [embed], components: [backButton] });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#FF6B35')
            .setTitle('🔒 Suspensions actives')
            .setDescription(`**${activeSuspensions.length}** suspension(s) active(s) sur ce serveur :`)
            .setTimestamp();

        // Ajouter les suspensions (max 25 fields)
        const maxSuspensions = Math.min(activeSuspensions.length, 25);
        for (let i = 0; i < maxSuspensions; i++) {
            const suspension = activeSuspensions[i];
            const user = await interaction.client.users.fetch(suspension.userId).catch(() => null);
            const userName = user ? user.tag : `ID: ${suspension.userId}`;

            embed.addFields({
                name: `👤 ${userName}`,
                value: `**Niveau:** ${suspension.level}\n**Expire dans:** ${suspension.timeLeftFormatted}\n**Raison:** ${suspension.reason.substring(0, 100)}${suspension.reason.length > 100 ? '...' : ''}`,
                inline: true
            });
        }

        if (activeSuspensions.length > 25) {
            embed.setFooter({ text: `... et ${activeSuspensions.length - 25} autres suspensions` });
        }

        const backButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('suspension_back_main')
                    .setLabel('Retour')
                    .setEmoji('⬅️')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ embeds: [embed], components: [backButton] });

    } catch (error) {
        // console.error('Erreur lors de l\'affichage des suspensions actives:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de la récupération des suspensions actives.')
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

// Applique les permissions de canal
async function applyChannelPermissions(interaction) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const config = await getGuildConfig(interaction.guild.id);
        const guild = interaction.guild;

        // Vérifier que les rôles existent
        const roles = [];
        for (let i = 1; i <= 3; i++) {
            const roleId = config.roles[`level${i}`];
            if (roleId) {
                const role = guild.roles.cache.get(roleId);
                if (role) {
                    roles.push(role);
                }
            }
        }

        if (roles.length === 0) {
            await interaction.editReply({ 
                content: '❌ Aucun rôle de suspension configuré.' 
            });
            return;
        }

        // Appliquer les permissions à tous les canaux
        const channels = guild.channels.cache.filter(channel => 
            channel.type === ChannelType.GuildText || 
            channel.type === ChannelType.GuildVoice ||
            channel.type === ChannelType.GuildCategory
        );

        let successCount = 0;
        let errorCount = 0;

        for (const [channelId, channel] of channels) {
            try {
                for (const role of roles) {
                    // Permissions par défaut pour les suspensions
                    const permissions = {
                        [PermissionFlagsBits.SendMessages]: false,
                        [PermissionFlagsBits.AddReactions]: false,
                        [PermissionFlagsBits.CreatePublicThreads]: false,
                        [PermissionFlagsBits.CreatePrivateThreads]: false,
                        [PermissionFlagsBits.SendMessagesInThreads]: false,
                        [PermissionFlagsBits.Connect]: false,
                        [PermissionFlagsBits.Speak]: false
                    };

                    // Si le canal est dans la liste des canaux visibles, autoriser la lecture
                    if (config.visibleChannels && config.visibleChannels.includes(channelId)) {
                        permissions[PermissionFlagsBits.ViewChannel] = true;
                        permissions[PermissionFlagsBits.ReadMessageHistory] = true;
                    } else {
                        permissions[PermissionFlagsBits.ViewChannel] = false;
                    }

                    await channel.permissionOverwrites.edit(role, permissions);
                }
                successCount++;
            } catch (error) {
                // console.error(`Erreur pour le canal ${channel.name}:`, error);
                errorCount++;
            }
        }

        const embed = new EmbedBuilder()
            .setColor(errorCount === 0 ? '#00FF00' : '#FFA500')
            .setTitle('🔧 Permissions appliquées')
            .setDescription(`Les permissions ont été configurées pour les rôles de suspension.`)
            .addFields(
                { name: '✅ Canaux configurés', value: `${successCount}`, inline: true },
                { name: '❌ Erreurs', value: `${errorCount}`, inline: true },
                { name: '🔒 Rôles traités', value: `${roles.length}`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        // console.error('Erreur lors de l\'application des permissions:', error);
        await interaction.editReply({ 
            content: '❌ Une erreur est survenue lors de l\'application des permissions.' 
        });
    }
}

// Obtient la durée par défaut selon le niveau
function getDefaultDuration(level) {
    const durations = {
        1: 1 * 60 * 60 * 1000,      // 1 heure
        2: 24 * 60 * 60 * 1000,     // 1 jour
        3: 7 * 24 * 60 * 60 * 1000  // 1 semaine
    };
    return durations[level] || durations[1];
}

// Parse une durée depuis un texte (ex: "1h", "30m", "2d")
function parseDuration(durationText) {
    const regex = /(\d+)([smhd])/g;
    let totalMs = 0;
    let match;

    while ((match = regex.exec(durationText.toLowerCase())) !== null) {
        const value = parseInt(match[1]);
        const unit = match[2];

        switch (unit) {
            case 's':
                totalMs += value * 1000;
                break;
            case 'm':
                totalMs += value * 60 * 1000;
                break;
            case 'h':
                totalMs += value * 60 * 60 * 1000;
                break;
            case 'd':
                totalMs += value * 24 * 60 * 60 * 1000;
                break;
        }
    }

    return totalMs;
}

// Fonctions de gestion des permissions avancées
async function showPermissionsPanel(interaction) {
    const guildId = interaction.guild.id;
    const config = await getGuildConfig(guildId);
    
    const embed = new EmbedBuilder()
        .setTitle('🔐 Gestion des Permissions Avancées')
        .setDescription('Configurez les permissions par niveau de suspension et gérez les canaux visibles.')
        .setColor('#9b59b6')
        .addFields(
            {
                name: '📊 État Actuel',
                value: `• Canaux configurés: ${config.visibleChannels?.length || 0}
• Permissions par niveau: ${config.levelPermissions ? '✅ Configurées' : '❌ Non configurées'}`,
                inline: false
            },
            {
                name: '🎯 Actions Disponibles',
                value: `• **Appliquer toutes les permissions**: Configure automatiquement tous les niveaux
• **Configurer par niveau**: Personnalise les permissions pour chaque niveau
• **Voir le statut**: Affiche l'état détaillé des permissions`,
                inline: false
            }
        )
        .setFooter({ text: 'Utilisez les boutons ci-dessous pour gérer les permissions' });

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_permissions_apply_all')
                .setLabel('Appliquer Toutes')
                .setEmoji('🔧')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('suspension_permissions_status')
                .setLabel('Voir Statut')
                .setEmoji('📊')
                .setStyle(ButtonStyle.Primary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_permissions_level1')
                .setLabel('Niveau 1')
                .setEmoji('1️⃣')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('suspension_permissions_level2')
                .setLabel('Niveau 2')
                .setEmoji('2️⃣')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('suspension_permissions_level3')
                .setLabel('Niveau 3')
                .setEmoji('3️⃣')
                .setStyle(ButtonStyle.Secondary)
        );

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_config_back')
                .setLabel('Retour Config')
                .setEmoji('🔙')
                .setStyle(ButtonStyle.Danger)
        );

    await interaction.editReply({
        embeds: [embed],
        components: [row1, row2, row3]
    });
}

async function handlePermissionsApplyAll(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    try {
        const result = await applyAllLevelPermissions(interaction.guild);
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Permissions Appliquées')
            .setDescription('Toutes les permissions par niveau ont été configurées avec succès.')
            .setColor('#27ae60')
            .addFields(
                {
                    name: '📊 Résultats',
                    value: `• Canaux configurés: ${result.channelsConfigured}
• Erreurs: ${result.errors}
• Niveaux appliqués: ${result.levelsApplied.join(', ')}`,
                    inline: false
                }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        // console.error('Erreur lors de l\'application des permissions:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de l\'application des permissions.')
            .setColor('#e74c3c')
            .addFields({
                name: 'Détails',
                value: error.message || 'Erreur inconnue',
                inline: false
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function handlePermissionsLevel(interaction, level) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    try {
        const result = await applyLevelPermissions(interaction.guild, level);
        
        const embed = new EmbedBuilder()
            .setTitle(`✅ Permissions Niveau ${level} Appliquées`)
            .setDescription(`Les permissions pour le niveau ${level} ont été configurées.`)
            .setColor('#3498db')
            .addFields(
                {
                    name: '📊 Résultats',
                    value: `• Canaux configurés: ${result.channelsConfigured}
• Erreurs: ${result.errors}
• Permissions appliquées: ${Object.keys(PERMISSION_CONFIGS[`level${level}`].permissions).length}`,
                    inline: false
                }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        // console.error(`Erreur lors de l'application des permissions niveau ${level}:`, error);
        
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Erreur')
            .setDescription(`Une erreur est survenue lors de l'application des permissions niveau ${level}.`)
            .setColor('#e74c3c')
            .addFields({
                name: 'Détails',
                value: error.message || 'Erreur inconnue',
                inline: false
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

async function handlePermissionsStatus(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    try {
        const statusEmbed = await createPermissionStatusEmbed(interaction.guild);
        await interaction.editReply({ embeds: [statusEmbed] });
    } catch (error) {
        // console.error('Erreur lors de la récupération du statut des permissions:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de la récupération du statut des permissions.')
            .setColor('#e74c3c')
            .addFields({
                name: 'Détails',
                value: error.message || 'Erreur inconnue',
                inline: false
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

// Fonction pour afficher le panneau de durée custom
async function showCustomDurationPanel(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('⏰ Suspension avec Durée Custom')
        .setDescription('Choisissez le niveau de suspension et définissez une durée personnalisée.')
        .setColor('#f39c12')
        .addFields(
            {
                name: '🎯 Instructions',
                value: `• Sélectionnez le niveau de suspension souhaité
• Vous pourrez ensuite définir une durée personnalisée
• Format accepté: 1h30m, 2d, 30m, 1w2d, etc.`,
                inline: false
            },
            {
                name: '📋 Niveaux Disponibles',
                value: `• **Niveau 1**: Suspension légère
• **Niveau 2**: Suspension modérée  
• **Niveau 3**: Suspension sévère
• **Annulation**: Retirer une suspension existante`,
                inline: false
            }
        )
        .setFooter({ text: 'Cliquez sur un bouton pour commencer' });

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_custom_level1')
                .setLabel('Niveau 1 Custom')
                .setEmoji('1️⃣')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('suspension_custom_level2')
                .setLabel('Niveau 2 Custom')
                .setEmoji('2️⃣')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('suspension_custom_level3')
                .setLabel('Niveau 3 Custom')
                .setEmoji('3️⃣')
                .setStyle(ButtonStyle.Primary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_custom_cancel')
                .setLabel('Annuler Suspension')
                .setEmoji('🔓')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('suspension_back_main')
                .setLabel('Retour')
                .setEmoji('🔙')
                .setStyle(ButtonStyle.Danger)
        );

    await interaction.editReply({
        embeds: [embed],
        components: [row1, row2]
    });
}

// Gérer la confirmation de rollback
async function handleRollbackConfirm(interaction, rollbackId) {
    try {
        const result = await performRollback(interaction.guild, rollbackId, interaction.user.id);
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Rollback Effectué')
            .setDescription('L\'action a été annulée avec succès.')
            .setColor('#27ae60')
            .addFields(
                { name: 'Action annulée', value: result.action, inline: true },
                { name: 'Utilisateur', value: `<@${result.userId}>`, inline: true },
                { name: 'Modérateur', value: `<@${interaction.user.id}>`, inline: true }
            )
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('suspension_back_main')
                    .setLabel('Retour au menu principal')
                    .setEmoji('🔙')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ embeds: [embed], components: [row] });

    } catch (error) {
        // console.error('Erreur lors du rollback:', error);
        
        const embed = new EmbedBuilder()
            .setTitle('❌ Erreur de Rollback')
            .setDescription(`Impossible d'effectuer le rollback: ${error.message}`)
            .setColor('#e74c3c')
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('suspension_rollback')
                    .setLabel('Retour aux rollbacks')
                    .setEmoji('🔙')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.editReply({ embeds: [embed], components: [row] });
    }
}

// Fonction pour afficher le diagnostic système
async function showSystemDiagnostic(interaction) {
    try {
        const healthCheck = await performSystemHealthCheck(interaction.guild);
        
        const embed = new EmbedBuilder()
            .setTitle('🔧 Diagnostic Système')
            .setDescription('État de santé du système de suspension')
            .setColor(healthCheck.overall === 'healthy' ? '#2ecc71' : 
                     healthCheck.overall === 'warning' ? '#f39c12' : '#e74c3c')
            .setTimestamp();

        // Statut général
        embed.addFields({
            name: '📊 Statut Général',
            value: healthCheck.overall === 'healthy' ? '✅ Système opérationnel' :
                   healthCheck.overall === 'warning' ? '⚠️ Avertissements détectés' :
                   '❌ Problèmes critiques détectés',
            inline: false
        });

        // Détails des vérifications
        if (healthCheck.checks.length > 0) {
            const checksText = healthCheck.checks.map(check => 
                `${check.status === 'pass' ? '✅' : check.status === 'warning' ? '⚠️' : '❌'} ${check.name}: ${check.message}`
            ).join('\n');
            
            embed.addFields({
                name: '🔍 Détails des Vérifications',
                value: checksText.length > 1024 ? checksText.substring(0, 1021) + '...' : checksText,
                inline: false
            });
        }

        // Statistiques
        if (healthCheck.stats) {
            embed.addFields({
                name: '📈 Statistiques',
                value: `Suspensions actives: ${healthCheck.stats.activeSuspensions || 0}\n` +
                       `Rollbacks disponibles: ${healthCheck.stats.availableRollbacks || 0}\n` +
                       `Dernière vérification: ${new Date().toLocaleString('fr-FR')}`,
                inline: false
            });
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('suspension_diagnostic')
                    .setLabel('Actualiser')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('suspension_back_main')
                    .setLabel('Retour au menu principal')
                    .setEmoji('🔙')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({ embeds: [embed], components: [row] });

    } catch (error) {
        // console.error('Erreur lors du diagnostic système:', error);
        
        const embed = createErrorEmbed(
            'Erreur de Diagnostic',
            `Impossible d'effectuer le diagnostic: ${error.message}`
        );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('suspension_back_main')
                    .setLabel('Retour au menu principal')
                    .setEmoji('🔙')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({ embeds: [embed], components: [row] });
    }
}

// Fonction pour gérer la confirmation de suspension avec avertissements
async function handleSuspensionConfirm(interaction) {
    try {
        // Récupérer les données stockées temporairement
        const customId = interaction.customId;
        const level = customId.replace('suspension_confirm_', '');
        
        // Récupérer les données du modal original
        const userId = interaction.message.embeds[0]?.fields?.find(f => f.name.includes('Utilisateur'))?.value?.match(/<@(\d+)>/)?.[1];
        const reason = interaction.message.embeds[0]?.fields?.find(f => f.name.includes('Raison'))?.value;
        const duration = interaction.message.embeds[0]?.fields?.find(f => f.name.includes('Durée'))?.value;

        if (!userId) {
            throw new Error('Impossible de récupérer les informations de l\'utilisateur');
        }

        const member = await interaction.guild.members.fetch(userId);
        
        // Appliquer la suspension
        await applySuspension(interaction, member, level, reason, duration);

    } catch (error) {
        // console.error('Erreur lors de la confirmation de suspension:', error);
        
        const embed = createErrorEmbed(
            'Erreur de Confirmation',
            `Impossible de confirmer la suspension: ${error.message}`
        );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('suspension_back_main')
                    .setLabel('Retour au menu principal')
                    .setEmoji('🔙')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({ embeds: [embed], components: [row] });
    }
}