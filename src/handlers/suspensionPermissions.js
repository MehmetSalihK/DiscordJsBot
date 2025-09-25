const { PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { loadSuspensionData, saveSuspensionData } = require('./suspensionRoles.js');

/**
 * Configuration des permissions par niveau de suspension
 */
const PERMISSION_CONFIGS = {
    level1: {
        name: 'Suspension Niveau 1',
        color: '#FFA500',
        emoji: '🔒',
        description: 'Restrictions légères - Peut voir certains canaux mais ne peut pas interagir',
        permissions: {
            // Permissions de base refusées
            [PermissionFlagsBits.SendMessages]: false,
            [PermissionFlagsBits.AddReactions]: false,
            [PermissionFlagsBits.CreatePublicThreads]: false,
            [PermissionFlagsBits.CreatePrivateThreads]: false,
            [PermissionFlagsBits.SendMessagesInThreads]: false,
            [PermissionFlagsBits.UseApplicationCommands]: false,
            [PermissionFlagsBits.SendVoiceMessages]: false,
            
            // Permissions vocales refusées
            [PermissionFlagsBits.Connect]: false,
            [PermissionFlagsBits.Speak]: false,
            [PermissionFlagsBits.Stream]: false,
            [PermissionFlagsBits.UseVAD]: false,
            [PermissionFlagsBits.RequestToSpeak]: false,
            
            // Permissions autorisées
            [PermissionFlagsBits.ViewChannel]: true,
            [PermissionFlagsBits.ReadMessageHistory]: true
        },
        allowedChannelTypes: ['rules', 'announcements', 'general']
    },
    
    level2: {
        name: 'Suspension Niveau 2',
        color: '#FF6B6B',
        emoji: '⛔',
        description: 'Restrictions moyennes - Accès très limité aux canaux',
        permissions: {
            // Toutes les permissions de niveau 1 + restrictions supplémentaires
            [PermissionFlagsBits.SendMessages]: false,
            [PermissionFlagsBits.AddReactions]: false,
            [PermissionFlagsBits.CreatePublicThreads]: false,
            [PermissionFlagsBits.CreatePrivateThreads]: false,
            [PermissionFlagsBits.SendMessagesInThreads]: false,
            [PermissionFlagsBits.UseApplicationCommands]: false,
            [PermissionFlagsBits.SendVoiceMessages]: false,
            [PermissionFlagsBits.AttachFiles]: false,
            [PermissionFlagsBits.EmbedLinks]: false,
            [PermissionFlagsBits.UseExternalEmojis]: false,
            [PermissionFlagsBits.UseExternalStickers]: false,
            
            // Permissions vocales refusées
            [PermissionFlagsBits.Connect]: false,
            [PermissionFlagsBits.Speak]: false,
            [PermissionFlagsBits.Stream]: false,
            [PermissionFlagsBits.UseVAD]: false,
            [PermissionFlagsBits.RequestToSpeak]: false,
            
            // Permissions très limitées
            [PermissionFlagsBits.ViewChannel]: true,
            [PermissionFlagsBits.ReadMessageHistory]: true
        },
        allowedChannelTypes: ['rules', 'announcements']
    },
    
    level3: {
        name: 'Suspension Niveau 3',
        color: '#8B0000',
        emoji: '🚷',
        description: 'Restrictions maximales - Accès uniquement au règlement',
        permissions: {
            // Toutes les permissions refusées sauf lecture du règlement
            [PermissionFlagsBits.SendMessages]: false,
            [PermissionFlagsBits.AddReactions]: false,
            [PermissionFlagsBits.CreatePublicThreads]: false,
            [PermissionFlagsBits.CreatePrivateThreads]: false,
            [PermissionFlagsBits.SendMessagesInThreads]: false,
            [PermissionFlagsBits.UseApplicationCommands]: false,
            [PermissionFlagsBits.SendVoiceMessages]: false,
            [PermissionFlagsBits.AttachFiles]: false,
            [PermissionFlagsBits.EmbedLinks]: false,
            [PermissionFlagsBits.UseExternalEmojis]: false,
            [PermissionFlagsBits.UseExternalStickers]: false,
            [PermissionFlagsBits.MentionEveryone]: false,
            
            // Permissions vocales complètement refusées
            [PermissionFlagsBits.Connect]: false,
            [PermissionFlagsBits.Speak]: false,
            [PermissionFlagsBits.Stream]: false,
            [PermissionFlagsBits.UseVAD]: false,
            [PermissionFlagsBits.RequestToSpeak]: false,
            [PermissionFlagsBits.MoveMembers]: false,
            [PermissionFlagsBits.MuteMembers]: false,
            [PermissionFlagsBits.DeafenMembers]: false,
            
            // Seule la lecture est autorisée pour le règlement
            [PermissionFlagsBits.ViewChannel]: false, // Par défaut false, sera true pour les canaux autorisés
            [PermissionFlagsBits.ReadMessageHistory]: false
        },
        allowedChannelTypes: ['rules']
    }
};

/**
 * Applique les permissions pour un niveau de suspension spécifique
 * @param {Guild} guild - Le serveur Discord
 * @param {string} level - Le niveau de suspension (level1, level2, level3)
 * @param {Array} allowedChannels - Liste des IDs de canaux autorisés pour ce niveau
 */
async function applyLevelPermissions(guild, level, allowedChannels = []) {
    try {
        const data = await loadSuspensionData();
        const guildConfig = data.guilds[guild.id];
        
        if (!guildConfig) {
            throw new Error('Configuration du serveur non trouvée');
        }

        const roleId = guildConfig.roles[level];
        if (!roleId) {
            throw new Error(`Rôle pour ${level} non configuré`);
        }

        const role = guild.roles.cache.get(roleId);
        if (!role) {
            throw new Error(`Rôle ${level} non trouvé`);
        }

        const config = PERMISSION_CONFIGS[level];
        if (!config) {
            throw new Error(`Configuration pour ${level} non trouvée`);
        }

        const channels = guild.channels.cache.filter(channel => 
            channel.type === ChannelType.GuildText || 
            channel.type === ChannelType.GuildVoice ||
            channel.type === ChannelType.GuildCategory ||
            channel.type === ChannelType.GuildForum ||
            channel.type === ChannelType.GuildStageVoice
        );

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (const [channelId, channel] of channels) {
            try {
                const permissions = { ...config.permissions };
                
                // Si le canal est dans la liste des canaux autorisés, permettre la lecture
                if (allowedChannels.includes(channelId)) {
                    permissions[PermissionFlagsBits.ViewChannel] = true;
                    permissions[PermissionFlagsBits.ReadMessageHistory] = true;
                } else {
                    permissions[PermissionFlagsBits.ViewChannel] = false;
                    permissions[PermissionFlagsBits.ReadMessageHistory] = false;
                }

                await channel.permissionOverwrites.edit(role, permissions);
                successCount++;
            } catch (error) {
                errorCount++;
                errors.push(`${channel.name}: ${error.message}`);
            }
        }

        return {
            success: true,
            successCount,
            errorCount,
            errors,
            totalChannels: channels.size,
            roleName: role.name,
            levelName: config.name
        };

    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Applique les permissions pour tous les niveaux de suspension
 * @param {Guild} guild - Le serveur Discord
 */
async function applyAllLevelPermissions(guild) {
    try {
        const data = await loadSuspensionData();
        const guildConfig = data.guilds[guild.id];
        
        if (!guildConfig) {
            throw new Error('Configuration du serveur non trouvée');
        }

        const results = {};
        
        for (const level of ['level1', 'level2', 'level3']) {
            const allowedChannels = guildConfig.visibleChannels?.[level] || [];
            results[level] = await applyLevelPermissions(guild, level, allowedChannels);
        }

        return {
            success: true,
            results
        };

    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Configure les canaux visibles pour un niveau de suspension
 * @param {string} guildId - ID du serveur
 * @param {string} level - Niveau de suspension
 * @param {Array} channelIds - IDs des canaux à rendre visibles
 */
async function setVisibleChannels(guildId, level, channelIds) {
    try {
        const data = await loadSuspensionData();
        
        if (!data.guilds[guildId]) {
            data.guilds[guildId] = {
                config: {
                    roles: {},
                    durations: {},
                    visibleChannels: {}
                },
                users: {}
            };
        }

        if (!data.guilds[guildId].config.visibleChannels) {
            data.guilds[guildId].config.visibleChannels = {};
        }

        data.guilds[guildId].config.visibleChannels[level] = channelIds;
        
        await saveSuspensionData(data);
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Obtient les canaux visibles pour un niveau
 * @param {string} guildId - ID du serveur
 * @param {string} level - Niveau de suspension
 */
async function getVisibleChannels(guildId, level) {
    try {
        const data = await loadSuspensionData();
        const visibleChannels = data.guilds[guildId]?.config?.visibleChannels?.[level] || [];
        return { success: true, channels: visibleChannels };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Crée un embed de statut des permissions
 * @param {Object} results - Résultats de l'application des permissions
 */
function createPermissionStatusEmbed(results) {
    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🔧 Statut des permissions de suspension')
        .setDescription('État actuel des permissions pour chaque niveau de suspension')
        .setTimestamp();

    for (const [level, result] of Object.entries(results.results)) {
        const config = PERMISSION_CONFIGS[level];
        if (result.success) {
            embed.addFields({
                name: `${config.emoji} ${config.name}`,
                value: `✅ **${result.successCount}** canaux configurés\n❌ **${result.errorCount}** erreurs\n📊 Total: **${result.totalChannels}** canaux`,
                inline: true
            });
        } else {
            embed.addFields({
                name: `${config.emoji} ${config.name}`,
                value: `❌ Erreur: ${result.error}`,
                inline: true
            });
        }
    }

    return embed;
}

module.exports = {
    PERMISSION_CONFIGS,
    applyLevelPermissions,
    applyAllLevelPermissions,
    setVisibleChannels,
    getVisibleChannels,
    createPermissionStatusEmbed
};