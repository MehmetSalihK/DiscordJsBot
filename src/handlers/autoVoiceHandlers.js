import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, MessageFlags, ChannelType } from 'discord.js';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const autoVoiceChannelsPath = path.join(__dirname, '../../json/autoVoiceChannels.json');
const voiceActivityLogsPath = path.join(__dirname, '../../json/voiceActivityLogs.json');

// 🎨 Couleurs pour les embeds
const COLORS = {
    SUCCESS: '#00FF88',
    ERROR: '#FF4444',
    WARNING: '#FFB347',
    INFO: '#5865F2',
    PRIVACY: '#9B59B6',
    DANGER: '#DC143C'
};

// 📊 Statistiques en temps réel
const channelStats = new Map();

// Fonction pour charger les données
function loadAutoVoiceData() {
    try {
        if (!fs.existsSync(autoVoiceChannelsPath)) {
            fs.writeFileSync(autoVoiceChannelsPath, '{}');
            return {};
        }
        const data = fs.readFileSync(autoVoiceChannelsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors du chargement des données:', error);
        return {};
    }
}

// Fonction pour sauvegarder les données
function saveAutoVoiceData(data) {
    try {
        fs.writeFileSync(autoVoiceChannelsPath, JSON.stringify(data, null, 2));
        console.log('[AUTO-VOICE] 💾 Données sauvegardées avec succès');
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors de la sauvegarde des données:', error);
    }
}

// Fonction pour charger les logs d'activité vocale
function loadVoiceActivityLogs() {
    try {
        if (!fs.existsSync(voiceActivityLogsPath)) {
            fs.writeFileSync(voiceActivityLogsPath, '{}');
            return {};
        }
        const data = fs.readFileSync(voiceActivityLogsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('[VOICE-LOGS] ❌ Erreur lors du chargement des logs:', error);
        return {};
    }
}

// 📈 Fonction pour mettre à jour les statistiques
function updateChannelStats(channelId, action, userId) {
    if (!channelStats.has(channelId)) {
        channelStats.set(channelId, {
            totalJoins: 0,
            totalLeaves: 0,
            uniqueUsers: new Set(),
            lastActivity: Date.now(),
            peakMembers: 0
        });
    }
    
    const stats = channelStats.get(channelId);
    stats.lastActivity = Date.now();
    stats.uniqueUsers.add(userId);
    
    if (action === 'join') stats.totalJoins++;
    if (action === 'leave') stats.totalLeaves++;
}

// 🎯 Fonction pour obtenir le statut du salon
function getChannelStatus(channel) {
    const everyoneOverwrite = channel.permissionOverwrites.cache.get(channel.guild.roles.everyone.id);
    
    if (!everyoneOverwrite) {
        return { status: 'public', emoji: '🌐', label: 'Public', description: 'Accessible à tous' };
    }
    
    const canView = !everyoneOverwrite.deny.has('ViewChannel');
    const canConnect = !everyoneOverwrite.deny.has('Connect');
    
    if (!canView && !canConnect) {
        return { status: 'invisible', emoji: '👻', label: 'Invisible', description: 'Masqué de tous' };
    }
    
    if (canView && !canConnect) {
        return { status: 'locked', emoji: '🔐', label: 'Verrouillé', description: 'Visible mais inaccessible' };
    }
    
    if (!canView && !canConnect) {
        return { status: 'private', emoji: '🔒', label: 'Privé', description: 'Accès restreint' };
    }
    
    return { status: 'public', emoji: '🌐', label: 'Public', description: 'Accessible à tous' };
}

// Gestionnaire principal pour les boutons du panneau de gestion
async function handleManagementButtons(interaction) {
    try {
        const startTime = Date.now();
        console.log(`[AUTO-VOICE] 🔘 Bouton cliqué: ${interaction.customId} par ${interaction.user.displayName}`);
        
        const customIdParts = interaction.customId.split('_');
        const [prefix, action] = customIdParts;
        let channelId;
        
        // Gérer les IDs avec des parties supplémentaires
        if (action === 'delete' && customIdParts[2] === 'confirm') {
            channelId = customIdParts[3];
            return await handleDeleteConfirm(interaction, channelId);
        } else if (action === 'delete' && customIdParts[2] === 'cancel') {
            channelId = customIdParts[3];
            return await handleDeleteCancel(interaction);
        } else {
            channelId = customIdParts[2];
        }
        
        const channel = interaction.guild.channels.cache.get(channelId);
        
        if (!channel) {
            return await sendErrorEmbed(interaction, 'Salon introuvable', 'Le salon vocal n\'existe plus ou a été supprimé.');
        }

        const autoVoiceData = loadAutoVoiceData();
        const guildId = interaction.guild.id;
        
        // Trouver le propriétaire du salon
        let channelData = null;
        if (autoVoiceData[guildId] && autoVoiceData[guildId].userChannels) {
            channelData = Object.values(autoVoiceData[guildId].userChannels).find(
                data => data.channelId === channelId
            );
        }

        if (!channelData) {
            return await sendErrorEmbed(interaction, 'Données du salon introuvables', 
                'Ce salon n\'est pas géré par le système de salons vocaux automatiques.');
        }

        // Actions accessibles à tous (pas de vérification de permissions)
        const publicActions = ['unlock'];
        
        // Vérifier les permissions seulement pour les actions privées
        const isOwner = channelData.ownerId === interaction.user.id;
        const isAuthorized = channelData.authorizedUsers && channelData.authorizedUsers.includes(interaction.user.id);
        const hasAdminPerms = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        
        if (!publicActions.includes(action) && !isOwner && !isAuthorized && !hasAdminPerms) {
            return await sendAccessDeniedEmbed(interaction, channelData, channel);
        }

        console.log(`[AUTO-VOICE] ✅ ${interaction.user.displayName} utilise l'action: ${action} sur le salon: ${channel.name}`);

        // Router vers la fonction appropriée
        const actionHandlers = {
            'kick': handleKickAction,
            'ban': handleBanAction,
            'unban': handleUnbanAction,
            'blacklist': handleBlacklistAction,
            'permissions': handlePermissionsAction,
            'edit': handleEditAction,
            'privacy': handlePrivacyAction,
            'lock': handleLockAction,
            'invisible': handleInvisibleAction,
            'claim': handleClaimAction,
            'refresh': handleRefreshAction,
            'delete': handleDeleteAction,
            'logs': handleLogsAction,
            'stats': handleStatsAction,
            'settings': handleSettingsAction,
            'password': handlePasswordAction,
            'unlock': handlePasswordUnlockAction,

        };

        const handler = actionHandlers[action];
        if (handler) {
            await handler(interaction, channel, channelData);
            
            // Log du temps d'exécution
            const executionTime = Date.now() - startTime;
            console.log(`[AUTO-VOICE] ⚡ Action ${action} exécutée en ${executionTime}ms`);
        } else {
            await sendErrorEmbed(interaction, 'Action inconnue', `Cette action n'est pas reconnue: ${action}`);
        }

    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur dans le gestionnaire de boutons:', error);
        await sendSystemErrorEmbed(interaction, error);
    }
}

// 🔒 Action: Basculer la confidentialité (privé/public) en temps réel
async function handlePrivacyAction(interaction, channel, channelData) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const currentStatus = getChannelStatus(channel);
        let newStatus, embed;
        
        if (currentStatus.status === 'public') {
            // Rendre privé
            await channel.permissionOverwrites.edit(channel.guild.roles.everyone.id, {
                Connect: false,
                ViewChannel: false
            });
            
            embed = createStatusEmbed('🔒 **Salon rendu privé**', COLORS.PRIVACY, {
                salon: channel.name,
                statut: '🔒 Privé',
                acces: 'Propriétaire + autorisés uniquement',
                effet: 'Seuls vous et les personnes autorisées peuvent voir et rejoindre ce salon.'
            });
            
            newStatus = 'private';
        } else {
            // Rendre public
            await channel.permissionOverwrites.edit(channel.guild.roles.everyone.id, {
                Connect: null,
                ViewChannel: null
            });
            
            embed = createStatusEmbed('🔓 **Salon rendu public**', COLORS.SUCCESS, {
                salon: channel.name,
                statut: '🌐 Public',
                acces: 'Tout le monde peut rejoindre',
                effet: 'Tous les membres du serveur peuvent maintenant voir et rejoindre votre salon.'
            });
            
            newStatus = 'public';
        }
        
        await interaction.editReply({ embeds: [embed] });
        
        // Actualiser le panneau après un délai
        setTimeout(() => updateManagementPanel(channel, channelData), 1500);
        
        // Log de l'action
        console.log(`[AUTO-VOICE] 🔒 ${channel.name} changé vers ${newStatus} par ${interaction.user.displayName}`);
        
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors du changement de confidentialité:', error);
        await sendSystemErrorEmbed(interaction, error);
    }
}

