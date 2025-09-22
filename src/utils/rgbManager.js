import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RGBManager {
    constructor() {
        this.activeIntervals = new Map(); // Map<roleId, intervalId>
        this.configPath = path.join(__dirname, '../../json/rgbConfig.json');
        this.client = null;
    }

    setClient(client) {
        this.client = client;
    }

    // Obtenir les rôles RGB actifs en mémoire
    getActiveRoles() {
        return Array.from(this.activeIntervals.keys());
    }

    // Charger la configuration depuis le JSON
    async loadConfig() {
        try {
            const data = await fs.readFile(this.configPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            logger.warn('Fichier de configuration RGB non trouvé, création d\'un nouveau fichier');
            await this.saveConfig([]);
            return [];
        }
    }

    // Sauvegarder la configuration dans le JSON
    async saveConfig(config) {
        try {
            await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
            logger.debug('Configuration RGB sauvegardée');
        } catch (error) {
            logger.error('Erreur lors de la sauvegarde de la configuration RGB', error);
        }
    }

    // Générer une couleur aléatoire différente de la couleur actuelle
    generateRandomColor(currentColor = null) {
        let newColor;
        do {
            newColor = Math.floor(Math.random() * 16777215); // 0xFFFFFF
        } while (newColor === currentColor);
        return newColor;
    }

    // Démarrer le RGB pour un rôle
    async startRGB(guild, roleId, interval = 2000) {
        try {
            const role = guild.roles.cache.get(roleId);
            if (!role) {
                throw new Error('Rôle non trouvé');
            }

            // Vérifier les permissions
            if (!guild.members.me.permissions.has('ManageRoles')) {
                throw new Error('Le bot n\'a pas la permission MANAGE_ROLES');
            }

            if (guild.members.me.roles.highest.position <= role.position) {
                throw new Error('Le rôle du bot doit être au-dessus du rôle RGB');
            }

            // Arrêter l'ancien interval s'il existe
            this.stopRGB(roleId);

            // Charger la configuration
            const config = await this.loadConfig();
            
            // Ajouter ou mettre à jour le rôle dans la configuration
            const existingIndex = config.findIndex(r => r.roleId === roleId);
            const roleConfig = {
                roleId: roleId,
                status: 'active',
                currentColor: role.color,
                interval: interval
            };

            if (existingIndex !== -1) {
                config[existingIndex] = roleConfig;
            } else {
                config.push(roleConfig);
            }

            await this.saveConfig(config);

            // Démarrer l'interval
            const intervalId = setInterval(async () => {
                try {
                    const currentRole = guild.roles.cache.get(roleId);
                    if (!currentRole) {
                        this.stopRGB(roleId);
                        return;
                    }

                    const newColor = this.generateRandomColor(currentRole.color);
                    await currentRole.setColor(newColor);
                    
                    // Mettre à jour la couleur dans la configuration
                    const currentConfig = await this.loadConfig();
                    const roleIndex = currentConfig.findIndex(r => r.roleId === roleId);
                    if (roleIndex !== -1) {
                        currentConfig[roleIndex].currentColor = newColor;
                        await this.saveConfig(currentConfig);
                    }

                    logger.info(`🎨 [ACTION] Couleur changée pour ${currentRole.name}: #${newColor.toString(16).padStart(6, '0')}`);
                } catch (error) {
                    logger.error(`Erreur lors du changement de couleur pour le rôle ${roleId}`, error);
                }
            }, interval);

            this.activeIntervals.set(roleId, intervalId);
            logger.success(`✅ [SUCCÈS] RGB démarré pour le rôle ${role.name} (intervalle: ${interval}ms)`);
            
            return { success: true, message: `RGB démarré pour le rôle ${role.name}` };
        } catch (error) {
            logger.error(`❌ [ERREUR] Impossible de démarrer le RGB pour le rôle ${roleId}`, error);
            return { success: false, message: error.message };
        }
    }

    // Arrêter le RGB pour un rôle
    async stopRGB(roleId) {
        try {
            // Arrêter l'interval
            if (this.activeIntervals.has(roleId)) {
                clearInterval(this.activeIntervals.get(roleId));
                this.activeIntervals.delete(roleId);
            }

            // Supprimer de la configuration
            const config = await this.loadConfig();
            const newConfig = config.filter(r => r.roleId !== roleId);
            await this.saveConfig(newConfig);

            logger.success(`✅ [SUCCÈS] RGB arrêté pour le rôle ${roleId}`);
            return { success: true, message: 'RGB arrêté avec succès' };
        } catch (error) {
            logger.error(`❌ [ERREUR] Impossible d'arrêter le RGB pour le rôle ${roleId}`, error);
            return { success: false, message: error.message };
        }
    }

    // Mettre en pause le RGB pour un rôle
    async pauseRGB(roleId) {
        try {
            // Vérifier si le rôle est actif en mémoire
            const wasActive = this.activeIntervals.has(roleId);
            
            // Arrêter l'interval temporairement
            if (wasActive) {
                clearInterval(this.activeIntervals.get(roleId));
                this.activeIntervals.delete(roleId);
            }

            // Mettre à jour ou créer la configuration
            const config = await this.loadConfig();
            const roleIndex = config.findIndex(r => r.roleId === roleId);
            
            if (roleIndex !== -1) {
                // Rôle trouvé dans la config, mettre à jour
                config[roleIndex].status = 'paused';
            } else if (wasActive) {
                // Rôle actif en mémoire mais pas dans la config, l'ajouter
                config.push({
                    roleId: roleId,
                    status: 'paused',
                    currentColor: null,
                    interval: 2000 // valeur par défaut
                });
            } else {
                // Rôle ni actif ni dans la config
                return { success: false, message: 'Aucun rôle RGB actif trouvé avec cet ID' };
            }
            
            await this.saveConfig(config);
            logger.success(`⏸️ [SUCCÈS] RGB mis en pause pour le rôle ${roleId}`);
            return { success: true, message: 'RGB mis en pause' };
        } catch (error) {
            logger.error(`❌ [ERREUR] Impossible de mettre en pause le RGB pour le rôle ${roleId}`, error);
            return { success: false, message: error.message };
        }
    }

    // Reprendre le RGB pour un rôle
    async resumeRGB(guild, roleId) {
        try {
            const config = await this.loadConfig();
            const roleConfig = config.find(r => r.roleId === roleId);
            
            if (!roleConfig) {
                return { success: false, message: 'Rôle RGB non trouvé dans la configuration' };
            }

            if (roleConfig.status === 'active') {
                return { success: false, message: 'Le RGB est déjà actif pour ce rôle' };
            }

            // Redémarrer le RGB avec les paramètres sauvegardés
            return await this.startRGB(guild, roleId, roleConfig.interval);
        } catch (error) {
            logger.error(`❌ [ERREUR] Impossible de reprendre le RGB pour le rôle ${roleId}`, error);
            return { success: false, message: error.message };
        }
    }

    // Redémarrer tous les rôles RGB actifs (au démarrage du bot)
    async restartAllActiveRGB() {
        try {
            const config = await this.loadConfig();
            const activeRoles = config.filter(r => r.status === 'active');
            
            if (activeRoles.length === 0) {
                logger.info('ℹ️ [INFO] Aucun rôle RGB actif à redémarrer');
                return;
            }

            logger.info(`ℹ️ [INFO] Redémarrage de ${activeRoles.length} rôle(s) RGB actif(s)...`);

            for (const roleConfig of activeRoles) {
                // Trouver le serveur qui contient ce rôle
                for (const guild of this.client.guilds.cache.values()) {
                    const role = guild.roles.cache.get(roleConfig.roleId);
                    if (role) {
                        await this.startRGB(guild, roleConfig.roleId, roleConfig.interval);
                        break;
                    }
                }
            }

            logger.success(`✅ [SUCCÈS] ${activeRoles.length} rôle(s) RGB redémarré(s) avec succès`);
        } catch (error) {
            logger.error('❌ [ERREUR] Erreur lors du redémarrage des rôles RGB', error);
        }
    }

    // Redémarrer les rôles RGB actifs avec informations détaillées
    async restartActiveRoles(client) {
        try {
            this.setClient(client);
            const config = await this.loadConfig();
            const activeRoles = config.filter(r => r.status === 'active');
            const restartedRoles = [];
            
            if (activeRoles.length === 0) {
                return restartedRoles;
            }

            for (const roleConfig of activeRoles) {
                // Trouver le serveur qui contient ce rôle
                for (const guild of client.guilds.cache.values()) {
                    const role = guild.roles.cache.get(roleConfig.roleId);
                    if (role) {
                        await this.startRGB(guild, roleConfig.roleId, roleConfig.interval);
                        restartedRoles.push({
                            roleId: roleConfig.roleId,
                            roleName: role.name,
                            interval: roleConfig.interval,
                            guildName: guild.name
                        });
                        break;
                    }
                }
            }

            return restartedRoles;
        } catch (error) {
            logger.error('❌ [ERREUR] Erreur lors du redémarrage des rôles RGB', error);
            return [];
        }
    }

    // Obtenir tous les rôles RGB actifs
    async getActiveRoles() {
        try {
            const config = await this.loadConfig();
            return config;
        } catch (error) {
            logger.error('❌ [ERREUR] Impossible de récupérer les rôles RGB actifs', error);
            return [];
        }
    }

    // Vérifier si un rôle a le RGB actif
    isRGBActive(roleId) {
        return this.activeIntervals.has(roleId);
    }

    // Obtenir le statut d'un rôle RGB
    async getRoleStatus(roleId) {
        try {
            const config = await this.loadConfig();
            const roleConfig = config.find(r => r.roleId === roleId);
            return roleConfig ? roleConfig.status : 'inactive';
        } catch (error) {
            return 'inactive';
        }
    }

    // Mettre en pause tous les rôles RGB
    async pauseAllRGB() {
        try {
            const config = await this.loadConfig();
            let pausedCount = 0;

            for (const roleConfig of config) {
                if (roleConfig.status === 'active') {
                    await this.pauseRGB(roleConfig.roleId);
                    pausedCount++;
                }
            }

            logger.info(`⏸️ [ACTION] ${pausedCount} rôles RGB mis en pause`);
            return { success: true, count: pausedCount };
        } catch (error) {
            logger.error('❌ [ERREUR] Erreur lors de la pause de tous les rôles RGB', error);
            return { success: false, error: error.message };
        }
    }

    // Reprendre tous les rôles RGB en pause
    async resumeAllRGB(guild) {
        try {
            const config = await this.loadConfig();
            let resumedCount = 0;

            for (const roleConfig of config) {
                if (roleConfig.status === 'paused') {
                    await this.resumeRGB(guild, roleConfig.roleId);
                    resumedCount++;
                }
            }

            logger.info(`▶️ [ACTION] ${resumedCount} rôles RGB repris`);
            return { success: true, count: resumedCount };
        } catch (error) {
            logger.error('❌ [ERREUR] Erreur lors de la reprise de tous les rôles RGB', error);
            return { success: false, error: error.message };
        }
    }

    // Arrêter tous les rôles RGB
    async stopAllRGB() {
        try {
            const config = await this.loadConfig();
            let stoppedCount = 0;

            for (const roleConfig of config) {
                if (roleConfig.status === 'active' || roleConfig.status === 'paused') {
                    await this.stopRGB(roleConfig.roleId);
                    stoppedCount++;
                }
            }

            logger.info(`⏹️ [ACTION] ${stoppedCount} rôles RGB arrêtés`);
            return { success: true, count: stoppedCount };
        } catch (error) {
            logger.error('❌ [ERREUR] Erreur lors de l\'arrêt de tous les rôles RGB', error);
            return { success: false, error: error.message };
        }
    }

    // Supprimer un rôle de la configuration RGB
    async removeRole(roleId) {
        try {
            // Arrêter le RGB s'il est actif
            await this.stopRGB(roleId);

            // Supprimer de la configuration
            const config = await this.loadConfig();
            const updatedConfig = config.filter(r => r.roleId !== roleId);
            await this.saveConfig(updatedConfig);

            logger.info(`🗑️ [ACTION] Rôle ${roleId} supprimé de la configuration RGB`);
            return { success: true, message: 'Rôle supprimé avec succès' };
        } catch (error) {
            logger.error('❌ [ERREUR] Erreur lors de la suppression du rôle RGB', error);
            return { success: false, message: 'Erreur lors de la suppression' };
        }
    }

    // Changer la vitesse d'un rôle RGB
    async changeSpeed(roleId, speed) {
        try {
            const config = await this.loadConfig();
            const roleConfig = config.find(r => r.roleId === roleId);

            if (!roleConfig) {
                return { success: false, message: 'Rôle non trouvé dans la configuration' };
            }

            // Définir les intervalles selon la vitesse
            const intervals = {
                slow: 5000,    // 5 secondes
                normal: 2000,  // 2 secondes (défaut)
                fast: 1000     // 1 seconde
            };

            const newInterval = intervals[speed] || intervals.normal;
            roleConfig.interval = newInterval;

            await this.saveConfig(config);

            // Redémarrer le RGB s'il était actif
            if (roleConfig.status === 'active') {
                await this.stopRGB(roleId);
                await this.startRGB(this.client.guilds.cache.first(), roleId, newInterval);
            }

            logger.info(`⚡ [ACTION] Vitesse changée pour le rôle ${roleId}: ${speed} (${newInterval}ms)`);
            return { success: true, message: `Vitesse changée: ${speed}` };
        } catch (error) {
            logger.error('❌ [ERREUR] Erreur lors du changement de vitesse', error);
            return { success: false, message: 'Erreur lors du changement de vitesse' };
        }
    }

    // Randomiser la couleur d'un rôle RGB
    async randomizeColor(roleId) {
        try {
            const config = await this.loadConfig();
            const roleConfig = config.find(r => r.roleId === roleId);

            if (!roleConfig) {
                return { success: false, message: 'Rôle non trouvé dans la configuration' };
            }

            // Générer une nouvelle couleur aléatoire
            const newColor = this.generateRandomColor(roleConfig.currentColor);
            roleConfig.currentColor = newColor;

            await this.saveConfig(config);

            // Appliquer la couleur immédiatement si le rôle est actif
            if (roleConfig.status === 'active' && this.client) {
                const guild = this.client.guilds.cache.first();
                const role = guild?.roles.cache.get(roleId);
                if (role) {
                    await role.edit({ color: newColor });
                }
            }

            logger.info(`🎲 [ACTION] Couleur randomisée pour le rôle ${roleId}: #${newColor.toString(16).padStart(6, '0')}`);
            return { success: true, message: 'Couleur randomisée avec succès' };
        } catch (error) {
            logger.error('❌ [ERREUR] Erreur lors de la randomisation de couleur', error);
            return { success: false, message: 'Erreur lors de la randomisation' };
        }
    }
}

// Instance singleton
const rgbManager = new RGBManager();
export default rgbManager;