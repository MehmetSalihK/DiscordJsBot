import xpDataManager from './xpDataManager.js';
import XPCalculator from './xpCalculator.js';

class MessageXPHandler {
    constructor() {
        this.recentMessages = new Map(); // Pour détecter le spam
        this.cleanupInterval = setInterval(() => {
            this.cleanupOldMessages();
        }, 60000); // Nettoyer toutes les minutes
    }

    /**
     * Traite un message pour l'attribution d'XP
     */
    async processMessage(message) {
        try {
            console.log('[XP-DEBUG] 🔍 Traitement du message de:', message.author.username);
            
            // Vérifications de base
            if (!this.shouldProcessMessage(message)) {
                console.log('[XP-DEBUG] ❌ Message ignoré (shouldProcessMessage)');
                return null;
            }

            // Invalider le cache pour forcer le rechargement de la config
            xpDataManager.invalidateCache('levelConfig');
            const config = await xpDataManager.getLevelConfig();
            console.log('[XP-DEBUG] 📋 Config chargée, enabled:', config.enabled, 'xpPerMessage:', config.messageXp.xpPerMessage, 'minLength:', config.messageXp.minMessageLength);
            
            if (!config.enabled) {
                console.log('[XP-DEBUG] ❌ Système XP désactivé');
                return null;
            }

            const userId = message.author.id;
            const guildId = message.guild.id;
            const userKey = `${guildId}_${userId}`;
            console.log('[XP-DEBUG] 🔑 UserKey:', userKey);

            // Vérifier le cooldown
            if (await this.isOnCooldown(userKey)) {
                console.log('[XP-DEBUG] ⏰ Utilisateur en cooldown');
                return null;
            }

            // Vérifier les exclusions
            if (this.isExcluded(message, config)) {
                console.log('[XP-DEBUG] 🚫 Message/utilisateur exclu');
                return null;
            }

            // Vérifier le contenu du message
            if (!this.isValidMessageContent(message.content, config)) {
                console.log('[XP-DEBUG] 📝 Contenu du message invalide:', message.content.substring(0, 50));
                return null;
            }

            // Vérifier le spam
            if (this.isSpam(message)) {
                console.log('[XP-DEBUG] 🚨 Message détecté comme spam');
                return null;
            }

            // Attribuer l'XP
            console.log('[XP-DEBUG] ✅ Attribution de', config.messageXp.xpPerMessage, 'XP à', userKey);
            const xpGained = await this.awardXP(userKey, config.messageXp.xpPerMessage);
            
            // Mettre à jour le cooldown
            await this.setCooldown(userKey, config.messageXp.cooldownSeconds);

            return {
                xpGained: xpGained.xpGained,
                totalXp: xpGained.totalXp,
                levelInfo: xpGained.levelInfo,
                levelUp: xpGained.levelUp
            };

        } catch (error) {
            console.error('[XP-SYSTEM] ❌ Erreur lors du traitement du message:');
            console.error('[XP-SYSTEM] ❌ Type d\'erreur:', error?.constructor?.name);
            console.error('[XP-SYSTEM] ❌ Message d\'erreur:', error?.message);
            console.error('[XP-SYSTEM] ❌ Stack trace:', error?.stack);
            console.error('[XP-SYSTEM] ❌ Erreur complète:', error);
            return null;
        }
    }

    /**
     * Vérifie si le message doit être traité
     */
    shouldProcessMessage(message) {
        // Ignorer les bots et webhooks
        if (message.author.bot || message.webhookId) return false;
        
        // Ignorer les messages sans guild
        if (!message.guild) return false;
        
        // Ignorer les messages système
        if (message.system) return false;

        return true;
    }