// 🔐 Action: Verrouiller le salon
async function handleLockAction(interaction, channel, channelData) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const currentStatus = getChannelStatus(channel);
        let embed;
        
        if (currentStatus.status === 'locked') {
            // Déverrouiller
            await channel.permissionOverwrites.edit(channel.guild.roles.everyone.id, {
                Connect: null
            });
            
            embed = createStatusEmbed('🔓 **Salon déverrouillé**', COLORS.SUCCESS, {
                salon: channel.name,
                statut: '🔓 Déverrouillé',
                connexions: 'Autorisées',
                effet: 'Les nouveaux membres peuvent maintenant rejoindre votre salon.'
            });
        } else {
            // Verrouiller
            await channel.permissionOverwrites.edit(channel.guild.roles.everyone.id, {
                Connect: false,
                ViewChannel: true
            });
            
            embed = createStatusEmbed('🔐 **Salon verrouillé**', COLORS.WARNING, {
                salon: channel.name,
                statut: '🔐 Verrouillé',
                visibilite: 'Visible mais inaccessible',
                effet: 'Les membres actuels restent, mais aucune nouvelle connexion n\'est possible.'
            });
        }
        
        await interaction.editReply({ embeds: [embed] });
        setTimeout(() => updateManagementPanel(channel, channelData), 1500);
        
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors du verrouillage:', error);
        await sendSystemErrorEmbed(interaction, error);
    }
}

// 👻 Action: Rendre invisible
async function handleInvisibleAction(interaction, channel, channelData) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const currentStatus = getChannelStatus(channel);
        let embed;
        
        if (currentStatus.status === 'invisible') {
            // Rendre visible
            await channel.permissionOverwrites.edit(channel.guild.roles.everyone.id, {
                ViewChannel: null
            });
            
            embed = createStatusEmbed('👁️ **Salon rendu visible**', COLORS.SUCCESS, {
                salon: channel.name,
                visibilite: '👁️ Visible',
                statut: 'Affiché dans la liste',
                effet: 'Votre salon apparaît à nouveau dans la liste des salons.'
            });
        } else {
            // Rendre invisible
            await channel.permissionOverwrites.edit(channel.guild.roles.everyone.id, {
                ViewChannel: false,
                Connect: false
            });
            
            embed = createStatusEmbed('👻 **Salon rendu invisible**', COLORS.PRIVACY, {
                salon: channel.name,
                visibilite: '👻 Invisible',
                statut: 'Masqué de tous',
                effet: 'Seuls les membres déjà connectés peuvent voir et utiliser ce salon.'
            });
        }
        
        await interaction.editReply({ embeds: [embed] });
        setTimeout(() => updateManagementPanel(channel, channelData), 1500);
        
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors du changement de visibilité:', error);
        await sendSystemErrorEmbed(interaction, error);
    }
}

// 🦵 Action: Expulser un membre (améliorée)
async function handleKickAction(interaction, channel, channelData) {
    try {
        const members = channel.members.filter(member => member.id !== channelData.ownerId);
        
        if (members.size === 0) {
            return await sendInfoEmbed(interaction, 'Aucun membre à expulser', 
                'Il n\'y a aucun membre dans ce salon à part vous.');
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`autovoice_kick_select_${channel.id}`)
            .setPlaceholder('🦵 Sélectionnez un membre à expulser')
            .addOptions(
                members.map(member => ({
                    label: member.displayName,
                    value: member.id,
                    description: `${member.user.tag} • Connecté depuis ${getConnectionTime(member, channel)}`,
                    emoji: '🦵'
                }))
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
            .setColor(COLORS.WARNING)
            .setTitle('🦵 **Expulser un membre**')
            .setDescription('Sélectionnez le membre que vous souhaitez expulser de votre salon vocal.')
            .addFields([
                { name: '👥 Membres présents', value: `${members.size} membre(s)`, inline: true },
                { name: '⚠️ Note', value: 'Le membre pourra rejoindre à nouveau sauf s\'il est banni.', inline: true },
                { name: '🔄 Action', value: 'Expulsion temporaire', inline: true }
            ])
            .setFooter({ text: 'Sélectionnez un membre dans le menu déroulant' })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            components: [row],
            flags: MessageFlags.Ephemeral
        });
        
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors de l\'expulsion:', error);
        await sendSystemErrorEmbed(interaction, error);
    }
}

