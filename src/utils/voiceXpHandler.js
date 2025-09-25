import xpDataManager from './xpDataManager.js';
import XPCalculator from './xpCalculator.js';

class VoiceXPHandler {
    constructor() {
        this.activeTimers = new Map(); // Timers pour les chunks
        this.sessionStartTimes = new Map(); // Temps de début des sessions
    }

    /**
     * Gère l'entrée d'un utilisateur dans un canal vocal
     */
    async handleVoiceJoin(member, channel) {
        try {
            const config = await xpDataManager.getLevelConfig();
            if (!config.enabled) return;

            const userId = member.id;
            const guildId = member.guild.id;
            const channelId = channel.id;
            const sessionKey = `${guildId}_${userId}`;

            // Vérifier les exclusions
            if (this.isExcluded(member, channel, config)) {
                return;
            }

            // Enregistrer le début de session
            const sessionData = {
                userId: userId,
                guildId: guildId,
                channelId: channelId,
                startTime: Date.now(),
                chunksEarned: 0
            };

            await this.saveActiveSession(sessionKey, sessionData);
            this.sessionStartTimes.set(sessionKey, Date.now());

            // Démarrer le timer pour le premier chunk
            this.startChunkTimer(sessionKey, config.voiceXp.voiceChunkSeconds);

            console.log(`[XP-SYSTEM] 🎤 ${member.displayName} a rejoint ${channel.name} - Session XP démarrée`);

        } catch (error) {
            console.error('[XP-SYSTEM] ❌ Erreur lors de l\'entrée vocale:', error);
        }
    }

    /**
     * Gère la sortie d'un utilisateur d'un canal vocal
     */
    async handleVoiceLeave(member, channel) {
        try {
            const userId = member?.id;
            const guildId = member?.guild?.id;
            const sessionKey = `${guildId}_${userId}`;

            // Arrêter le timer s'il existe
            if (this.activeTimers.has(sessionKey)) {
                clearTimeout(this.activeTimers.get(sessionKey));
                this.activeTimers.delete(sessionKey);
            }

            // Récupérer et supprimer la session active
            const sessionData = await this.getActiveSession(sessionKey);
            if (sessionData) {
                await this.removeActiveSession(sessionKey);
                
                const sessionDuration = Date.now() - sessionData.startTime;
                const minutes = Math.floor(sessionDuration / 60000);
                
                console.log(`[XP-SYSTEM] 🎤 ${member.displayName} a quitté ${channel?.name || 'canal vocal'} - Durée: ${minutes}min, Chunks gagnés: ${sessionData.chunksEarned}`);
            }

            this.sessionStartTimes.delete(sessionKey);

        } catch (error) {
            console.error('[XP-SYSTEM] ❌ Erreur lors de la sortie vocale:', error);
        }
    }

    /**
     * Gère le changement de canal vocal
     */
    async handleVoiceMove(member, oldChannel, newChannel) {
        // Traiter comme une sortie puis une entrée
        if (oldChannel) {
            await this.handleVoiceLeave(member, oldChannel);
        }
        if (newChannel) {
            await this.handleVoiceJoin(member, newChannel);
        }
    }

    /**
     * Gère les changements d'état vocal (mute/deaf)
     */
    async handleVoiceStateChange(oldState, newState) {
        try {
            const config = await xpDataManager.getLevelConfig();
            if (!config.enabled) return;

            const member = newState.member;
            const userId = member.id;
            const guildId = member.guild.id;
            const sessionKey = `${guildId}_${userId}`;

            // Vérifier si l'utilisateur est dans un canal vocal
            if (!newState.channel) return;

            const shouldPause = this.shouldPauseSession(newState, config);
            const wasActive = this.activeTimers.has(sessionKey);

            if (shouldPause && wasActive) {
                // Mettre en pause la session
                clearTimeout(this.activeTimers.get(sessionKey));
                this.activeTimers.delete(sessionKey);
                console.log(`[XP-SYSTEM] ⏸️ Session XP mise en pause pour ${member.displayName} (mute/deaf)`);
            } else if (!shouldPause && !wasActive) {
                // Reprendre la session
                const sessionData = await this.getActiveSession(sessionKey);
                if (sessionData) {
                    this.startChunkTimer(sessionKey, config.voiceXp.voiceChunkSeconds);
                    console.log(`[XP-SYSTEM] ▶️ Session XP reprise pour ${member.displayName}`);
                }
            }

        } catch (error) {
            console.error('[XP-SYSTEM] ❌ Erreur lors du changement d\'état vocal:', error);
        }
    }