    /**
     * Vérifie si l'utilisateur est en cooldown
     */
    async isOnCooldown(userKey) {
        console.log('[XP-DEBUG] 🕐 Vérification cooldown pour:', userKey);
        // Invalider le cache pour forcer le rechargement
        xpDataManager.invalidateCache('messageXp');
        const data = await xpDataManager.getMessageXpData();
        console.log('[XP-DEBUG] 🕐 Données chargées, cooldowns:', data.cooldowns);
        
        if (!data.cooldowns) {
            console.log('[XP-DEBUG] 🕐 Pas de propriété cooldowns, initialisation...');
            data.cooldowns = {};
        }
        
        const cooldownEnd = data.cooldowns[userKey];
        console.log('[XP-DEBUG] 🕐 Cooldown end pour cet utilisateur:', cooldownEnd);
        
        if (!cooldownEnd) {
            console.log('[XP-DEBUG] 🕐 Pas de cooldown actif');
            return false;
        }
        
        const now = Date.now();
        if (now < cooldownEnd) {
            console.log('[XP-DEBUG] 🕐 Utilisateur en cooldown jusqu\'à:', new Date(cooldownEnd));
            return true;
        }
        
        // Nettoyer le cooldown expiré
        console.log('[XP-DEBUG] 🕐 Cooldown expiré, nettoyage...');
        delete data.cooldowns[userKey];
        await xpDataManager.saveMessageXpData(data);
        return false;
    }

    /**
     * Définit un cooldown pour l'utilisateur
     */
    async setCooldown(userKey, cooldownSeconds) {
        const data = await xpDataManager.getMessageXpData();
        data.cooldowns[userKey] = Date.now() + (cooldownSeconds * 1000);
        await xpDataManager.saveMessageXpData(data);
    }

    /**
     * Vérifie si le message/utilisateur est exclu
     */
    isExcluded(message, config) {
        // Vérifier les canaux exclus
        if (config.excludedChannels.includes(message.channel.id)) {
            return true;
        }

        // Vérifier les rôles exclus
        const memberRoles = message.member?.roles?.cache?.map(role => role.id) || [];
        if (config.excludedRoles.some(roleId => memberRoles.includes(roleId))) {
            return true;
        }

        return false;
    }