// 🔨 Action: Bannir un membre (améliorée)
async function handleBanAction(interaction, channel, channelData) {
    try {
        const members = channel.members.filter(member => member.id !== channelData.ownerId);
        
        if (members.size === 0) {
            return await sendInfoEmbed(interaction, 'Aucun membre à bannir', 
                'Il n\'y a aucun membre dans ce salon à part vous.');
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`autovoice_ban_select_${channel.id}`)
            .setPlaceholder('🔨 Sélectionnez un membre à bannir')
            .addOptions(
                members.map(member => ({
                    label: member.displayName,
                    value: member.id,
                    description: `${member.user.tag} • Bannissement permanent`,
                    emoji: '🔨'
                }))
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
            .setColor(COLORS.DANGER)
            .setTitle('🔨 **Bannir un membre**')
            .setDescription('⚠️ **Action permanente** - Sélectionnez le membre à bannir définitivement.')
            .addFields([
                { name: '👥 Membres présents', value: `${members.size} membre(s)`, inline: true },
                { name: '🚫 Effet', value: 'Le membre ne pourra plus jamais rejoindre ce salon.', inline: true },
                { name: '🔄 Réversible', value: 'Uniquement via le bouton "Débannir"', inline: true }
            ])
            .setFooter({ text: '⚠️ Cette action est permanente jusqu\'au débannissement' })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            components: [row],
            flags: MessageFlags.Ephemeral
        });
        
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors du bannissement:', error);
        await sendSystemErrorEmbed(interaction, error);
    }
}

// 🔄 Action: Actualiser le panneau (améliorée)
async function handleRefreshAction(interaction, channel, channelData) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const startTime = Date.now();
        await updateManagementPanel(channel, channelData);
        const updateTime = Date.now() - startTime;
        
        const stats = channelStats.get(channel.id) || { totalJoins: 0, uniqueUsers: new Set() };
        
        const embed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle('🔄 **Panneau actualisé avec succès**')
            .setDescription('Le panneau de gestion a été mis à jour avec les dernières informations.')
            .addFields([
                { name: '📊 Informations actuelles', value: `\`\`\`yaml\nSalon: ${channel.name}\nMembres: ${channel.members.size}\nStatut: ${getChannelStatus(channel).label}\n\`\`\``, inline: false },
                { name: '⚡ Performance', value: `\`\`\`yaml\nMise à jour: ${updateTime}ms\nDernière activité: ${new Date().toLocaleTimeString()}\n\`\`\``, inline: true },
                { name: '📈 Statistiques', value: `\`\`\`yaml\nVisiteurs uniques: ${stats.uniqueUsers.size}\nTotal connexions: ${stats.totalJoins}\n\`\`\``, inline: true }
            ])
            .setFooter({ text: 'Panneau mis à jour automatiquement' })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        
        console.log(`[AUTO-VOICE] 🔄 Panneau actualisé pour ${channel.name} en ${updateTime}ms`);
        
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors de l\'actualisation:', error);
        await sendSystemErrorEmbed(interaction, error);
    }
}

