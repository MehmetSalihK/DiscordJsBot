import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin vers le fichier de configuration
const CONFIG_PATH = path.join(__dirname, '../../data/reactionroles-advanced.json');

/**
 * Structure de données pour le système ReactionRole avancé (conforme au prompt)
 * {
 *   guildId: {
 *     enabled: boolean,
 *     logsChannel: string|null,
 *     logsEnabled: boolean,
 *     messages: {
 *       messageId: {
 *         channelId: string,
 *         messageId: string,
 *         authorId: string,
 *         title: string,
 *         description: string,
 *         type: "reaction" | "select" | "button",
 *         exclusive: boolean,
 *         removeOnUnreact: boolean,
 *         enabled: boolean,
 *         entries: [
 *           {
 *             emoji: string,
 *             roleId: string,
 *             enabled: boolean
 *           }
 *         ],
 *         createdAt: number
 *       }
 *     }
 *   }
 * }
 */

class ReactionRoleStore {
    constructor() {
        this.data = {};
        this.initialized = false;
    }

    /**
     * Initialise le store en chargeant les données depuis le fichier
     */
    async init() {
        try {
            const fileData = await fs.readFile(CONFIG_PATH, 'utf8');
            this.data = JSON.parse(fileData);
            
            // Migration vers la nouvelle structure si nécessaire
            await this.migrateToNewStructure();
        } catch (error) {
            // Fichier n'existe pas encore, on commence avec un objet vide
            this.data = {};
        }
        this.initialized = true;
    }

    /**
     * Migre l'ancienne structure vers la nouvelle structure conforme au prompt
     */
    async migrateToNewStructure() {
        let needsSave = false;
        
        for (const guildId in this.data) {
            const guild = this.data[guildId];
            if (guild.messages) {
                for (const messageId in guild.messages) {
                    const message = guild.messages[messageId];
                    
                    // Vérifier si c'est l'ancienne structure (avec reactions au lieu d'entries)
                    if (message.reactions && !message.entries) {
                        // Convertir vers la nouvelle structure
                        const entries = [];
                        for (const emoji in message.reactions) {
                            const reaction = message.reactions[emoji];
                            entries.push({
                                emoji: emoji,
                                roleId: reaction.roleId,
                                enabled: reaction.enabled !== false
                            });
                        }
                        
                        // Mettre à jour avec la nouvelle structure
                        guild.messages[messageId] = {
                            channelId: message.channelId,
                            messageId: messageId,
                            authorId: message.authorId || 'unknown',
                            title: message.title || 'ReactionRole',
                            description: message.description || 'Réagis pour obtenir un rôle',
                            type: 'reaction', // Par défaut, ancien système = reaction
                            exclusive: false, // Par défaut non exclusif
                            removeOnUnreact: true, // Par défaut comme avant
                            enabled: message.enabled !== false,
                            entries: entries,
                            createdAt: message.createdAt || Date.now()
                        };
                        
                        needsSave = true;
                    }
                }
            }
        }
        
        if (needsSave) {
            await this.save();
            console.log('[MIGRATION] Structure ReactionRole migrée vers la nouvelle version');
        }
    }

    /**
     * Sauvegarde les données dans le fichier
     */
    async save() {
        try {
            await fs.writeFile(CONFIG_PATH, JSON.stringify(this.data, null, 2));
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du ReactionRole store:', error);
            throw error;
        }
    }

    /**
     * Assure que le store est initialisé
     */
    async ensureInit() {
        if (!this.initialized) {
            await this.init();
        }
    }

    /**
     * Obtient la configuration d'une guilde
     */
    async getGuildConfig(guildId) {
        await this.ensureInit();
        return this.data[guildId] || {
            enabled: true,
            logsChannel: null,
            logsEnabled: false,
            messages: {}
        };
    }

    /**
     * Met à jour la configuration d'une guilde
     */
    async setGuildConfig(guildId, config) {
        await this.ensureInit();
        this.data[guildId] = config;
        await this.save();
    }

    /**
     * Active/désactive le système pour une guilde
     */
    async toggleGuildEnabled(guildId) {
        const config = await this.getGuildConfig(guildId);
        config.enabled = !config.enabled;
        await this.setGuildConfig(guildId, config);
        return config.enabled;
    }

    /**
     * Configure le canal de logs
     */
    async setLogsChannel(guildId, channelId) {
        const config = await this.getGuildConfig(guildId);
        config.logsChannel = channelId;
        config.logsEnabled = channelId !== null;
        await this.setGuildConfig(guildId, config);
    }