    /**
     * Vérifie si la session doit être mise en pause
     */
    shouldPauseSession(voiceState, config) {
        const voiceConfig = config.voiceXp;
        
        if (voiceConfig.ignoreSelfMuted && voiceState.selfMute) {
            return true;
        }
        
        if (voiceConfig.ignoreSelfDeafened && voiceState.selfDeaf) {
            return true;
        }
        
        return false;
    }

    /**
     * Vérifie si l'utilisateur/canal est exclu
     */
    isExcluded(member, channel, config) {
        // Vérifier le canal AFK
        if (config.voiceXp.ignoreAfkChannel && channel.id === member.guild.afkChannelId) {
            return true;
        }

        // Vérifier les canaux exclus
        if (config.excludedChannels.includes(channel.id)) {
            return true;
        }

        // Vérifier les rôles exclus
        const memberRoles = member.roles.cache.map(role => role.id);
        if (config.excludedRoles.some(roleId => memberRoles.includes(roleId))) {
            return true;
        }

        return false;
    }

    /**
     * Démarre un timer pour un chunk d'XP
     */
    startChunkTimer(sessionKey, chunkSeconds) {
        const timer = setTimeout(async () => {
            await this.awardChunkXP(sessionKey);
        }, chunkSeconds * 1000);

        this.activeTimers.set(sessionKey, timer);
    }

    /**
     * Attribue l'XP pour un chunk complet
     */
    async awardChunkXP(sessionKey) {
        try {
            const config = await xpDataManager.getLevelConfig();
            const sessionData = await this.getActiveSession(sessionKey);
            
            if (!sessionData) {
                this.activeTimers.delete(sessionKey);
                return;
            }

            const xpAmount = config.voiceXp.voiceChunkXP;
            const xpResult = await this.awardVoiceXP(sessionKey, xpAmount);
            
            // Incrémenter le compteur de chunks
            sessionData.chunksEarned += 1;
            await this.saveActiveSession(sessionKey, sessionData);

            // Programmer le prochain chunk
            this.startChunkTimer(sessionKey, config.voiceXp.voiceChunkSeconds);

            console.log(`[XP-SYSTEM] 🎤 Chunk XP attribué: ${xpAmount} XP à ${sessionKey} (Total: ${xpResult.totalXp})`);

            // Retourner les informations pour le level up
            return xpResult;

        } catch (error) {
            console.error('[XP-SYSTEM] ❌ Erreur lors de l\'attribution du chunk XP:', error);
            this.activeTimers.delete(sessionKey);
        }
    }

    /**
     * Attribue de l'XP vocal à un utilisateur
     */
    async awardVoiceXP(sessionKey, xpAmount) {
        const data = await xpDataManager.getVoiceSessionsData();
        
        if (!data.users[sessionKey]) {
            data.users[sessionKey] = {
                totalXp: 0,
                totalMinutes: 0,
                chunksEarned: 0,
                lastVoiceDate: null
            };
        }
        
        const userData = data.users[sessionKey];
        const oldXp = userData.totalXp;
        const newXp = oldXp + xpAmount;
        
        userData.totalXp = newXp;
        userData.chunksEarned += 1;
        userData.lastVoiceDate = new Date().toISOString();
        
        // Calculer les minutes totales (approximation basée sur les chunks)
        const config = await xpDataManager.getLevelConfig();
        userData.totalMinutes = userData.chunksEarned * (config.voiceXp.voiceChunkSeconds / 60);
        
        // Vérifier le level up
        const levelUp = await XPCalculator.checkLevelUp(oldXp, newXp);
        const levelInfo = await XPCalculator.getUserLevelInfo(newXp);
        
        await xpDataManager.saveVoiceSessionsData(data);
        
        return {
            xpGained: xpAmount,
            totalXp: newXp,
            levelInfo: levelInfo,
            levelUp: levelUp
        };
    }

    /**
     * Sauvegarde une session active
     */
    async saveActiveSession(sessionKey, sessionData) {
        const data = await xpDataManager.getVoiceSessionsData();
        data.activeSessions[sessionKey] = sessionData;
        await xpDataManager.saveVoiceSessionsData(data);
    }

    /**
     * Récupère une session active
     */
    async getActiveSession(sessionKey) {
        const data = await xpDataManager.getVoiceSessionsData();
        return data.activeSessions[sessionKey] || null;
    }

