import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } from 'discord.js';
import fs from 'fs';
import path from 'path';

// Couleurs pour les logs console
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

// Configuration par défaut
const DEFAULT_CONFIG = {
    suspension1_duration: 10, // minutes
    suspension2_duration: 1440, // minutes (24h)
    suspension3_duration: 10080, // minutes (7 jours)
    warning_expiry_days: 30,
    max_warnings: 3,
    roles: {
        suspension1: null,
        suspension2: null,
        suspension3: null
    },
    channels: {
        logs: null,
        sanctions: null,
        reglement: null,
        suspension3_voice: null
    }
};

// Fonctions utilitaires pour les logs colorés
function logInfo(message) {
    // console.log(`${colors.cyan}ℹ️  [SUSPENSIONS]${colors.reset} ${message}`);
}

function logSuccess(message) {
    // console.log(`${colors.green}✅ [SUSPENSIONS]${colors.reset} ${message}`);
}

function logWarning(message) {
    // console.log(`${colors.yellow}⚠️  [SUSPENSIONS]${colors.reset} ${message}`);
}

function logError(message) {
    // console.log(`${colors.red}❌ [SUSPENSIONS]${colors.reset} ${message}`);
}

// Fonctions pour charger et sauvegarder les données
function loadSuspensions() {
    try {
        const suspensionsPath = path.join(process.cwd(), 'json', 'suspensions.json');
        if (!fs.existsSync(suspensionsPath)) {
            return {};
        }
        const data = fs.readFileSync(suspensionsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        logError(`Erreur lors du chargement des suspensions: ${error.message}`);
        return {};
    }
}

function saveSuspensions(data) {
    try {
        const suspensionsPath = path.join(process.cwd(), 'json', 'suspensions.json');
        fs.writeFileSync(suspensionsPath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        logError(`Erreur lors de la sauvegarde des suspensions: ${error.message}`);
        return false;
    }
}

// Initialiser la configuration d'un serveur
function initializeGuildConfig(guildId) {
    const data = loadSuspensions();
    if (!data[guildId]) {
        data[guildId] = {
            config: { ...DEFAULT_CONFIG },
            users: {}
        };
        saveSuspensions(data);
        logInfo(`Configuration initialisée pour le serveur ${guildId}`);
    }
    return data[guildId];
}

// Obtenir les données d'un utilisateur
function getUserData(guildId, userId) {
    const data = loadSuspensions();
    const guildData = data[guildId] || initializeGuildConfig(guildId);
    
    if (!guildData.users[userId]) {
        guildData.users[userId] = {
            warnings: 0,
            suspension_level: 0,
            expires: null,
            reason: null,
            history: []
        };
        data[guildId] = guildData;
        saveSuspensions(data);
    }
    
    return guildData.users[userId];
}

// Ajouter un avertissement
async function addWarning(guild, user, moderator, reason) {
    const guildId = guild.id;
    const userId = user.id;
    const data = loadSuspensions();
    
    initializeGuildConfig(guildId);
    const userData = getUserData(guildId, userId);
    
    userData.warnings += 1;
    userData.history.push({
        date: new Date().toISOString(),
        action: 'warning',
        moderator: `${moderator.username}#${moderator.discriminator}`,
        reason: reason
    });
    
    data[guildId].users[userId] = userData;
    saveSuspensions(data);
    
    logSuccess(`Avertissement ajouté à ${user.username} (${userData.warnings}/${data[guildId].config.max_warnings})`);
    
    // Vérifier si une suspension automatique est nécessaire
    if (userData.warnings >= data[guildId].config.max_warnings) {
        await applySuspension(guild, user, 1, 'Suspension automatique après 3 avertissements', moderator);
    }
    
    return userData;
}

// Appliquer une suspension
async function applySuspension(guild, user, level, reason, moderator) {
    const guildId = guild.id;
    const userId = user.id;
    const data = loadSuspensions();
    
    const guildData = initializeGuildConfig(guildId);
    const userData = getUserData(guildId, userId);
    const config = guildData.config;
    
    // Calculer la durée d'expiration
    let duration;
    switch (level) {
        case 1:
            duration = config.suspension1_duration;
            break;
        case 2:
            duration = config.suspension2_duration;
            break;
        case 3:
            duration = config.suspension3_duration;
            break;
        default:
            duration = 60; // 1 heure par défaut
    }
    
    const expiresAt = new Date(Date.now() + (duration * 60 * 1000));
    
    // Mettre à jour les données utilisateur
    userData.suspension_level = level;
    userData.expires = expiresAt.toISOString();
    userData.reason = reason;
    userData.warnings = 0; // Reset des avertissements après suspension
    userData.history.push({
        date: new Date().toISOString(),
        action: `suspension${level}`,
        moderator: moderator ? `${moderator.username}#${moderator.discriminator}` : 'Système automatique',
        reason: reason,
        expires: expiresAt.toISOString()
    });
    
    data[guildId].users[userId] = userData;
    saveSuspensions(data);
    
    // Appliquer les rôles et restrictions
    await applyRoleRestrictions(guild, user, level);
    
    // Envoyer un DM à l'utilisateur
    await sendSuspensionDM(user, level, duration, reason);
    
    // Logger dans le canal de logs
    await logSuspensionAction(guild, user, level, reason, moderator, expiresAt);
    
    logSuccess(`Suspension niveau ${level} appliquée à ${user.username} jusqu'à ${expiresAt.toLocaleString()}`);
    
    return userData;
}

// Appliquer les restrictions de rôles
async function applyRoleRestrictions(guild, user, level) {
    try {
        const member = await guild.members.fetch(user.id);
        const data = loadSuspensions();
        const config = data[guild.id]?.config || DEFAULT_CONFIG;
        
        // Retirer les anciens rôles de suspension
        const rolesToRemove = [];
        if (config.roles.suspension1) {
            const role1 = guild.roles.cache.get(config.roles.suspension1);
            if (role1 && member.roles.cache.has(role1.id)) {
                rolesToRemove.push(role1);
            }
        }
        if (config.roles.suspension2) {
            const role2 = guild.roles.cache.get(config.roles.suspension2);
            if (role2 && member.roles.cache.has(role2.id)) {
                rolesToRemove.push(role2);
            }
        }
        if (config.roles.suspension3) {
            const role3 = guild.roles.cache.get(config.roles.suspension3);
            if (role3 && member.roles.cache.has(role3.id)) {
                rolesToRemove.push(role3);
            }
        }
        
        if (rolesToRemove.length > 0) {
            await member.roles.remove(rolesToRemove);
        }
        
        // Ajouter le nouveau rôle de suspension
        let roleId;
        switch (level) {
            case 1:
                roleId = config.roles.suspension1;
                break;
            case 2:
                roleId = config.roles.suspension2;
                break;
            case 3:
                roleId = config.roles.suspension3;
                break;
        }
        
        if (roleId) {
            const role = guild.roles.cache.get(roleId);
            if (role) {
                await member.roles.add(role);
                logSuccess(`Rôle de suspension ${level} ajouté à ${user.username}`);
            } else {
                logWarning(`Rôle de suspension ${level} non trouvé (ID: ${roleId})`);
            }
        } else {
            logWarning(`Aucun rôle configuré pour la suspension niveau ${level}`);
        }
        
    } catch (error) {
        logError(`Erreur lors de l'application des restrictions de rôles: ${error.message}`);
    }
}

// Envoyer un DM de suspension
async function sendSuspensionDM(user, level, duration, reason) {
    try {
        let durationText;
        if (duration >= 1440) {
            durationText = `${Math.floor(duration / 1440)} jour(s)`;
        } else if (duration >= 60) {
            durationText = `${Math.floor(duration / 60)} heure(s)`;
        } else {
            durationText = `${duration} minute(s)`;
        }
        
        const embed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle(`🚫 Suspension Niveau ${level}`)
            .setDescription(`Tu as été suspendu niveau ${level} pour **${durationText}**.`)
            .addFields(
                { name: '📋 Raison', value: reason || 'Aucune raison spécifiée', inline: false },
                { name: '⏰ Durée', value: durationText, inline: true },
                { name: '📅 Expire le', value: `<t:${Math.floor((Date.now() + duration * 60 * 1000) / 1000)}:F>`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Système de Suspensions Progressives' });
        
        await user.send({ embeds: [embed] });
        logSuccess(`DM de suspension envoyé à ${user.username}`);
    } catch (error) {
        logWarning(`Impossible d'envoyer un DM à ${user.username}: ${error.message}`);
    }
}

// Logger l'action de suspension
async function logSuspensionAction(guild, user, level, reason, moderator, expiresAt) {
    try {
        const data = loadSuspensions();
        const config = data[guild.id]?.config || DEFAULT_CONFIG;
        
        if (!config.channels.logs) {
            logWarning('Aucun canal de logs configuré');
            return;
        }
        
        const logsChannel = guild.channels.cache.get(config.channels.logs);
        if (!logsChannel) {
            logWarning(`Canal de logs non trouvé (ID: ${config.channels.logs})`);
            return;
        }
        
        const embed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle(`🚫 Suspension Niveau ${level} Appliquée`)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
                { name: '👤 Utilisateur', value: `${user} (${user.username}#${user.discriminator})`, inline: false },
                { name: '📋 Raison', value: reason || 'Aucune raison spécifiée', inline: false },
                { name: '👮 Modérateur', value: moderator ? `${moderator}` : 'Système automatique', inline: true },
                { name: '📅 Expire le', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:F>`, inline: true },
                { name: '🆔 ID Utilisateur', value: user.id, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Système de Suspensions Progressives' });
        
        // Boutons d'action pour le staff
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`suspension_staff_cancel_${user.id}`)
                    .setLabel('🟢 Annuler sanction')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`suspension_staff_level1_${user.id}`)
                    .setLabel('⏸️ Suspension 1')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`suspension_staff_level2_${user.id}`)
                    .setLabel('⛔ Suspension 2')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`suspension_staff_level3_${user.id}`)
                    .setLabel('🚷 Suspension 3')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`suspension_staff_ban_${user.id}`)
                    .setLabel('🔨 Ban')
                    .setStyle(ButtonStyle.Danger)
            );
        
        await logsChannel.send({ embeds: [embed], components: [row] });
        logSuccess(`Action de suspension loggée dans ${logsChannel.name}`);
        
    } catch (error) {
        logError(`Erreur lors du logging de la suspension: ${error.message}`);
    }
}

// Retirer une suspension
async function removeSuspension(guild, user, moderator) {
    const guildId = guild.id;
    const userId = user.id;
    const data = loadSuspensions();
    
    const userData = getUserData(guildId, userId);
    
    if (userData.suspension_level === 0) {
        return { success: false, message: 'Cet utilisateur n\'a aucune suspension active.' };
    }
    
    // Retirer les rôles de suspension
    try {
        const member = await guild.members.fetch(userId);
        const config = data[guildId]?.config || DEFAULT_CONFIG;
        
        const rolesToRemove = [];
        [config.roles.suspension1, config.roles.suspension2, config.roles.suspension3].forEach(roleId => {
            if (roleId) {
                const role = guild.roles.cache.get(roleId);
                if (role && member.roles.cache.has(role.id)) {
                    rolesToRemove.push(role);
                }
            }
        });
        
        if (rolesToRemove.length > 0) {
            await member.roles.remove(rolesToRemove);
        }
        
    } catch (error) {
        logError(`Erreur lors de la suppression des rôles: ${error.message}`);
    }
    
    // Mettre à jour les données
    userData.suspension_level = 0;
    userData.expires = null;
    userData.reason = null;
    userData.history.push({
        date: new Date().toISOString(),
        action: 'suspension_removed',
        moderator: moderator ? `${moderator.username}#${moderator.discriminator}` : 'Système automatique'
    });
    
    data[guildId].users[userId] = userData;
    saveSuspensions(data);
    
    logSuccess(`Suspension retirée pour ${user.username}`);
    
    return { success: true, message: 'Suspension retirée avec succès.' };
}

// Vérifier les suspensions expirées
async function checkExpiredSuspensions(client) {
    try {
        const data = loadSuspensions();
        const now = new Date();
        
        for (const guildId in data) {
            const guild = client.guilds.cache.get(guildId);
            if (!guild) continue;
            
            for (const userId in data[guildId].users) {
                const userData = data[guildId].users[userId];
                
                if (userData.suspension_level > 0 && userData.expires) {
                    const expiresAt = new Date(userData.expires);
                    
                    if (now >= expiresAt) {
                        const user = await client.users.fetch(userId).catch(() => null);
                        if (user) {
                            await removeSuspension(guild, user, null);
                            logInfo(`Suspension expirée automatiquement pour ${user.username}`);
                        }
                    }
                }
            }
        }
    } catch (error) {
        logError(`Erreur lors de la vérification des suspensions expirées: ${error.message}`);
    }
}

// Réinitialiser complètement les données d'un utilisateur
async function resetUserData(guild, user, moderator = null) {
    try {
        const data = loadSuspensions();
        const guildId = guild.id;
        const userId = user.id;
        
        // Initialiser la configuration du serveur si nécessaire
        if (!data[guildId]) {
            initializeGuildConfig(guildId, data);
        }
        
        // Retirer tous les rôles de suspension
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) {
            const config = data[guildId].config || DEFAULT_CONFIG;
            const rolesToRemove = [];
            
            [config.roles.suspension1, config.roles.suspension2, config.roles.suspension3].forEach(roleId => {
                if (roleId) {
                    const role = guild.roles.cache.get(roleId);
                    if (role && member.roles.cache.has(roleId)) {
                        rolesToRemove.push(role);
                    }
                }
            });
            
            if (rolesToRemove.length > 0) {
                await member.roles.remove(rolesToRemove);
            }
        }
        
        // Réinitialiser les données utilisateur
        data[guildId].users[userId] = {
            warnings: 0,
            suspension_level: 0,
            expires: null,
            reason: null,
            history: [{
                date: new Date().toISOString(),
                action: 'reset',
                moderator: moderator ? `${moderator.username}#${moderator.discriminator}` : 'Système'
            }]
        };
        
        saveSuspensions(data);
        
        logSuccess(`Données réinitialisées pour ${user.username} par ${moderator ? moderator.username : 'Système'}`);
        
        return { success: true, message: 'Données utilisateur réinitialisées avec succès.' };
        
    } catch (error) {
        logError(`Erreur lors de la réinitialisation des données pour ${user.username}: ${error.message}`);
        return { success: false, message: 'Erreur lors de la réinitialisation.' };
    }
}

export {
    loadSuspensions,
    saveSuspensions,
    initializeGuildConfig,
    getUserData,
    addWarning,
    applySuspension,
    removeSuspension,
    resetUserData,
    checkExpiredSuspensions,
    logInfo,
    logSuccess,
    logWarning,
    logError,
    DEFAULT_CONFIG
};