// 📊 Action: Afficher les statistiques détaillées
async function handleStatsAction(interaction, channel, channelData) {
    try {
        const logs = loadVoiceActivityLogs();
        const channelLogs = logs[channel.id] || {};
        const stats = channelStats.get(channel.id) || { totalJoins: 0, totalLeaves: 0, uniqueUsers: new Set(), peakMembers: 0 };
        
        // Calculer les statistiques
        const totalUsers = Object.keys(channelLogs).length;
        const currentMembers = channel.members.size;
        const averageSession = totalUsers > 0 ? Math.round(stats.totalJoins / totalUsers) : 0;
        
        // Top utilisateurs
        const topUsers = Object.entries(channelLogs)
            .sort((a, b) => b[1].joinCount - a[1].joinCount)
            .slice(0, 5)
            .map(([userId, data], index) => `${index + 1}. ${data.username} (${data.joinCount} connexions)`)
            .join('\n') || 'Aucune donnée';

        const embed = new EmbedBuilder()
            .setColor(COLORS.INFO)
            .setTitle('📊 **Statistiques détaillées du salon**')
            .setDescription(`Analyse complète de l'activité pour **${channel.name}**`)
            .addFields([
                { 
                    name: '👥 **Activité générale**', 
                    value: `\`\`\`yaml\nMembres actuels: ${currentMembers}\nVisiteurs uniques: ${stats.uniqueUsers.size}\nTotal connexions: ${stats.totalJoins}\nTotal déconnexions: ${stats.totalLeaves}\nPic de fréquentation: ${stats.peakMembers}\n\`\`\``, 
                    inline: false 
                },
                { 
                    name: '📈 **Métriques**', 
                    value: `\`\`\`yaml\nSessions moyennes: ${averageSession}\nTaux de rétention: ${stats.totalLeaves > 0 ? Math.round((stats.totalJoins / stats.totalLeaves) * 100) : 100}%\nActivité récente: ${stats.lastActivity ? new Date(stats.lastActivity).toLocaleString() : 'Aucune'}\n\`\`\``, 
                    inline: true 
                },
                { 
                    name: '🏆 **Top utilisateurs**', 
                    value: `\`\`\`\n${topUsers}\n\`\`\``, 
                    inline: true 
                },
                { 
                    name: '⚙️ **Configuration**', 
                    value: `\`\`\`yaml\nStatut: ${getChannelStatus(channel).label}\nLimite: ${channel.userLimit || 'Illimitée'}\nQualité: ${Math.round(channel.bitrate / 1000)} kbps\nRégion: ${channel.rtcRegion || 'Auto'}\n\`\`\``, 
                    inline: false 
                }
            ])
            .setFooter({ text: 'Statistiques mises à jour en temps réel' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors de l\'affichage des stats:', error);
        await sendSystemErrorEmbed(interaction, error);
    }
}

// ⚙️ Action: Paramètres avancés
async function handleSettingsAction(interaction, channel, channelData) {
    try {
        const modal = new ModalBuilder()
            .setCustomId(`autovoice_settings_modal_${channel.id}`)
            .setTitle('⚙️ Paramètres avancés du salon');

        const nameInput = new TextInputBuilder()
            .setCustomId('channel_name')
            .setLabel('Nom du salon')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(channel.name)
            .setValue(channel.name)
            .setMaxLength(100)
            .setRequired(false);

        const limitInput = new TextInputBuilder()
            .setCustomId('user_limit')
            .setLabel('Limite d\'utilisateurs (0 = illimité)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(channel.userLimit.toString())
            .setValue(channel.userLimit.toString())
            .setMaxLength(2)
            .setRequired(false);

        const bitrateInput = new TextInputBuilder()
            .setCustomId('bitrate')
            .setLabel('Qualité audio (kbps, max 384)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder((channel.bitrate / 1000).toString())
            .setValue((channel.bitrate / 1000).toString())
            .setMaxLength(3)
            .setRequired(false);

        const regionInput = new TextInputBuilder()
            .setCustomId('region')
            .setLabel('Région vocale (auto, us-east, europe, etc.)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(channel.rtcRegion || 'auto')
            .setValue(channel.rtcRegion || 'auto')
            .setMaxLength(20)
            .setRequired(false);

        const descriptionInput = new TextInputBuilder()
            .setCustomId('description')
            .setLabel('Description du salon (optionnel)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Décrivez votre salon vocal...')
            .setMaxLength(500)
            .setRequired(false);

        const rows = [
            new ActionRowBuilder().addComponents(nameInput),
            new ActionRowBuilder().addComponents(limitInput),
            new ActionRowBuilder().addComponents(bitrateInput),
            new ActionRowBuilder().addComponents(regionInput),
            new ActionRowBuilder().addComponents(descriptionInput)
        ];

        modal.addComponents(...rows);
        await interaction.showModal(modal);
        
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors de l\'ouverture des paramètres:', error);
        await sendSystemErrorEmbed(interaction, error);
    }
}

// 🗑️ Action: Supprimer le salon (améliorée)
async function handleDeleteAction(interaction, channel, channelData) {
    try {
        const memberCount = channel.members.size;
        const stats = channelStats.get(channel.id) || { uniqueUsers: new Set(), totalJoins: 0 };
        
        const embed = new EmbedBuilder()
            .setColor(COLORS.DANGER)
            .setTitle('🗑️ **Confirmer la suppression définitive**')
            .setDescription('⚠️ **Cette action est irréversible et aura des conséquences importantes.**')
            .addFields([
                { 
                    name: '📊 **Informations du salon**', 
                    value: `\`\`\`yaml\nNom: ${channel.name}\nMembres connectés: ${memberCount}\nVisiteurs uniques: ${stats.uniqueUsers.size}\nTotal connexions: ${stats.totalJoins}\n\`\`\``, 
                    inline: false 
                },
                { 
                    name: '💥 **Conséquences de la suppression**', 
                    value: '• Le salon sera supprimé immédiatement\n• Tous les membres seront déconnectés\n• Toutes les données et statistiques seront perdues\n• Les permissions et paramètres seront effacés\n• Cette action ne peut pas être annulée', 
                    inline: false 
                },
                { 
                    name: '🔄 **Alternative**', 
                    value: 'Vous pouvez rendre le salon invisible ou le verrouiller au lieu de le supprimer.', 
                    inline: false 
                }
            ])
            .setFooter({ text: '⚠️ Réfléchissez bien avant de confirmer cette action' })
            .setTimestamp();

        const confirmButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`autovoice_delete_confirm_${channel.id}`)
                    .setLabel('Oui, supprimer définitivement')
                    .setEmoji('🗑️')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`autovoice_delete_cancel_${channel.id}`)
                    .setLabel('Annuler')
                    .setEmoji('❌')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`autovoice_invisible_${channel.id}`)
                    .setLabel('Rendre invisible à la place')
                    .setEmoji('👻')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.reply({
            embeds: [embed],
            components: [confirmButtons],
            flags: MessageFlags.Ephemeral
        });
        
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors de la suppression:', error);
        await sendSystemErrorEmbed(interaction, error);
    }
}

// Fonctions utilitaires pour les embeds
function createStatusEmbed(title, color, fields) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription('> ✅ **Changement appliqué avec succès**')
        .setTimestamp();

    const fieldText = Object.entries(fields)
        .map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`)
        .join('\n');

    embed.addFields([
        { name: '📋 **Détails**', value: `\`\`\`yaml\n${fieldText}\n\`\`\``, inline: false }
    ]);

    return embed;
}

async function sendErrorEmbed(interaction, title, description) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle(`❌ ${title}`)
        .setDescription(description)
        .setTimestamp();
    
    if (interaction.deferred) {
        await interaction.editReply({ embeds: [embed] });
    } else {
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
}

async function sendInfoEmbed(interaction, title, description) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle(`ℹ️ ${title}`)
        .setDescription(description)
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function sendAccessDeniedEmbed(interaction, channelData, channel) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle('🚫 **Accès Refusé**')
        .setDescription('Seul le **propriétaire** du salon ou les utilisateurs **autorisés** peuvent utiliser ces contrôles.')
        .addFields([
            { name: '👑 **Propriétaire du salon**', value: `<@${channelData.ownerId}>`, inline: true },
            { name: '🔒 **Votre statut**', value: '`❌ Non autorisé`', inline: true },
            { name: '💡 **Solution**', value: 'Demandez au propriétaire de vous donner des permissions', inline: false }
        ])
        .setFooter({ text: `Salon: ${channel.name}` })
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function sendSystemErrorEmbed(interaction, error) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle('❌ **Erreur Système**')
        .setDescription('Une erreur inattendue s\'est produite lors du traitement de votre demande.')
        .addFields([
            { name: '🔧 **Détails techniques**', value: `\`\`\`\n${error.message || 'Erreur inconnue'}\n\`\`\``, inline: false },
            { name: '💡 **Solutions**', value: '• Réessayez dans quelques instants\n• Vérifiez les permissions du bot\n• Contactez un administrateur si le problème persiste', inline: false }
        ])
        .setFooter({ text: 'Erreur signalée automatiquement' })
        .setTimestamp();
    
    if (interaction.deferred) {
        await interaction.editReply({ embeds: [embed] });
    } else {
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
}

// Fonction utilitaire pour obtenir le temps de connexion
function getConnectionTime(member, channel) {
    // Simulation du temps de connexion (à améliorer avec de vraies données)
    return 'quelques minutes';
}

