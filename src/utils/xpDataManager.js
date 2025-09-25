import fs from 'fs/promises';
import path from 'path';

class XPDataManager {
    constructor() {
        this.writeQueue = new Map();
        this.debounceTimers = new Map();
        this.debounceDelay = 1000; // 1 seconde
        this.jsonDir = path.join(process.cwd(), 'json');
        
        // Cache des données
        this.cache = {
            levelConfig: null,
            messageXp: null,
            voiceSessions: null
        };
    }

    /**
     * Charge un fichier JSON avec gestion d'erreur
     */
    async loadJSON(filename) {
        try {
            const filePath = path.join(this.jsonDir, filename);
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`[XP-SYSTEM] ❌ Erreur lors du chargement de ${filename}:`, error.message);
            return this.getDefaultData(filename);
        }
    }

    /**
     * Sauvegarde un fichier JSON avec debounce
     */
    async saveJSON(filename, data) {
        return new Promise((resolve, reject) => {
            // Ajouter à la queue
            this.writeQueue.set(filename, { data, resolve, reject });

            // Annuler le timer précédent s'il existe
            if (this.debounceTimers.has(filename)) {
                clearTimeout(this.debounceTimers.get(filename));
            }

            // Créer un nouveau timer
            const timer = setTimeout(async () => {
                await this.flushFile(filename);
            }, this.debounceDelay);

            this.debounceTimers.set(filename, timer);
        });
    }

    /**
     * Écrit effectivement le fichier
     */
    async flushFile(filename) {
        const queueItem = this.writeQueue.get(filename);
        if (!queueItem) return;

        try {
            const filePath = path.join(this.jsonDir, filename);
            const dataWithTimestamp = {
                ...queueItem.data,
                lastUpdated: new Date().toISOString()
            };
            
            await fs.writeFile(filePath, JSON.stringify(dataWithTimestamp, null, 2), 'utf8');
            
            // Mettre à jour le cache
            const cacheKey = filename.replace('.json', '');
            if (this.cache.hasOwnProperty(cacheKey)) {
                this.cache[cacheKey] = dataWithTimestamp;
            }

            console.log(`[XP-SYSTEM] ✅ ${filename} sauvegardé avec succès`);
            queueItem.resolve();
        } catch (error) {
            console.error(`[XP-SYSTEM] ❌ Erreur lors de la sauvegarde de ${filename}:`, error.message);
            queueItem.reject(error);
        } finally {
            this.writeQueue.delete(filename);
            this.debounceTimers.delete(filename);
        }
    }

    /**
     * Force la sauvegarde de tous les fichiers en attente
     */
    async flushAll() {
        const promises = [];
        for (const filename of this.writeQueue.keys()) {
            promises.push(this.flushFile(filename));
        }
        await Promise.all(promises);
    }

    /**
     * Retourne les données par défaut pour un fichier
     */
    getDefaultData(filename) {
        switch (filename) {
            case 'levelConfig.json':
                return {
                    enabled: true,
                    messageXp: {
                        xpPerMessage: 10,
                        cooldownSeconds: 30,
                        minMessageLength: 3,
                        ignoreLinks: false,
                        ignoreEmbeds: false,
                        ignoreEmojisOnly: true,
                        ignoreCommands: true
                    },
                    voiceXp: {
                        voiceChunkXP: 50,
                        voiceChunkSeconds: 600,
                        ignoreAfkChannel: true,
                        ignoreSelfMuted: false,
                        ignoreSelfDeafened: false
                    },
                    levelThresholds: {
                        mode: "arithmetic",
                        levelBase: 500,
                        levelStep: 500,
                        customThresholds: []
                    },
                    excludedChannels: [],
                    excludedRoles: [],
                    roleRewards: {},
                    levelUpChannel: null,
                    levelUpMessage: "🎉 **Félicitations !** {user} a atteint le niveau **{level}** !",
                    lastUpdated: null
                };

            case 'messageXp.json':
                return {
                    users: {},
                    cooldowns: {},
                    lastUpdated: null
                };

            case 'voiceSessions.json':
                return {
                    activeSessions: {},
                    users: {},
                    lastUpdated: null
                };

            default:
                return {};
        }
    }

    /**
     * Charge la configuration avec cache
     */
    async getLevelConfig() {
        if (!this.cache.levelConfig) {
            this.cache.levelConfig = await this.loadJSON('levelConfig.json');
        }
        return this.cache.levelConfig;
    }

    /**
     * Sauvegarde la configuration
     */
    async saveLevelConfig(config) {
        this.cache.levelConfig = config;
        return this.saveJSON('levelConfig.json', config);
    }

    /**
     * Charge les données XP des messages
     */
    async getMessageXpData() {
        if (!this.cache.messageXp) {
            this.cache.messageXp = await this.loadJSON('messageXp.json');
        }
        return this.cache.messageXp;
    }

    /**
     * Sauvegarde les données XP des messages
     */
    async saveMessageXpData(data) {
        this.cache.messageXp = data;
        return this.saveJSON('messageXp.json', data);
    }

    /**
     * Charge les données des sessions vocales
     */
    async getVoiceSessionsData() {
        if (!this.cache.voiceSessions) {
            this.cache.voiceSessions = await this.loadJSON('voiceSessions.json');
        }
        return this.cache.voiceSessions;
    }

    /**
     * Sauvegarde les données des sessions vocales
     */
    async saveVoiceSessionsData(data) {
        this.cache.voiceSessions = data;
        return this.saveJSON('voiceSessions.json', data);
    }

    /**
     * Invalide le cache pour forcer un rechargement
     */
    invalidateCache(type = null) {
        if (type) {
            this.cache[type] = null;
        } else {
            this.cache.levelConfig = null;
            this.cache.messageXp = null;
            this.cache.voiceSessions = null;
        }
    }
}

// Instance singleton
const xpDataManager = new XPDataManager();

export default xpDataManager;