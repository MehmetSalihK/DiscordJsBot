import xpDataManager from './xpDataManager.js';

/**
 * Gestionnaire des récompenses de rôles par niveau
 */
export default class RoleRewardManager {
    
    /**
     * Vérifie et attribue les récompenses de rôles pour un utilisateur
     * @param {Guild} guild - Le serveur Discord
     * @param {string} userId - L'ID de l'utilisateur
     * @param {number} newLevel - Le nouveau niveau de l'utilisateur
     * @param {number} oldLevel - L'ancien niveau de l'utilisateur
     * @returns {Promise<Array>} - Liste des récompenses attribuées
     */
    static async checkAndAwardRoles(guild, userId, newLevel, oldLevel = 0) {
        try {
            const config = await xpDataManager.getLevelConfig();
            const member = await guild.members.fetch(userId).catch(() => null);
            
            if (!member || !config.roleRewards || config.roleRewards.length === 0) {
                return [];
            }

            const rewardsToGive = [];
            const rewardsToRemove = [];

            // Parcourir toutes les récompenses configurées
            for (const reward of config.roleRewards) {
                const role = guild.roles.cache.get(reward.roleId);
                if (!role) {
                    console.warn(`[ROLE-REWARDS] ⚠️ Rôle ${reward.roleId} introuvable pour le niveau ${reward.level}`);
                    continue;
                }

                const hasRole = member.roles.cache.has(reward.roleId);

                // Si l'utilisateur atteint le niveau requis et n'a pas le rôle
                if (newLevel >= reward.level && !hasRole) {
                    rewardsToGive.push(reward);
                }
                // Si l'utilisateur n'atteint plus le niveau requis et a le rôle (pour les rôles temporaires)
                else if (newLevel < reward.level && hasRole && reward.removeOnLevelDown) {
                    rewardsToRemove.push(reward);
                }
            }

            // Attribuer les nouveaux rôles
            for (const reward of rewardsToGive) {
                try {
                    const role = guild.roles.cache.get(reward.roleId);
                    await member.roles.add(role, `Récompense XP - Niveau ${reward.level} atteint`);
                    console.log(`[ROLE-REWARDS] ✅ Rôle ${role.name} attribué à ${member.user.tag} (niveau ${newLevel})`);
                } catch (error) {
                    console.error(`[ROLE-REWARDS] ❌ Erreur lors de l'attribution du rôle ${reward.roleId}:`, error);
                }
            }

            // Retirer les rôles si nécessaire
            for (const reward of rewardsToRemove) {
                try {
                    const role = guild.roles.cache.get(reward.roleId);
                    await member.roles.remove(role, `Récompense XP - Niveau ${reward.level} non atteint`);
                    console.log(`[ROLE-REWARDS] ➖ Rôle ${role.name} retiré de ${member.user.tag} (niveau ${newLevel})`);
                } catch (error) {
                    console.error(`[ROLE-REWARDS] ❌ Erreur lors du retrait du rôle ${reward.roleId}:`, error);
                }
            }

            return rewardsToGive;

        } catch (error) {
            console.error('[ROLE-REWARDS] ❌ Erreur lors de la vérification des récompenses:', error);
            return [];
        }
    }

    /**
     * Synchronise tous les rôles d'un utilisateur avec son niveau actuel
     * @param {Guild} guild - Le serveur Discord
     * @param {string} userId - L'ID de l'utilisateur
     * @param {number} currentLevel - Le niveau actuel de l'utilisateur
     * @returns {Promise<Object>} - Résultat de la synchronisation
     */
    static async syncUserRoles(guild, userId, currentLevel) {
        try {
            const config = await xpDataManager.getLevelConfig();
            const member = await guild.members.fetch(userId).catch(() => null);
            
            if (!member || !config.roleRewards || config.roleRewards.length === 0) {
                return { added: [], removed: [], errors: [] };
            }

            const result = {
                added: [],
                removed: [],
                errors: []
            };

            // Parcourir toutes les récompenses configurées
            for (const reward of config.roleRewards) {
                const role = guild.roles.cache.get(reward.roleId);
                if (!role) {
                    result.errors.push(`Rôle ${reward.roleId} introuvable`);
                    continue;
                }

                const hasRole = member.roles.cache.has(reward.roleId);
                const shouldHaveRole = currentLevel >= reward.level;

                try {
                    // Ajouter le rôle si nécessaire
                    if (shouldHaveRole && !hasRole) {
                        await member.roles.add(role, `Synchronisation XP - Niveau ${currentLevel}`);
                        result.added.push(reward);
                        console.log(`[ROLE-REWARDS] ✅ Rôle ${role.name} ajouté lors de la sync pour ${member.user.tag}`);
                    }
                    // Retirer le rôle si nécessaire (seulement si removeOnLevelDown est activé)
                    else if (!shouldHaveRole && hasRole && reward.removeOnLevelDown) {
                        await member.roles.remove(role, `Synchronisation XP - Niveau ${currentLevel}`);
                        result.removed.push(reward);
                        console.log(`[ROLE-REWARDS] ➖ Rôle ${role.name} retiré lors de la sync pour ${member.user.tag}`);
                    }
                } catch (error) {
                    result.errors.push(`Erreur avec le rôle ${role.name}: ${error.message}`);
                    console.error(`[ROLE-REWARDS] ❌ Erreur lors de la sync du rôle ${reward.roleId}:`, error);
                }
            }

            return result;

        } catch (error) {
            console.error('[ROLE-REWARDS] ❌ Erreur lors de la synchronisation des rôles:', error);
            return { added: [], removed: [], errors: [error.message] };
        }
    }