// Fonction pour créer les données du panneau mis à jour
async function createUpdatedPanelData(voiceChannel, owner, channelData) {
    try {
        // Récupérer les informations en temps réel du salon
        const memberCount = voiceChannel.members.size;
        const membersList = voiceChannel.members.map(member => member.displayName).join(', ') || 'Aucun membre';
        
        // Déterminer le statut de confidentialité
        const everyoneOverwrite = voiceChannel.permissionOverwrites.cache.get(voiceChannel.guild.roles.everyone.id);
        let privacyStatus = '🌐 **Public**';
        let privacyDescription = 'Tout le monde peut rejoindre ce salon';
        let isPrivate = false;
        let privacyButtonEmoji = '🔓';
        let privacyButtonLabel = 'Rendre privé';
        
        if (everyoneOverwrite && everyoneOverwrite.deny.has('Connect')) {
            privacyStatus = '🔒 **Privé**';
            privacyDescription = 'Seules les personnes autorisées peuvent rejoindre';
            isPrivate = true;
            privacyButtonEmoji = '🔒';
            privacyButtonLabel = 'Rendre public';
        }
        
        // Informations sur les limites et qualité
        const userLimit = voiceChannel.userLimit || 'Illimitée';
        const bitrate = Math.round(voiceChannel.bitrate / 1000);
        const region = voiceChannel.rtcRegion || 'Automatique';
        
        // Récupérer les données du salon pour les utilisateurs bannis
        const bannedCount = channelData?.blacklistedUsers?.length || 0;
        const authorizedCount = channelData?.authorizedUsers?.length || 0;

        // Déterminer les statuts pour les boutons
        const isLocked = everyoneOverwrite && everyoneOverwrite.deny.has('Connect') && !everyoneOverwrite.deny.has('ViewChannel');
        const isInvisible = everyoneOverwrite && everyoneOverwrite.deny.has('ViewChannel');

        const embed = new EmbedBuilder()
            .setTitle('🎤 **Panneau de Configuration Vocal**')
            .setDescription(`
> **🏠 Propriétaire :** \`${owner.displayName}\`
> **📍 Salon :** \`${voiceChannel.name}\`
> 
> ${privacyStatus} • *${privacyDescription}*

## 🎯 **Bienvenue dans votre salon vocal personnel !**

Vous êtes maintenant le **propriétaire** de ce salon vocal. Utilisez les boutons ci-dessous pour personnaliser et gérer votre espace selon vos préférences.

### ✨ **Fonctionnalités disponibles :**
\`\`\`
👥 Gestion des Membres
   • Expulser des membres indésirables
   • Bannir/Débannir des utilisateurs
   
🔒 Contrôle d'Accès  
   • Basculer entre public/privé
   • Gérer les permissions spéciales
   
⚙️ Personnalisation
   • Modifier le nom du salon
   • Ajuster la limite d'utilisateurs
   • Configurer la qualité audio
\`\`\`

> 🔒 **Note importante :** Seul le **propriétaire** du salon peut utiliser ces commandes.
            `)
            .setColor('#5865F2')
            .addFields([
                {
                    name: '👥 **Membres Connectés**',
                    value: `\`\`\`yaml\nTotal: ${memberCount} ${memberCount === 1 ? 'personne' : 'personnes'}\n\`\`\`${memberCount > 0 ? `**Membres :** \`${membersList.length > 50 ? membersList.substring(0, 47) + '...' : membersList}\`` : '> *🔇 Salon actuellement vide*'}`,
                    inline: true
                },
                {
                    name: '⚙️ **Configuration du Salon**',
                    value: `\`\`\`yaml\nLimite: ${userLimit === 0 ? 'Illimitée' : userLimit + ' personnes'}\nQualité: ${bitrate} kbps\nRégion: ${region}\n\`\`\``,
                    inline: true
                },
                {
                    name: '🛡️ **Sécurité & Permissions**',
                    value: `\`\`\`yaml\nBannis: ${bannedCount} utilisateur${bannedCount > 1 ? 's' : ''}\nAutorisés: ${authorizedCount} permission${authorizedCount > 1 ? 's' : ''}\n\`\`\`**Statut :** ${privacyStatus.replace(/\*\*/g, '')}`,
                    inline: true
                }
            ])
            .setThumbnail(owner.displayAvatarURL({ dynamic: true }))
            .setFooter({ 
                text: `🎮 Système Auto Voice Channels • Dernière mise à jour`, 
                iconURL: voiceChannel.guild.iconURL({ dynamic: true }) 
            })
            .setTimestamp();

        // Vérifier si un mot de passe est configuré
        const hasPassword = channelData?.password && channelData.password.enabled;
        
        // Première rangée - Contrôles de confidentialité en temps réel
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`autovoice_privacy_${voiceChannel.id}`)
                    .setLabel(privacyButtonLabel)
                    .setEmoji(privacyButtonEmoji)
                    .setStyle(isPrivate ? ButtonStyle.Success : ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`autovoice_password_${voiceChannel.id}`)
                    .setLabel(hasPassword ? 'Modifier MDP' : 'Mot de Passe')
                    .setEmoji(hasPassword ? '🔐' : '🔒')
                    .setStyle(hasPassword ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`autovoice_invisible_${voiceChannel.id}`)
                    .setLabel(isInvisible ? 'Rendre visible' : 'Rendre invisible')
                    .setEmoji(isInvisible ? '👁️' : '👻')
                    .setStyle(isInvisible ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`autovoice_refresh_${voiceChannel.id}`)
                    .setLabel(`Actualiser`)
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary)
            );

        // Deuxième rangée - Gestion des membres
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`autovoice_kick_${voiceChannel.id}`)
                    .setLabel(memberCount <= 1 ? 'Aucun membre' : `Expulser`)
                    .setEmoji(memberCount <= 1 ? '😴' : '🦵')
                    .setStyle(memberCount <= 1 ? ButtonStyle.Secondary : ButtonStyle.Danger)
                    .setDisabled(memberCount <= 1),
                new ButtonBuilder()
                    .setCustomId(`autovoice_ban_${voiceChannel.id}`)
                    .setLabel(memberCount <= 1 ? 'Aucun membre' : `Bannir`)
                    .setEmoji(memberCount <= 1 ? '😴' : '🔨')
                    .setStyle(memberCount <= 1 ? ButtonStyle.Secondary : ButtonStyle.Danger)
                    .setDisabled(memberCount <= 1),
                new ButtonBuilder()
                    .setCustomId(`autovoice_unban_${voiceChannel.id}`)
                    .setLabel(bannedCount === 0 ? 'Aucun banni' : `Débannir`)
                    .setEmoji(bannedCount === 0 ? '✅' : '🔓')
                    .setStyle(bannedCount === 0 ? ButtonStyle.Secondary : ButtonStyle.Success)
                    .setDisabled(bannedCount === 0),
                new ButtonBuilder()
                    .setCustomId(`autovoice_permissions_${voiceChannel.id}`)
                    .setLabel('Permissions')
                    .setEmoji('🔑')
                    .setStyle(authorizedCount > 0 ? ButtonStyle.Success : ButtonStyle.Primary)
            );

        // Troisième rangée - Configuration et statistiques
        const row3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`autovoice_settings_${voiceChannel.id}`)
                    .setLabel('Paramètres')
                    .setEmoji('⚙️')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`autovoice_stats_${voiceChannel.id}`)
                    .setLabel('Statistiques')
                    .setEmoji('📊')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`autovoice_claim_${voiceChannel.id}`)
                    .setLabel('Transférer')
                    .setEmoji('👑')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`autovoice_delete_${voiceChannel.id}`)
                    .setLabel('Supprimer')
                    .setEmoji('🗑️')
                    .setStyle(ButtonStyle.Danger)
            );

        return {
            embed: embed,
            components: [row1, row2, row3]
        };

    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors de la création des données du panneau:', error);
        throw error;
    }
}