    /**
     * Active/désactive les logs
     */
    async toggleLogs(guildId) {
        const config = await this.getGuildConfig(guildId);
        config.logsEnabled = !config.logsEnabled;
        await this.setGuildConfig(guildId, config);
        return config.logsEnabled;
    }

    /**
     * Ajoute une réaction role (nouvelle structure)
     */
    async addReactionRole(guildId, messageId, channelId, emoji, roleId, authorId = 'unknown', title = 'ReactionRole', description = 'Réagis pour obtenir un rôle', type = 'reaction') {
        const config = await this.getGuildConfig(guildId);
        
        if (!config.messages[messageId]) {
            config.messages[messageId] = {
                channelId: channelId,
                messageId: messageId,
                authorId: authorId,
                title: title,
                description: description,
                type: type,
                exclusive: false,
                removeOnUnreact: true,
                enabled: true,
                entries: [],
                createdAt: Date.now()
            };
        }

        // Vérifier si l'emoji existe déjà
        const existingIndex = config.messages[messageId].entries.findIndex(entry => entry.emoji === emoji);
        if (existingIndex !== -1) {
            // Mettre à jour l'entrée existante
            config.messages[messageId].entries[existingIndex] = {
                emoji: emoji,
                roleId: roleId,
                enabled: true
            };
        } else {
            // Ajouter nouvelle entrée
            config.messages[messageId].entries.push({
                emoji: emoji,
                roleId: roleId,
                enabled: true
            });
        }

        await this.setGuildConfig(guildId, config);
    }

    /**
     * Supprime une réaction role (nouvelle structure)
     */
    async removeReactionRole(guildId, messageId, emoji) {
        const config = await this.getGuildConfig(guildId);
        
        if (config.messages[messageId] && config.messages[messageId].entries) {
            const entryIndex = config.messages[messageId].entries.findIndex(entry => entry.emoji === emoji);
            if (entryIndex !== -1) {
                config.messages[messageId].entries.splice(entryIndex, 1);
                
                // Si plus d'entrées, supprimer le message
                if (config.messages[messageId].entries.length === 0) {
                    delete config.messages[messageId];
                }
                
                await this.setGuildConfig(guildId, config);
                return true;
            }
        }
        return false;
    }

    /**
     * Active/désactive un message spécifique
     */
    async toggleMessage(guildId, messageId) {
        const config = await this.getGuildConfig(guildId);
        
        if (config.messages[messageId]) {
            config.messages[messageId].enabled = !config.messages[messageId].enabled;
            await this.setGuildConfig(guildId, config);
            return config.messages[messageId].enabled;
        }
        return false;
    }

    /**
     * Active/désactive une réaction spécifique (nouvelle structure)
     */
    async toggleReaction(guildId, messageId, emoji) {
        const config = await this.getGuildConfig(guildId);
        
        if (config.messages[messageId] && config.messages[messageId].entries) {
            const entryIndex = config.messages[messageId].entries.findIndex(entry => entry.emoji === emoji);
            if (entryIndex !== -1) {
                config.messages[messageId].entries[entryIndex].enabled = !config.messages[messageId].entries[entryIndex].enabled;
                await this.setGuildConfig(guildId, config);
                return config.messages[messageId].entries[entryIndex].enabled;
            }
        }
        return false;
    }

    /**
     * Obtient toutes les réactions roles d'une guilde (nouvelle structure)
     */
    async getAllReactionRoles(guildId) {
        const config = await this.getGuildConfig(guildId);
        const result = [];

        for (const [messageId, messageData] of Object.entries(config.messages)) {
            if (messageData.entries) {
                for (const entry of messageData.entries) {
                    result.push({
                        messageId,
                        channelId: messageData.channelId,
                        emoji: entry.emoji,
                        roleId: entry.roleId,
                        messageEnabled: messageData.enabled,
                        reactionEnabled: entry.enabled,
                        globalEnabled: config.enabled,
                        type: messageData.type || 'reaction',
                        exclusive: messageData.exclusive || false,
                        removeOnUnreact: messageData.removeOnUnreact !== false,
                        title: messageData.title || 'ReactionRole',
                        description: messageData.description || 'Réagis pour obtenir un rôle'
                    });
                }
            }
        }

        return result;
    }

    /**
     * Vérifie si une réaction role est active (nouvelle structure)
     */
    async isReactionRoleActive(guildId, messageId, emoji) {
        const config = await this.getGuildConfig(guildId);
        
        if (!config.enabled) return false;
        if (!config.messages[messageId] || !config.messages[messageId].enabled) return false;
        
        if (config.messages[messageId].entries) {
            const entry = config.messages[messageId].entries.find(e => e.emoji === emoji);
            if (!entry || !entry.enabled) return false;
        } else {
            return false;
        }
        
        return true;
    }