    /**
     * Valide le contenu du message
     */
    isValidMessageContent(content, config) {
        const messageConfig = config.messageXp;
        
        // Vérifier la longueur minimale
        if (content.length < messageConfig.minMessageLength) {
            return false;
        }

        // Ignorer les commandes si configuré
        if (messageConfig.ignoreCommands && (content.startsWith('!') || content.startsWith('/'))) {
            return false;
        }

        // Ignorer les messages avec seulement des emojis
        if (messageConfig.ignoreEmojisOnly) {
            const emojiRegex = /^[\s\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]*$/u;
            if (emojiRegex.test(content)) {
                return false;
            }
        }

        // Ignorer les liens si configuré
        if (messageConfig.ignoreLinks) {
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            if (urlRegex.test(content)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Détecte le spam de messages
     */
    isSpam(message) {
        const userId = message.author.id;
        const content = message.content.toLowerCase().trim();
        const now = Date.now();
        
        if (!this.recentMessages.has(userId)) {
            this.recentMessages.set(userId, []);
        }
        
        const userMessages = this.recentMessages.get(userId);
        
        // Ajouter le message actuel
        userMessages.push({
            content: content,
            timestamp: now
        });
        
        // Garder seulement les 5 derniers messages des 30 dernières secondes
        const recentMessages = userMessages.filter(msg => now - msg.timestamp < 30000);
        this.recentMessages.set(userId, recentMessages.slice(-5));
        
        // Vérifier le spam (3+ messages identiques en 30 secondes)
        const identicalMessages = recentMessages.filter(msg => msg.content === content);
        if (identicalMessages.length >= 3) {
            return true;
        }
        
        // Vérifier les messages trop rapides (5+ messages en 10 secondes)
        const veryRecentMessages = recentMessages.filter(msg => now - msg.timestamp < 10000);
        if (veryRecentMessages.length >= 5) {
            return true;
        }
        
        return false;
    }

    /**
     * Attribue de l'XP à un utilisateur
     */
    async awardXP(userKey, xpAmount) {
        console.log('[XP-DEBUG] 💰 awardXP appelé pour:', userKey, 'montant:', xpAmount);
        
        const data = await xpDataManager.getMessageXpData();
        console.log('[XP-DEBUG] 📊 Données chargées, utilisateurs existants:', Object.keys(data.users).length);
        
        if (!data.users[userKey]) {
            console.log('[XP-DEBUG] 👤 Nouvel utilisateur créé:', userKey);
            data.users[userKey] = {
                totalXp: 0,
                messageCount: 0,
                lastMessageDate: null
            };
        }
        
        const userData = data.users[userKey];
        const oldXp = userData.totalXp;
        const newXp = oldXp + xpAmount;
        
        console.log('[XP-DEBUG] 📈 XP: ancien =', oldXp, 'nouveau =', newXp, 'gain =', xpAmount);
        
        userData.totalXp = newXp;
        userData.messageCount += 1;
        userData.lastMessageDate = new Date().toISOString();
        
        // Vérifier le level up
        const levelUp = await XPCalculator.checkLevelUp(oldXp, newXp);
        const levelInfo = await XPCalculator.getUserLevelInfo(newXp);
        
        console.log('[XP-DEBUG] 💾 Sauvegarde des données...');
        await xpDataManager.saveMessageXpData(data);
        console.log('[XP-DEBUG] ✅ Données sauvegardées, levelUp:', levelUp);
        
        return {
            xpGained: xpAmount,
            totalXp: newXp,
            levelInfo: levelInfo,
            levelUp: levelUp
        };
    }

    /**
     * Nettoie les anciens messages pour éviter la fuite mémoire
     */
    cleanupOldMessages() {
        const now = Date.now();
        const maxAge = 60000; // 1 minute
        
        for (const [userId, messages] of this.recentMessages.entries()) {
            const recentMessages = messages.filter(msg => now - msg.timestamp < maxAge);
            
            if (recentMessages.length === 0) {
                this.recentMessages.delete(userId);
            } else {
                this.recentMessages.set(userId, recentMessages);
            }
        }
    }

    /**
     * Obtient les statistiques d'un utilisateur
     */
    async getUserStats(guildId, userId) {
        const data = await xpDataManager.getMessageXpData();
        const userKey = `${guildId}_${userId}`;
        const userData = data.users[userKey];
        
        if (!userData) {
            return {
                totalXp: 0,
                messageCount: 0,
                levelInfo: await XPCalculator.getUserLevelInfo(0),
                lastMessageDate: null
            };
        }
        
        return {
            totalXp: userData.totalXp,
            messageCount: userData.messageCount,
            levelInfo: await XPCalculator.getUserLevelInfo(userData.totalXp),
            lastMessageDate: userData.lastMessageDate
        };
    }

    /**
     * Obtient le classement des utilisateurs
     */
    async getLeaderboard(guildId, limit = 10) {
        const data = await xpDataManager.getMessageXpData();
        const guildUsers = [];
        
        for (const [userKey, userData] of Object.entries(data.users)) {
            if (userKey.startsWith(`${guildId}_`)) {
                const userId = userKey.split('_')[1];
                guildUsers.push({
                    userId: userId,
                    totalXp: userData.totalXp,
                    messageCount: userData.messageCount,
                    levelInfo: await XPCalculator.getUserLevelInfo(userData.totalXp)
                });
            }
        }
        
        // Trier par XP total décroissant
        guildUsers.sort((a, b) => b.totalXp - a.totalXp);
        
        return guildUsers.slice(0, limit);
    }

    /**
     * Remet à zéro l'XP d'un utilisateur
     */
    async resetUserXP(guildId, userId) {
        const data = await xpDataManager.getMessageXpData();
        const userKey = `${guildId}_${userId}`;
        
        if (data.users[userKey]) {
            delete data.users[userKey];
            await xpDataManager.saveMessageXpData(data);
            return true;
        }
        
        return false;
    }

    /**
     * Nettoie les ressources
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }
}

// Instance singleton
const messageXPHandler = new MessageXPHandler();

export default messageXPHandler;