// Fonction utilitaire pour mettre à jour le panneau de gestion (SANS SUPPRIMER)
async function updateManagementPanel(channel, channelData) {
    try {
        console.log(`[AUTO-VOICE] 🔄 Mise à jour du panneau pour ${channel.name} (conservation des messages)`);
        
        const owner = await channel.guild.members.fetch(channelData.ownerId);
        let existingPanel = null;
        
        // Essayer d'abord avec l'ID sauvegardé
        if (channelData.panelMessageId) {
            try {
                existingPanel = await channel.messages.fetch(channelData.panelMessageId);
                console.log(`[AUTO-VOICE] 📍 Panneau trouvé via ID sauvegardé: ${channelData.panelMessageId}`);
            } catch (error) {
                console.log(`[AUTO-VOICE] ⚠️ Panneau avec ID ${channelData.panelMessageId} introuvable, recherche manuelle...`);
            }
        }
        
        // Si pas trouvé par ID, chercher manuellement
        if (!existingPanel) {
            const messages = await channel.messages.fetch({ limit: 15 });
            existingPanel = messages.find(msg => 
                msg.author.id === channel.client.user.id && 
                msg.embeds.length > 0 && 
                msg.embeds[0].title?.includes('Panneau de Configuration Vocal')
            );
            
            if (existingPanel) {
                console.log(`[AUTO-VOICE] 🔍 Panneau trouvé par recherche manuelle: ${existingPanel.id}`);
                // Sauvegarder le nouvel ID
                channelData.panelMessageId = existingPanel.id;
                const autoVoiceData = loadAutoVoiceData();
                const guildId = channel.guild.id;
                const userChannelKey = Object.keys(autoVoiceData[guildId].userChannels).find(
                    key => autoVoiceData[guildId].userChannels[key].channelId === channel.id
                );
                if (userChannelKey) {
                    autoVoiceData[guildId].userChannels[userChannelKey] = channelData;
                    saveAutoVoiceData(autoVoiceData);
                }
            }
        }
        
        if (existingPanel) {
            // Mettre à jour le panneau existant
            console.log(`[AUTO-VOICE] 📝 Mise à jour du panneau existant pour ${channel.name}`);
            
            const updatedPanelData = await createUpdatedPanelData(channel, owner, channelData);
            
            try {
                await existingPanel.edit({
                    embeds: [updatedPanelData.embed],
                    components: updatedPanelData.components
                });
                console.log(`[AUTO-VOICE] ✅ Panneau mis à jour avec succès pour ${channel.name} (message conservé)`);
            } catch (editError) {
                console.error('[AUTO-VOICE] ❌ Erreur lors de la mise à jour du panneau:', editError);
                // Si la mise à jour échoue, créer un nouveau panneau
                console.log(`[AUTO-VOICE] 🆕 Création d'un nouveau panneau suite à l'erreur`);
                const { createManagementPanel } = await import('../events/voiceStateUpdate.js');
                const newPanel = await createManagementPanel(channel, owner);
                if (newPanel) {
                    channelData.panelMessageId = newPanel.id;
                    const autoVoiceData = loadAutoVoiceData();
                    const guildId = channel.guild.id;
                    const userChannelKey = Object.keys(autoVoiceData[guildId].userChannels).find(
                        key => autoVoiceData[guildId].userChannels[key].channelId === channel.id
                    );
                    if (userChannelKey) {
                        autoVoiceData[guildId].userChannels[userChannelKey] = channelData;
                        saveAutoVoiceData(autoVoiceData);
                    }
                }
            }
        } else {
            // Créer un nouveau panneau si aucun n'existe
            console.log(`[AUTO-VOICE] 🆕 Aucun panneau existant trouvé, création d'un nouveau pour ${channel.name}`);
            const { createManagementPanel } = await import('../events/voiceStateUpdate.js');
            const newPanel = await createManagementPanel(channel, owner);
            if (newPanel) {
                channelData.panelMessageId = newPanel.id;
                const autoVoiceData = loadAutoVoiceData();
                const guildId = channel.guild.id;
                const userChannelKey = Object.keys(autoVoiceData[guildId].userChannels).find(
                    key => autoVoiceData[guildId].userChannels[key].channelId === channel.id
                );
                if (userChannelKey) {
                    autoVoiceData[guildId].userChannels[userChannelKey] = channelData;
                    saveAutoVoiceData(autoVoiceData);
                }
            }
        }
        
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors de la mise à jour du panneau:', error);
    }
}