    /**
     * Obtient le rôle ID pour une réaction (nouvelle structure)
     */
    async getRoleForReaction(guildId, messageId, emoji) {
        const config = await this.getGuildConfig(guildId);
        
        if (await this.isReactionRoleActive(guildId, messageId, emoji)) {
            const messageData = config.messages[messageId];
            if (messageData.entries) {
                const entry = messageData.entries.find(e => e.emoji === emoji);
                return entry ? entry.roleId : null;
            }
        }
        
        return null;
    }

    /**
     * Remet à zéro toute la configuration d'une guilde
     */
    async resetGuildConfig(guildId) {
        await this.ensureInit();
        delete this.data[guildId];
        await this.save();
    }

    /**
     * Configure le canal de logs
     */
    async setLogsChannel(guildId, channelId) {
        const config = await this.getGuildConfig(guildId);
        config.logsChannel = channelId;
        config.logsEnabled = !!channelId; // Active automatiquement si un canal est défini
        await this.setGuildConfig(guildId, config);
    }

    /**
     * Obtient le canal de logs configuré
     */
    async getLogsChannel(guildId) {
        const config = await this.getGuildConfig(guildId);
        return config.logsChannel;
    }

    /**
     * Vérifie si les logs sont activés
     */
    async areLogsEnabled(guildId) {
        const config = await this.getGuildConfig(guildId);
        return config.logsEnabled && config.logsChannel;
    }

    /**
     * Active/désactive les logs
     */
    async toggleLogs(guildId) {
        const config = await this.getGuildConfig(guildId);
        config.logsEnabled = !config.logsEnabled;
        await this.setGuildConfig(guildId, config);
        return config.logsEnabled;
    }

    /**
     * Met à jour une réaction role spécifique
     */
    async updateReactionRole(guildId, messageId, emoji, updates) {
        const config = await this.getGuildConfig(guildId);
        
        if (config.messages[messageId] && config.messages[messageId].reactions[emoji]) {
            // Mettre à jour les propriétés spécifiées
            Object.assign(config.messages[messageId].reactions[emoji], updates);
            
            // Si on met à jour les statuts enabled, s'assurer de la cohérence
            if (updates.hasOwnProperty('messageEnabled')) {
                config.messages[messageId].enabled = updates.messageEnabled;
            }
            if (updates.hasOwnProperty('reactionEnabled')) {
                config.messages[messageId].reactions[emoji].enabled = updates.reactionEnabled;
            }
            
            await this.setGuildConfig(guildId, config);
            return true;
        }
        return false;
    }

    /**
     * Obtient une réaction role spécifique (nouvelle structure)
     */
    async getReactionRole(guildId, messageId, emoji) {
        const config = await this.getGuildConfig(guildId);
        
        if (config.messages[messageId] && config.messages[messageId].entries) {
            const messageData = config.messages[messageId];
            const entry = messageData.entries.find(e => e.emoji === emoji);
            
            if (entry) {
                return {
                    guildId,
                    messageId,
                    channelId: messageData.channelId,
                    emoji,
                    roleId: entry.roleId,
                    globalEnabled: config.enabled,
                    messageEnabled: messageData.enabled,
                    reactionEnabled: entry.enabled,
                    type: messageData.type || 'reaction',
                    exclusive: messageData.exclusive || false,
                    removeOnUnreact: messageData.removeOnUnreact !== false,
                    title: messageData.title || 'ReactionRole',
                    description: messageData.description || 'Réagis pour obtenir un rôle'
                };
            }
        }
        return null;
    }

    /**
     * Obtient les statistiques d'une guilde (nouvelle structure)
     */
    async getGuildStats(guildId) {
        const config = await this.getGuildConfig(guildId);
        
        let totalMessages = 0;
        let totalReactions = 0;
        let activeMessages = 0;
        let activeReactions = 0;

        for (const [messageId, messageData] of Object.entries(config.messages)) {
            totalMessages++;
            if (messageData.enabled) activeMessages++;
            
            if (messageData.entries) {
                for (const entry of messageData.entries) {
                    totalReactions++;
                    if (entry.enabled && messageData.enabled) activeReactions++;
                }
            }
        }

        return {
            enabled: config.enabled,
            logsEnabled: config.logsEnabled,
            logsChannel: config.logsChannel,
            totalMessages,
            totalReactions,
            activeMessages,
            activeReactions
        };
    }

