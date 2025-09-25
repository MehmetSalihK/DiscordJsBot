const { loadSuspensionData, saveSuspensionData } = require('./suspensionRoles');
const { EmbedBuilder } = require('discord.js');

// Map pour stocker les timers actifs
const activeTimers = new Map();

/**
 * Démarre un timer de suspension
 * @param {Object} client - Le client Discord
 * @param {string} guildId - ID du serveur
 * @param {string} userId - ID de l'utilisateur
 * @param {number} duration - Durée en millisecondes
 * @param {string} reason - Raison de la suspension
 * @param {string} moderatorId - ID du modérateur
 * @param {number} level - Niveau de suspension (1, 2, ou 3)
 */
async function startSuspensionTimer(client, guildId, userId, duration, reason, moderatorId, level) {
    try {
        const data = await loadSuspensionData();
        
        if (!data.guilds[guildId]) {
            data.guilds[guildId] = { config: {}, suspensions: {} };
        }

        const suspensionId = `${guildId}_${userId}_${Date.now()}`;
        const expiresAt = Date.now() + duration;

        // Enregistrer la suspension
        data.guilds[guildId].suspensions[userId] = {
            id: suspensionId,
            userId,
            guildId,
            reason,
            moderatorId,
            level,
            startedAt: Date.now(),
            expiresAt,
            active: true
        };

        await saveSuspensionData(data);

        // Créer le timer
        const timeoutId = setTimeout(async () => {
            await expireSuspension(client, guildId, userId);
        }, duration);

        // Stocker le timer
        activeTimers.set(suspensionId, {
            timeoutId,
            guildId,
            userId,
            expiresAt
        });

        // console.log(`[SUSPENSION] Timer démarré pour ${userId} sur ${guildId} (${duration}ms)`);
        return suspensionId;

    } catch (error) {
        // console.error('Erreur lors du démarrage du timer de suspension:', error);
        throw error;
    }
}

/**
 * Expire une suspension automatiquement
 * @param {Object} client - Le client Discord
 * @param {string} guildId - ID du serveur
 * @param {string} userId - ID de l'utilisateur
 */
async function expireSuspension(client, guildId, userId) {
    try {
        const data = await loadSuspensionData();
        const guild = client.guilds.cache.get(guildId);
        
        if (!guild) {
            // console.error(`[SUSPENSION] Serveur ${guildId} introuvable`);
            return;
        }

        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) {
            // console.error(`[SUSPENSION] Membre ${userId} introuvable sur ${guildId}`);
            return;
        }

        const suspension = data.guilds[guildId]?.suspensions?.[userId];
        if (!suspension || !suspension.active) {
            // console.log(`[SUSPENSION] Aucune suspension active trouvée pour ${userId}`);
            return;
        }

        // Retirer les rôles de suspension
        const config = data.guilds[guildId].config;
        const rolesToRemove = [];

        if (config.roles?.level1 && member.roles.cache.has(config.roles.level1)) {
            rolesToRemove.push(config.roles.level1);
        }
        if (config.roles?.level2 && member.roles.cache.has(config.roles.level2)) {
            rolesToRemove.push(config.roles.level2);
        }
        if (config.roles?.level3 && member.roles.cache.has(config.roles.level3)) {
            rolesToRemove.push(config.roles.level3);
        }

        if (rolesToRemove.length > 0) {
            await member.roles.remove(rolesToRemove, 'Expiration automatique de la suspension');
        }

        // Marquer la suspension comme inactive
        suspension.active = false;
        suspension.endedAt = Date.now();
        suspension.endReason = 'Expiration automatique';

        await saveSuspensionData(data);

        // Supprimer le timer de la map
        const suspensionId = suspension.id;
        if (activeTimers.has(suspensionId)) {
            activeTimers.delete(suspensionId);
        }

        // Envoyer une notification dans les logs
        await sendExpirationLog(client, guild, member, suspension);

        // console.log(`[SUSPENSION] Suspension expirée pour ${userId} sur ${guildId}`);

    } catch (error) {
        // console.error('Erreur lors de l\'expiration de la suspension:', error);
    }
}

/**
 * Envoie un log d'expiration de suspension
 * @param {Object} client - Le client Discord
 * @param {Object} guild - Le serveur Discord
 * @param {Object} member - Le membre Discord
 * @param {Object} suspension - Les données de suspension
 */