// 🔐 Action: Gestion du mot de passe
async function handlePasswordAction(interaction, channel, channelData) {
    try {
        const hasPassword = channelData.password && channelData.password.enabled;
        
        const modal = new ModalBuilder()
            .setCustomId(`autovoice_password_modal_${channel.id}`)
            .setTitle(hasPassword ? '🔐 Modifier le Mot de Passe' : '🔐 Définir un Mot de Passe');

        // Si il y a déjà un mot de passe, demander le mot de passe actuel
        if (hasPassword) {
            const currentPasswordInput = new TextInputBuilder()
                .setCustomId('current_password')
                .setLabel('Mot de passe actuel')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Entrez le mot de passe actuel pour le modifier')
                .setRequired(true)
                .setMaxLength(50);

            const newPasswordInput = new TextInputBuilder()
                .setCustomId('new_password')
                .setLabel('Nouveau mot de passe')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Nouveau mot de passe (laissez vide pour SUPPRIMER la protection)')
                .setRequired(false)
                .setMaxLength(50);

            const confirmPasswordInput = new TextInputBuilder()
                .setCustomId('confirm_password')
                .setLabel('Confirmer le nouveau mot de passe')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Confirmez le nouveau mot de passe (si vous en définissez un)')
                .setRequired(false)
                .setMaxLength(50);

            const rows = [
                new ActionRowBuilder().addComponents(currentPasswordInput),
                new ActionRowBuilder().addComponents(newPasswordInput),
                new ActionRowBuilder().addComponents(confirmPasswordInput)
            ];

            modal.addComponents(...rows);
        } else {
            // Pas de mot de passe existant, interface simplifiée
            const newPasswordInput = new TextInputBuilder()
                .setCustomId('new_password')
                .setLabel('Mot de passe du salon')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Définissez un mot de passe pour protéger votre salon')
                .setRequired(true)
                .setMinLength(4)
                .setMaxLength(50);

            const confirmPasswordInput = new TextInputBuilder()
                .setCustomId('confirm_password')
                .setLabel('Confirmer le mot de passe')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Confirmez votre mot de passe')
                .setRequired(true)
                .setMaxLength(50);

            const descriptionInput = new TextInputBuilder()
                .setCustomId('password_description')
                .setLabel('Description (optionnel)')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Ex: "Salon privé entre amis"')
                .setRequired(false)
                .setMaxLength(100);

            const rows = [
                new ActionRowBuilder().addComponents(newPasswordInput),
                new ActionRowBuilder().addComponents(confirmPasswordInput),
                new ActionRowBuilder().addComponents(descriptionInput)
            ];

            modal.addComponents(...rows);
        }

        await interaction.showModal(modal);
        
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors de l\'ouverture du modal mot de passe:', error);
        await sendSystemErrorEmbed(interaction, error);
    }
}

// 🔓 Action: Déverrouillage avec mot de passe
async function handlePasswordUnlockAction(interaction, channel, channelData) {
    try {
        if (!channelData.password || !channelData.password.enabled) {
            return await sendErrorEmbed(interaction, 'Aucun mot de passe', 'Ce salon n\'est pas protégé par un mot de passe.');
        }

        const modal = new ModalBuilder()
            .setCustomId(`autovoice_unlock_modal_${channel.id}`)
            .setTitle('🔓 Déverrouillage du Salon');

        const passwordInput = new TextInputBuilder()
            .setCustomId('unlock_password')
            .setLabel('Mot de passe du salon')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Entrez le mot de passe pour accéder au salon')
            .setRequired(true)
            .setMaxLength(50);

        const row = new ActionRowBuilder().addComponents(passwordInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
        
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors du déverrouillage:', error);
        await sendSystemErrorEmbed(interaction, error);
    }
}

// 🔒 Fonction pour appliquer les restrictions de mot de passe
async function applyPasswordRestrictions(member, channel) {
    try {
        console.log(`[AUTO-VOICE] 🔒 Application des restrictions de mot de passe pour ${member.displayName}`);
        
        // Appliquer les restrictions vocales
        if (member.voice.channel && member.voice.channel.id === channel.id) {
            await member.voice.setMute(true, 'Salon protégé par mot de passe');
            await member.voice.setDeaf(true, 'Salon protégé par mot de passe');
        }
        
        // Appliquer les restrictions de permissions
        await channel.permissionOverwrites.edit(member.id, {
            SendMessages: false,
            ViewChannel: true,
            Connect: true,
            Speak: false,
            Stream: false,
            UseVAD: false,
            UseEmbeddedActivities: false,
            UseSoundboard: false
        });
        
        console.log(`[AUTO-VOICE] ✅ Restrictions appliquées pour ${member.displayName}`);
        
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors de l\'application des restrictions:', error);
    }
}

// 🔓 Fonction pour supprimer les restrictions de mot de passe
async function removePasswordRestrictions(member, channel) {
    try {
        console.log(`[AUTO-VOICE] 🔓 Suppression des restrictions pour ${member.displayName}`);
        
        // Supprimer les restrictions vocales
        if (member.voice.channel && member.voice.channel.id === channel.id) {
            await member.voice.setMute(false, 'Mot de passe correct');
            await member.voice.setDeaf(false, 'Mot de passe correct');
        }
        
        // Restaurer les permissions normales
        await channel.permissionOverwrites.edit(member.id, {
            SendMessages: null,
            Speak: null,
            Stream: null,
            UseVAD: null,
            UseEmbeddedActivities: null,
            UseSoundboard: null
        });
        
        console.log(`[AUTO-VOICE] ✅ Restrictions supprimées pour ${member.displayName}`);
        
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors de la suppression des restrictions:', error);
    }
}

// 📨 Fonction pour envoyer le message de déverrouillage
async function sendPasswordUnlockMessage(channel, member, channelData) {
    try {
        const owner = await channel.guild.members.fetch(channelData.ownerId);
        
        const embed = new EmbedBuilder()
            .setColor(COLORS.WARNING)
            .setTitle('🔐 **Salon Protégé par Mot de Passe**')
            .setDescription(`${member}, ce salon nécessite un mot de passe pour accéder à toutes les fonctionnalités.`)
            .addFields([
                { 
                    name: '🏠 **Informations du Salon**', 
                    value: `**Propriétaire :** ${owner.displayName}\n**Salon :** ${channel.name}`, 
                    inline: true 
                },
                { 
                    name: '🚫 **Restrictions Actuelles**', 
                    value: '• 🔇 Muet activé\n• 🔕 Sourd activé\n• 💬 Chat désactivé\n• 📹 Caméra bloquée', 
                    inline: true 
                },
                { 
                    name: '🔓 **Pour Débloquer l\'Accès**', 
                    value: 'Cliquez sur **"Entrer le Mot de Passe"** ci-dessous.', 
                    inline: false 
                }
            ])
            .setThumbnail(member.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: '🔐 Entrez le mot de passe pour accéder au salon' })
            .setTimestamp();

        const unlockButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`autovoice_unlock_${channel.id}`)
                    .setLabel('Entrer le Mot de Passe')
                    .setEmoji('🔐')
                    .setStyle(ButtonStyle.Primary)
            );

        // Envoyer le message directement dans le canal vocal (visible par tous)
        console.log(`[AUTO-VOICE] 📨 Envoi du message de mot de passe dans le canal vocal pour ${member.displayName}`);
        const publicMessage = await channel.send({ 
            content: `🔐 **Nouveau membre détecté !**`,
            embeds: [embed], 
            components: [unlockButton]
        });
        
        // Supprimer le message après 60 secondes pour éviter l'encombrement
        setTimeout(async () => {
            try {
                await publicMessage.delete();
                console.log(`[AUTO-VOICE] 🗑️ Message de mot de passe supprimé automatiquement`);
            } catch (deleteError) {
                console.error('[AUTO-VOICE] Erreur lors de la suppression du message temporaire:', deleteError);
            }
        }, 60000); // 60 secondes au lieu de 30
        
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors de l\'envoi du message de déverrouillage:', error);
    }
}