    /**
     * Configure le mode exclusif pour un message
     */
    async setExclusiveMode(guildId, messageId, exclusive) {
        const config = await this.getGuildConfig(guildId);
        
        if (config.messages[messageId]) {
            config.messages[messageId].exclusive = exclusive;
            await this.setGuildConfig(guildId, config);
            return true;
        }
        return false;
    }

    /**
     * Configure removeOnUnreact pour un message
     */
    async setRemoveOnUnreact(guildId, messageId, removeOnUnreact) {
        const config = await this.getGuildConfig(guildId);
        
        if (config.messages[messageId]) {
            config.messages[messageId].removeOnUnreact = removeOnUnreact;
            await this.setGuildConfig(guildId, config);
            return true;
        }
        return false;
    }

    /**
     * Exporte la configuration d'une guilde
     */
    async exportGuildConfig(guildId) {
        const config = await this.getGuildConfig(guildId);
        return {
            version: "2.0",
            exportedAt: Date.now(),
            guildId: guildId,
            config: config
        };
    }

    /**
     * Importe une configuration pour une guilde
     */
    async importGuildConfig(guildId, importData, overwrite = false) {
        if (!importData.config || !importData.version) {
            throw new Error("Format d'import invalide");
        }

        const currentConfig = await this.getGuildConfig(guildId);
        
        if (overwrite) {
            // Remplacer complètement
            await this.setGuildConfig(guildId, importData.config);
        } else {
            // Fusionner avec la configuration existante
            const mergedConfig = {
                ...currentConfig,
                ...importData.config,
                messages: {
                    ...currentConfig.messages,
                    ...importData.config.messages
                }
            };
            await this.setGuildConfig(guildId, mergedConfig);
        }
        
        return true;
    }

    /**
     * Répare automatiquement les configurations au démarrage
     */
    async autoRepair(client) {
        await this.ensureInit();
        const repairLog = [];
        
        for (const guildId in this.data) {
            const guild = client.guilds.cache.get(guildId);
            if (!guild) {
                repairLog.push(`Guilde ${guildId} introuvable, configuration conservée`);
                continue;
            }

            const config = this.data[guildId];
            if (!config.messages) continue;

            for (const messageId in config.messages) {
                const messageData = config.messages[messageId];
                const channel = guild.channels.cache.get(messageData.channelId);
                
                if (!channel) {
                    repairLog.push(`Canal ${messageData.channelId} introuvable pour le message ${messageId}`);
                    continue;
                }

                try {
                    const message = await channel.messages.fetch(messageId);
                    
                    // Vérifier les rôles
                    if (messageData.entries) {
                        for (const entry of messageData.entries) {
                            const role = guild.roles.cache.get(entry.roleId);
                            if (!role) {
                                repairLog.push(`Rôle ${entry.roleId} introuvable pour ${entry.emoji} dans ${messageId}`);
                                entry.enabled = false; // Désactiver l'entrée avec rôle manquant
                            }
                        }
                    }
                } catch (error) {
                    repairLog.push(`Message ${messageId} introuvable dans ${channel.name}`);
                    // Désactiver le message si introuvable
                    messageData.enabled = false;
                }
            }
        }

        if (repairLog.length > 0) {
            await this.save();
            console.log('[AUTO-REPAIR] Réparations effectuées:', repairLog);
        }

        return repairLog;
    }

    /**
     * Obtient tous les rôles d'un utilisateur pour un message exclusif
     */
    async getUserRolesForMessage(guildId, messageId, userId, guild) {
        const config = await this.getGuildConfig(guildId);
        const messageData = config.messages[messageId];
        
        if (!messageData || !messageData.entries) return [];
        
        const member = guild.members.cache.get(userId);
        if (!member) return [];
        
        const userRoles = [];
        for (const entry of messageData.entries) {
            if (member.roles.cache.has(entry.roleId)) {
                userRoles.push(entry.roleId);
            }
        }
        
        return userRoles;
    }

    /**
     * Nettoie les configurations obsolètes
     */
    async cleanup() {
        await this.ensureInit();
        let cleaned = false;
        
        for (const guildId in this.data) {
            const config = this.data[guildId];
            if (config.messages) {
                for (const messageId in config.messages) {
                    const messageData = config.messages[messageId];
                    
                    // Supprimer les messages sans entrées
                    if (!messageData.entries || messageData.entries.length === 0) {
                        delete config.messages[messageId];
                        cleaned = true;
                    }
                }
            }
        }
        
        if (cleaned) {
            await this.save();
        }
        
        return cleaned;
    }
}

// Instance singleton
const reactionRoleStore = new ReactionRoleStore();

export default reactionRoleStore;