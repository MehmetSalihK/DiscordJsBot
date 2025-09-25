const { PermissionFlagsBits } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

const SUSPENSIONS_FILE = path.join(__dirname, '../data/suspensions.json');

/**
 * Charge les données de suspension
 */
async function loadSuspensionData() {
    try {
        const data = await fs.readFile(SUSPENSIONS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { guilds: {} };
    }
}

/**
 * Sauvegarde les données de suspension
 */
async function saveSuspensionData(data) {
    try {
        await fs.writeFile(SUSPENSIONS_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        // console.error('Erreur lors de la sauvegarde des données de suspension:', error);
        return false;
    }
}

/**
 * Crée automatiquement tous les rôles de suspension pour une guilde
 */
async function createAllSuspensionRoles(guild) {
    try {
        const roles = {
            suspension1: null,
            suspension2: null,
            suspension3: null
        };

        // Définition des rôles avec leurs permissions
        const roleDefinitions = [
            {
                name: '🔇 Suspension Niveau 1',
                color: '#FFA500', // Orange
                permissions: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.ReadMessageHistory
                ],
                key: 'suspension1'
            },
            {
                name: '🔇 Suspension Niveau 2',
                color: '#FF6B35', // Rouge-orange
                permissions: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.ReadMessageHistory
                ],
                key: 'suspension2'
            },
            {
                name: '🔇 Suspension Niveau 3',
                color: '#FF0000', // Rouge
                permissions: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.ReadMessageHistory
                ],
                key: 'suspension3'
            }
        ];

        // Créer chaque rôle
        for (const roleDef of roleDefinitions) {
            try {
                const role = await guild.roles.create({
                    name: roleDef.name,
                    color: roleDef.color,
                    permissions: roleDef.permissions,
                    reason: 'Création automatique des rôles de suspension progressive'
                });
                
                roles[roleDef.key] = role.id;
                 // console.log(`✅ Rôle créé: ${roleDef.name} (${role.id})`);
             } catch (error) {
                // console.error(`❌ Erreur lors de la création du rôle ${roleDef.name}:`, error);
            }
        }

        // Sauvegarder les IDs des rôles dans la configuration
        const data = await loadSuspensionData();
        if (!data.guilds[guild.id]) {
            data.guilds[guild.id] = {
                config: {
                    autopunish: false,
                    threshold: 3,
                    autoResetDays: 30,
                    notifyUser: true,
                    roles: {},
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
        }

        data.guilds[guild.id].config.roles = roles;
        await saveSuspensionData(data);

        return {
            success: true,
            roles: roles,
            message: `✅ Tous les rôles de suspension ont été créés avec succès !`
        };

    } catch (error) {
        // console.error('Erreur lors de la création des rôles de suspension:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Configure les permissions des canaux pour les rôles de suspension
 */
async function configureChannelPermissions(guild, visibleChannels = []) {
    try {
        const data = await loadSuspensionData();
        const guildConfig = data.guilds[guild.id];
        
        if (!guildConfig || !guildConfig.config.roles) {
            return { success: false, error: 'Configuration des rôles non trouvée' };
        }

        const suspensionRoles = Object.values(guildConfig.config.roles).filter(roleId => roleId);
        
        // Pour chaque canal de la guilde
        for (const channel of guild.channels.cache.values()) {
            if (channel.type === 0 || channel.type === 2) { // Text ou Voice channels
                try {
                    // Si le canal est dans la liste des canaux visibles
                    if (visibleChannels.includes(channel.id)) {
                        // Permettre la lecture pour les rôles de suspension
                        for (const roleId of suspensionRoles) {
                            await channel.permissionOverwrites.edit(roleId, {
                                ViewChannel: true,
                                ReadMessageHistory: true,
                                SendMessages: false,
                                Speak: false,
                                Connect: channel.type === 2 ? true : null
                            });
                        }
                    } else {
                        // Interdire l'accès pour les rôles de suspension
                        for (const roleId of suspensionRoles) {
                            await channel.permissionOverwrites.edit(roleId, {
                                ViewChannel: false,
                                SendMessages: false,
                                Speak: false,
                                Connect: false
                            });
                        }
                    }
                } catch (error) {
                    // console.error(`Erreur lors de la configuration des permissions pour ${channel.name}:`, error);
                }
            }
        }

        // Sauvegarder la liste des canaux visibles
        data.guilds[guild.id].config.visibleChannels = visibleChannels;
        await saveSuspensionData(data);

        return {
            success: true,
            message: `✅ Permissions configurées pour ${visibleChannels.length} canaux visibles`
        };

    } catch (error) {
        // console.error('Erreur lors de la configuration des permissions:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Vérifie si les rôles de suspension existent
 */
async function checkSuspensionRoles(guild) {
    try {
        const data = await loadSuspensionData();
        const guildConfig = data.guilds[guild.id];
        
        if (!guildConfig || !guildConfig.config.roles) {
            return { exists: false, roles: {} };
        }

        const roles = guildConfig.config.roles;
        const existingRoles = {};
        let allExist = true;

        for (const [level, roleId] of Object.entries(roles)) {
            if (roleId) {
                const role = guild.roles.cache.get(roleId);
                if (role) {
                    existingRoles[level] = {
                        id: roleId,
                        name: role.name,
                        exists: true
                    };
                } else {
                    existingRoles[level] = {
                        id: roleId,
                        exists: false
                    };
                    allExist = false;
                }
            } else {
                existingRoles[level] = { exists: false };
                allExist = false;
            }
        }

        return {
            exists: allExist,
            roles: existingRoles,
            config: guildConfig.config
        };

    } catch (error) {
        // console.error('Erreur lors de la vérification des rôles:', error);
        return { exists: false, roles: {}, error: error.message };
    }
}

/**
 * Supprime tous les rôles de suspension
 */
async function deleteAllSuspensionRoles(guild) {
    try {
        const data = await loadSuspensionData();
        const guildConfig = data.guilds[guild.id];
        
        if (!guildConfig || !guildConfig.config.roles) {
            return { success: true, message: 'Aucun rôle à supprimer' };
        }

        const roles = guildConfig.config.roles;
        let deletedCount = 0;

        for (const [level, roleId] of Object.entries(roles)) {
            if (roleId) {
                try {
                    const role = guild.roles.cache.get(roleId);
                    if (role) {
                        await role.delete('Suppression des rôles de suspension');
                        deletedCount++;
                         // console.log(`✅ Rôle supprimé: ${role.name}`);
                     }
                } catch (error) {
                    // console.error(`❌ Erreur lors de la suppression du rôle ${roleId}:`, error);
                }
            }
        }

        // Réinitialiser la configuration des rôles
        data.guilds[guild.id].config.roles = {
            suspension1: null,
            suspension2: null,
            suspension3: null
        };
        await saveSuspensionData(data);

        return {
            success: true,
            message: `✅ ${deletedCount} rôles de suspension supprimés`
        };

    } catch (error) {
        // console.error('Erreur lors de la suppression des rôles:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Met à jour un rôle de suspension spécifique
 */
async function updateSuspensionRole(guild, level, roleId) {
    try {
        const data = await loadSuspensionData();
        
        if (!data.guilds[guild.id]) {
            data.guilds[guild.id] = {
                config: {
                    autopunish: false,
                    threshold: 3,
                    autoResetDays: 30,
                    notifyUser: true,
                    roles: {},
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
        }

        // Vérifier que le rôle existe
        const role = guild.roles.cache.get(roleId);
        if (!role) {
            return {
                success: false,
                error: 'Rôle introuvable'
            };
        }

        data.guilds[guild.id].config.roles[level] = roleId;
        await saveSuspensionData(data);

        return {
            success: true,
            message: `✅ Rôle ${level} mis à jour: ${role.name}`
        };

    } catch (error) {
        // console.error('Erreur lors de la mise à jour du rôle:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    loadSuspensionData,
    saveSuspensionData,
    createAllSuspensionRoles,
    configureChannelPermissions,
    checkSuspensionRoles,
    deleteAllSuspensionRoles,
    updateSuspensionRole
};