// 🔍 Fonction pour vérifier si un utilisateur est autorisé
function isUserAuthorized(userId, channelData) {
    if (!channelData.password || !channelData.password.enabled) {
        return true; // Pas de mot de passe = accès libre
    }
    
    // Le propriétaire a toujours accès
    if (userId === channelData.ownerId) {
        return true;
    }
    
    // Vérifier la liste des utilisateurs autorisés
    return channelData.password.authorizedUsers && channelData.password.authorizedUsers.includes(userId);
}

// 🔐 Fonction pour hasher un mot de passe
async function hashPassword(password) {
    try {
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors du hashage du mot de passe:', error);
        throw error;
    }
}

// 🔍 Fonction pour vérifier un mot de passe
async function verifyPassword(password, hash) {
    try {
        return await bcrypt.compare(password, hash);
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors de la vérification du mot de passe:', error);
        return false;
    }
}

// Gestionnaires pour les autres actions (simplifiés pour l'instant)
async function handleUnbanAction(interaction, channel, channelData) {
    await sendInfoEmbed(interaction, 'Fonction Débannir', 'Cette fonction avancée sera bientôt disponible.');
}

async function handleBlacklistAction(interaction, channel, channelData) {
    await sendInfoEmbed(interaction, 'Fonction Blacklist', 'Cette fonction avancée sera bientôt disponible.');
}

async function handlePermissionsAction(interaction, channel, channelData) {
    await sendInfoEmbed(interaction, 'Fonction Permissions', 'Cette fonction avancée sera bientôt disponible.');
}

async function handleEditAction(interaction, channel, channelData) {
    await sendInfoEmbed(interaction, 'Fonction Modifier', 'Utilisez le bouton "Paramètres" pour modifier le salon.');
}

async function handleClaimAction(interaction, channel, channelData) {
    await sendInfoEmbed(interaction, 'Fonction Transférer', 'Cette fonction avancée sera bientôt disponible.');
}

async function handleLogsAction(interaction, channel, channelData) {
    await sendInfoEmbed(interaction, 'Fonction Logs', 'Utilisez le bouton "Statistiques" pour voir les données détaillées.');
}



async function handleDeleteConfirm(interaction, channelId) {
    try {
        const channel = interaction.guild.channels.cache.get(channelId);
        
        if (!channel) {
            return await sendErrorEmbed(interaction, 'Salon introuvable', 'Le salon vocal n\'existe plus.');
        }

        const autoVoiceData = loadAutoVoiceData();
        const guildId = interaction.guild.id;
        
        // Supprimer les données
        const userChannelKey = Object.keys(autoVoiceData[guildId]?.userChannels || {}).find(
            key => autoVoiceData[guildId].userChannels[key].channelId === channelId
        );
        
        if (userChannelKey) {
            delete autoVoiceData[guildId].userChannels[userChannelKey];
            saveAutoVoiceData(autoVoiceData);
        }
        
        // Supprimer les statistiques
        channelStats.delete(channelId);
        
        const embed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle('🗑️ **Salon supprimé avec succès**')
            .setDescription(`Le salon vocal **${channel.name}** a été supprimé définitivement.`)
            .addFields([
                { name: '✅ **Actions effectuées**', value: '• Salon supprimé\n• Données nettoyées\n• Statistiques effacées\n• Membres déconnectés', inline: false }
            ])
            .setFooter({ text: 'Suppression terminée' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        
        // Supprimer le salon après un délai
        setTimeout(async () => {
            try {
                await channel.delete('Supprimé par le propriétaire via le panneau de gestion');
                console.log(`[AUTO-VOICE] ✅ Salon ${channel.name} supprimé avec succès`);
            } catch (error) {
                console.error('[AUTO-VOICE] ❌ Erreur lors de la suppression du salon:', error);
            }
        }, 3000);
        
    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors de la confirmation de suppression:', error);
        await sendSystemErrorEmbed(interaction, error);
    }
}

async function handleDeleteCancel(interaction) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle('✅ **Suppression annulée**')
        .setDescription('Votre salon vocal est en sécurité et n\'a pas été supprimé.')
        .addFields([
            { name: '🛡️ **Salon préservé**', value: 'Toutes vos données et paramètres sont intacts.', inline: false }
        ])
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

// Gestionnaires pour les menus et modals (simplifiés)
async function handleSelectMenuInteraction(interaction) {
    await sendInfoEmbed(interaction, 'Menu de sélection', 'Cette fonction sera bientôt disponible.');
}

async function handleModalSubmit(interaction) {
    await sendInfoEmbed(interaction, 'Modal', 'Cette fonction sera bientôt disponible.');
}

export {
    handleManagementButtons,
    handleSelectMenuInteraction,
    handleModalSubmit,
    handlePrivacyAction,
    handleLockAction,
    handleInvisibleAction,
    handleKickAction,
    handleBanAction,
    handleUnbanAction,
    handleBlacklistAction,
    handlePermissionsAction,
    handleEditAction,
    handleClaimAction,
    handleLogsAction,

    handleRefreshAction,
    handleDeleteAction,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleStatsAction,
    handleSettingsAction,
    handlePasswordAction,
    handlePasswordUnlockAction,
    updateManagementPanel,
    loadAutoVoiceData,
    saveAutoVoiceData,
    updateChannelStats,
    getChannelStatus,
    getConnectionTime,
    sendAccessDeniedEmbed,
    sendSystemErrorEmbed,
    sendErrorEmbed,
    sendInfoEmbed,
    isUserAuthorized,
    applyPasswordRestrictions,
    removePasswordRestrictions,
    sendPasswordUnlockMessage,
    hashPassword,
    verifyPassword
};