    /**
     * Supprime une session active
     */
    async removeActiveSession(sessionKey) {
        const data = await xpDataManager.getVoiceSessionsData();
        delete data.activeSessions[sessionKey];
        await xpDataManager.saveVoiceSessionsData(data);
    }

    /**
     * Obtient les statistiques vocales d'un utilisateur
     */
    async getUserVoiceStats(guildId, userId) {
        const data = await xpDataManager.getVoiceSessionsData();
        const userKey = `${guildId}_${userId}`;
        const userData = data.users[userKey];
        
        if (!userData) {
            return {
                totalXp: 0,
                totalMinutes: 0,
                chunksEarned: 0,
                levelInfo: await XPCalculator.getUserLevelInfo(0),
                lastVoiceDate: null,
                isActive: false
            };
        }
        
        const isActive = data.activeSessions[userKey] !== undefined;
        
        return {
            totalXp: userData.totalXp || 0,
            totalMinutes: userData.totalMinutes || 0,
            chunksEarned: userData.chunksEarned || 0,
            levelInfo: await XPCalculator.getUserLevelInfo(userData.totalXp || 0),
            lastVoiceDate: userData.lastVoiceDate,
            isActive: isActive
        };
    }

    /**
     * Obtient le classement vocal
     */
    async getVoiceLeaderboard(guildId, limit = 10) {
        const data = await xpDataManager.getVoiceSessionsData();
        const guildUsers = [];
        
        for (const [userKey, userData] of Object.entries(data.users)) {
            if (userKey.startsWith(`${guildId}_`)) {
                const userId = userKey.split('_')[1];
                guildUsers.push({
                    userId: userId,
                    totalXp: userData.totalXp,
                    totalMinutes: userData.totalMinutes,
                    chunksEarned: userData.chunksEarned,
                    levelInfo: await XPCalculator.getUserLevelInfo(userData.totalXp)
                });
            }
        }
        
        // Trier par XP total décroissant
        guildUsers.sort((a, b) => b.totalXp - a.totalXp);
        
        return guildUsers.slice(0, limit);
    }

    /**
     * Remet à zéro l'XP vocal d'un utilisateur
     */
    async resetUserVoiceXP(guildId, userId) {
        const data = await xpDataManager.getVoiceSessionsData();
        const userKey = `${guildId}_${userId}`;
        
        // Arrêter la session active si elle existe
        if (this.activeTimers.has(userKey)) {
            clearTimeout(this.activeTimers.get(userKey));
            this.activeTimers.delete(userKey);
        }
        
        if (data.users[userKey]) {
            delete data.users[userKey];
        }
        
        if (data.activeSessions[userKey]) {
            delete data.activeSessions[userKey];
        }
        
        this.sessionStartTimes.delete(userKey);
        
        await xpDataManager.saveVoiceSessionsData(data);
        return true;
    }

    /**
     * Nettoie les sessions orphelines au démarrage
     */
    async cleanupOrphanedSessions(guild) {
        try {
            const data = await xpDataManager.getVoiceSessionsData();
            const guildId = guild.id;
            let cleaned = 0;

            for (const [sessionKey, sessionData] of Object.entries(data.activeSessions)) {
                if (sessionData.guildId === guildId) {
                    const member = guild.members.cache.get(sessionData.userId);
                    const channel = guild.channels.cache.get(sessionData.channelId);
                    
                    // Vérifier si l'utilisateur est toujours dans le canal
                    if (!member || !channel || !member.voice.channel || member.voice.channel.id !== sessionData.channelId) {
                        delete data.activeSessions[sessionKey];
                        this.activeTimers.delete(sessionKey);
                        this.sessionStartTimes.delete(sessionKey);
                        cleaned++;
                    }
                }
            }

            if (cleaned > 0) {
                await xpDataManager.saveVoiceSessionsData(data);
                console.log(`[XP-SYSTEM] 🧹 ${cleaned} sessions vocales orphelines nettoyées`);
            }

        } catch (error) {
            console.error('[XP-SYSTEM] ❌ Erreur lors du nettoyage des sessions:', error);
        }
    }

    /**
     * Nettoie les ressources
     */
    destroy() {
        // Arrêter tous les timers actifs
        for (const timer of this.activeTimers.values()) {
            clearTimeout(timer);
        }
        this.activeTimers.clear();
        this.sessionStartTimes.clear();
    }
}

// Instance singleton
const voiceXPHandler = new VoiceXPHandler();

export default voiceXPHandler;