async function sendExpirationLog(client, guild, member, suspension) {
    try {
        const data = await loadSuspensionData();
        const config = data.guilds[guild.id]?.config;
        
        if (!config?.logChannel) return;

        const logChannel = guild.channels.cache.get(config.logChannel);
        if (!logChannel) return;

        const moderator = await client.users.fetch(suspension.moderatorId).catch(() => null);
        const duration = suspension.expiresAt - suspension.startedAt;
        const durationText = formatDuration(duration);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🔓 Suspension expirée')
            .setDescription(`La suspension de ${member.user.tag} a expiré automatiquement.`)
            .addFields(
                { name: '👤 Utilisateur', value: `${member.user.tag} (${member.id})`, inline: true },
                { name: '🛡️ Modérateur', value: moderator ? `${moderator.tag}` : 'Inconnu', inline: true },
                { name: '📊 Niveau', value: `Niveau ${suspension.level}`, inline: true },
                { name: '⏱️ Durée', value: durationText, inline: true },
                { name: '📝 Raison initiale', value: suspension.reason || 'Aucune raison fournie', inline: false },
                { name: '🕐 Début', value: `<t:${Math.floor(suspension.startedAt / 1000)}:F>`, inline: true },
                { name: '🕐 Fin', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Système de suspension automatique' });

        await logChannel.send({ embeds: [embed] });

    } catch (error) {
        // console.error('Erreur lors de l\'envoi du log d\'expiration:', error);
    }
}

/**
 * Annule une suspension avant son expiration
 * @param {Object} client - Le client Discord
 * @param {string} guildId - ID du serveur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} moderatorId - ID du modérateur qui annule
 * @param {string} reason - Raison de l'annulation
 */
async function cancelSuspension(client, guildId, userId, moderatorId, reason = 'Annulation manuelle') {
    try {
        const data = await loadSuspensionData();
        const suspension = data.guilds[guildId]?.suspensions?.[userId];
        
        if (!suspension || !suspension.active) {
            throw new Error('Aucune suspension active trouvée pour cet utilisateur');
        }

        // Annuler le timer
        if (activeTimers.has(suspension.id)) {
            const timer = activeTimers.get(suspension.id);
            clearTimeout(timer.timeoutId);
            activeTimers.delete(suspension.id);
        }

        // Retirer les rôles de suspension
        const guild = client.guilds.cache.get(guildId);
        if (guild) {
            const member = await guild.members.fetch(userId).catch(() => null);
            if (member) {
                const config = data.guilds[guildId].config;
                const rolesToRemove = [];

                if (config.roles?.level1 && member.roles.cache.has(config.roles.level1)) {
                    rolesToRemove.push(config.roles.level1);
                }
                if (config.roles?.level2 && member.roles.cache.has(config.roles.level2)) {
                    rolesToRemove.push(config.roles.level2);
                }
                if (config.roles?.level3 && member.roles.cache.has(config.roles.level3)) {
                    rolesToRemove.push(config.roles.level3);
                }

                if (rolesToRemove.length > 0) {
                    await member.roles.remove(rolesToRemove, `Annulation par ${moderatorId}: ${reason}`);
                }
            }
        }

        // Marquer comme annulée
        suspension.active = false;
        suspension.endedAt = Date.now();
        suspension.endReason = reason;
        suspension.cancelledBy = moderatorId;

        await saveSuspensionData(data);

        // console.log(`[SUSPENSION] Suspension annulée pour ${userId} sur ${guildId}`);
        return true;

    } catch (error) {
        // console.error('Erreur lors de l\'annulation de la suspension:', error);
        throw error;
    }
}

/**
 * Charge tous les timers actifs au démarrage du bot
 * @param {Object} client - Le client Discord
 */
async function loadActiveTimers(client) {
    try {
        const data = await loadSuspensionData();
        let loadedCount = 0;

        for (const guildId in data.guilds) {
            const guild = data.guilds[guildId];
            if (!guild.suspensions) continue;

            for (const userId in guild.suspensions) {
                const suspension = guild.suspensions[userId];
                
                if (!suspension.active) continue;

                const now = Date.now();
                const timeLeft = suspension.expiresAt - now;

                if (timeLeft <= 0) {
                    // Expirer immédiatement
                    await expireSuspension(client, guildId, userId);
                } else {
                    // Recréer le timer
                    const timeoutId = setTimeout(async () => {
                        await expireSuspension(client, guildId, userId);
                    }, timeLeft);

                    activeTimers.set(suspension.id, {
                        timeoutId,
                        guildId,
                        userId,
                        expiresAt: suspension.expiresAt
                    });

                    loadedCount++;
                }
            }
        }

        // console.log(`[SUSPENSION] ${loadedCount} timers actifs rechargés`);

    } catch (error) {
        // console.error('Erreur lors du chargement des timers actifs:', error);
    }
}

/**
 * Obtient les informations d'une suspension active
 * @param {string} guildId - ID du serveur
 * @param {string} userId - ID de l'utilisateur
 */
async function getSuspensionInfo(guildId, userId) {
    try {
        const data = await loadSuspensionData();
        const suspension = data.guilds[guildId]?.suspensions?.[userId];
        
        if (!suspension || !suspension.active) {
            return null;
        }

        const timeLeft = suspension.expiresAt - Date.now();
        
        return {
            ...suspension,
            timeLeft: Math.max(0, timeLeft),
            timeLeftFormatted: formatDuration(Math.max(0, timeLeft))
        };

    } catch (error) {
        // console.error('Erreur lors de la récupération des informations de suspension:', error);
        return null;
    }
}

/**
 * Formate une durée en millisecondes en texte lisible
 * @param {number} ms - Durée en millisecondes
 */
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days}j ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

/**
 * Obtient la liste de toutes les suspensions actives d'un serveur
 * @param {string} guildId - ID du serveur
 */
async function getActiveSuspensions(guildId) {
    try {
        const data = await loadSuspensionData();
        const guild = data.guilds[guildId];
        
        if (!guild || !guild.suspensions) {
            return [];
        }

        const activeSuspensions = [];
        const now = Date.now();

        for (const userId in guild.suspensions) {
            const suspension = guild.suspensions[userId];
            
            if (suspension.active && suspension.expiresAt > now) {
                activeSuspensions.push({
                    ...suspension,
                    timeLeft: suspension.expiresAt - now,
                    timeLeftFormatted: formatDuration(suspension.expiresAt - now)
                });
            }
        }

        return activeSuspensions.sort((a, b) => a.expiresAt - b.expiresAt);

    } catch (error) {
        console.error('Erreur lors de la récupération des suspensions actives:', error);
        return [];
    }
}

module.exports = {
    startSuspensionTimer,
    expireSuspension,
    cancelSuspension,
    loadActiveTimers,
    getSuspensionInfo,
    getActiveSuspensions,
    formatDuration
};