    /**
     * Synchronise tous les utilisateurs du serveur avec leurs niveaux actuels
     * @param {Guild} guild - Le serveur Discord
     * @param {Function} progressCallback - Callback pour suivre le progrès (optionnel)
     * @returns {Promise<Object>} - Résultat de la synchronisation globale
     */
    static async syncAllUsers(guild, progressCallback = null) {
        try {
            const messageXPHandler = (await import('./messageXpHandler.js')).default;
            const voiceXPHandler = (await import('./voiceXpHandler.js')).default;
            const XPCalculator = (await import('./xpCalculator.js')).default;

            // Récupérer tous les utilisateurs avec de l'XP
            const messageLeaderboard = await messageXPHandler.getLeaderboard(guild.id, 1000);
            const voiceLeaderboard = await voiceXPHandler.getVoiceLeaderboard(guild.id, 1000);

            // Créer un map pour combiner les XP
            const allUsers = new Map();
            
            messageLeaderboard.forEach(user => {
                allUsers.set(user.userId, {
                    userId: user.userId,
                    messageXp: user.totalXp,
                    voiceXp: 0
                });
            });
            
            voiceLeaderboard.forEach(user => {
                if (allUsers.has(user.userId)) {
                    allUsers.get(user.userId).voiceXp = user.totalXp;
                } else {
                    allUsers.set(user.userId, {
                        userId: user.userId,
                        messageXp: 0,
                        voiceXp: user.totalXp
                    });
                }
            });

            const totalUsers = allUsers.size;
            let processedUsers = 0;
            const result = {
                totalUsers,
                processedUsers: 0,
                totalAdded: 0,
                totalRemoved: 0,
                errors: []
            };

            console.log(`[ROLE-REWARDS] 🔄 Début de la synchronisation pour ${totalUsers} utilisateurs`);

            // Traiter chaque utilisateur
            for (const [userId, userData] of allUsers) {
                try {
                    const totalXp = userData.messageXp + userData.voiceXp;
                    const levelInfo = await XPCalculator.getUserLevelInfo(totalXp);
                    
                    const syncResult = await this.syncUserRoles(guild, userId, levelInfo.level);
                    
                    result.totalAdded += syncResult.added.length;
                    result.totalRemoved += syncResult.removed.length;
                    result.errors.push(...syncResult.errors);
                    
                    processedUsers++;
                    result.processedUsers = processedUsers;

                    // Appeler le callback de progrès si fourni
                    if (progressCallback) {
                        progressCallback(processedUsers, totalUsers, userId);
                    }

                    // Petite pause pour éviter de surcharger l'API Discord
                    if (processedUsers % 10 === 0) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }

                } catch (error) {
                    result.errors.push(`Erreur pour l'utilisateur ${userId}: ${error.message}`);
                    console.error(`[ROLE-REWARDS] ❌ Erreur lors de la sync de l'utilisateur ${userId}:`, error);
                }
            }

            console.log(`[ROLE-REWARDS] ✅ Synchronisation terminée: ${result.totalAdded} rôles ajoutés, ${result.totalRemoved} rôles retirés, ${result.errors.length} erreurs`);
            return result;

        } catch (error) {
            console.error('[ROLE-REWARDS] ❌ Erreur lors de la synchronisation globale:', error);
            return {
                totalUsers: 0,
                processedUsers: 0,
                totalAdded: 0,
                totalRemoved: 0,
                errors: [error.message]
            };
        }
    }

    /**
     * Ajoute une nouvelle récompense de rôle
     * @param {number} level - Le niveau requis
     * @param {string} roleId - L'ID du rôle à attribuer
     * @param {boolean} removeOnLevelDown - Si le rôle doit être retiré si le niveau baisse
     * @returns {Promise<boolean>} - Succès de l'ajout
     */
    static async addRoleReward(level, roleId, removeOnLevelDown = false) {
        try {
            const config = await xpDataManager.getLevelConfig();
            
            // Vérifier si le tableau existe
            if (!Array.isArray(config.roleRewards)) {
                config.roleRewards = [];
            }
            
            // Vérifier si la récompense existe déjà
            const existingReward = config.roleRewards.find(r => r.level === level || r.roleId === roleId);
            if (existingReward) {
                console.warn(`[ROLE-REWARDS] ⚠️ Récompense déjà existante pour le niveau ${level} ou le rôle ${roleId}`);
                return false;
            }

            // Ajouter la nouvelle récompense
            config.roleRewards.push({
                level,
                roleId,
                removeOnLevelDown
            });

            // Trier par niveau
            config.roleRewards.sort((a, b) => a.level - b.level);

            await xpDataManager.saveLevelConfig(config);
            console.log(`[ROLE-REWARDS] ✅ Récompense ajoutée: niveau ${level} -> rôle ${roleId}`);
            return true;

        } catch (error) {
            console.error('[ROLE-REWARDS] ❌ Erreur lors de l\'ajout de la récompense:', error);
            return false;
        }
    }

    /**
     * Supprime une récompense de rôle
     * @param {number} level - Le niveau de la récompense à supprimer
     * @returns {Promise<boolean>} - Succès de la suppression
     */
    static async removeRoleReward(level) {
        try {
            const config = await xpDataManager.getLevelConfig();
            
            const initialLength = config.roleRewards.length;
            config.roleRewards = config.roleRewards.filter(r => r.level !== level);
            
            if (config.roleRewards.length === initialLength) {
                console.warn(`[ROLE-REWARDS] ⚠️ Aucune récompense trouvée pour le niveau ${level}`);
                return false;
            }

            await xpDataManager.saveLevelConfig(config);
            console.log(`[ROLE-REWARDS] ✅ Récompense supprimée pour le niveau ${level}`);
            return true;

        } catch (error) {
            console.error('[ROLE-REWARDS] ❌ Erreur lors de la suppression de la récompense:', error);
            return false;
        }
    }

    /**
     * Récupère toutes les récompenses configurées
     * @returns {Promise<Array>} - Liste des récompenses
     */
    static async getAllRewards() {
        try {
            const config = await xpDataManager.getLevelConfig();
            return config.roleRewards || [];
        } catch (error) {
            console.error('[ROLE-REWARDS] ❌ Erreur lors de la récupération des récompenses:', error);
            return [];
        }
    }

    /**
     * Récupère les récompenses disponibles pour un niveau donné
     * @param {number} level - Le niveau à vérifier
     * @returns {Promise<Array>} - Liste des récompenses disponibles
     */
    static async getRewardsForLevel(level) {
        try {
            const config = await xpDataManager.getLevelConfig();
            return config.roleRewards.filter(r => r.level <= level) || [];
        } catch (error) {
            console.error('[ROLE-REWARDS] ❌ Erreur lors de la récupération des récompenses pour le niveau:', error);
            return [];
        }
    }

    /**
     * Récupère la prochaine récompense disponible pour un niveau donné
     * @param {number} currentLevel - Le niveau actuel
     * @returns {Promise<Object|null>} - La prochaine récompense ou null
     */
    static async getNextReward(currentLevel) {
        try {
            const config = await xpDataManager.getLevelConfig();
            const nextReward = config.roleRewards
                .filter(r => r.level > currentLevel)
                .sort((a, b) => a.level - b.level)[0];
            
            return nextReward || null;
        } catch (error) {
            console.error('[ROLE-REWARDS] ❌ Erreur lors de la récupération de la prochaine récompense:', error);
            return null;
        }
    }

    /**
     * Valide qu'un rôle existe et peut être géré par le bot
     * @param {Guild} guild - Le serveur Discord
     * @param {string} roleId - L'ID du rôle à valider
     * @returns {Promise<Object>} - Résultat de la validation
     */
    static async validateRole(guild, roleId) {
        try {
            const role = guild.roles.cache.get(roleId);
            
            if (!role) {
                return {
                    valid: false,
                    error: 'Rôle introuvable'
                };
            }

            const botMember = guild.members.me;
            if (!botMember) {
                return {
                    valid: false,
                    error: 'Impossible de récupérer les informations du bot'
                };
            }

            // Vérifier si le bot peut gérer ce rôle
            if (role.position >= botMember.roles.highest.position) {
                return {
                    valid: false,
                    error: 'Le rôle est trop élevé dans la hiérarchie pour être géré par le bot'
                };
            }

            // Vérifier si le rôle est gérable
            if (!role.editable) {
                return {
                    valid: false,
                    error: 'Le rôle ne peut pas être géré par le bot'
                };
            }

            return {
                valid: true,
                role: role
            };

        } catch (error) {
            console.error('[ROLE-REWARDS] ❌ Erreur lors de la validation du rôle:', error);
            return {
                valid: false,
                error: error.message
            };
        }
    }
}