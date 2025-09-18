/**
 * Gestionnaire du stockage pour la configuration AutoRole
 * Gère le chargement et la sauvegarde des paramètres AutoRole pour chaque serveur
 */
import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import { dirname } from 'path';
import { autoRoleConfig } from '../config/autoRoleConfig.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CONFIG_DIR = path.join(__dirname, '../../json');
const CONFIG_PATH = path.join(CONFIG_DIR, 'servers.json');

// Cache pour les configurations chargées
const configCache = new Map();
let isConfigLoaded = false;

/**
 * Vérifie si le fichier de configuration existe
 * @returns {Promise<boolean>} True si le fichier existe, false sinon
 */
async function configFileExists() {
  try {
    await access(CONFIG_PATH);
    return true;
  } catch {
    return false;
  }
}

/**
 * S'assure que le dossier de configuration existe
 * @throws {Error} Si la création du dossier échoue
 */
async function ensureConfigDir() {
  try {
    await mkdir(CONFIG_DIR, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      const errorMsg = `Échec de la création du dossier de configuration: ${error.message}`;
      logger.error(errorMsg, { error });
      throw new Error(errorMsg);
    }
  }
}

/**
 * Charge la configuration depuis le fichier
 * @returns {Promise<Object>} La configuration chargée
 * @throws {Error} Si le chargement échoue
 */
async function loadConfig() {
  // Si la configuration est déjà en cache, on la retourne
  if (isConfigLoaded && configCache.size > 0) {
    return Object.fromEntries(configCache);
  }

  try {
    await ensureConfigDir();
    
    // Si le fichier n'existe pas, on le crée avec un objet vide
    if (!await configFileExists()) {
      logger.info('Aucun fichier de configuration trouvé, création d\'un nouveau');
      await writeFile(CONFIG_PATH, JSON.stringify({}, null, 2));
      return {};
    }
    
    // Lire et parser le fichier de configuration
    const data = await readFile(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(data || '{}');
    
    // Mettre en cache les configurations
    Object.entries(config).forEach(([guildId, guildConfig]) => {
      configCache.set(guildId, guildConfig);
    });
    
    isConfigLoaded = true;
    return config;
    
  } catch (error) {
    const errorMsg = `Erreur lors du chargement de la configuration: ${error.message}`;
    logger.error(errorMsg, { error });
    throw new Error(errorMsg);
  }
}

/**
 * Sauvegarde la configuration dans le fichier
 * @param {Object} config - La configuration à sauvegarder
 * @throws {Error} Si la sauvegarde échoue
 */
async function saveConfig(config) {
  try {
    await ensureConfigDir();
    
    // Mettre à jour le cache
    Object.entries(config).forEach(([guildId, guildConfig]) => {
      configCache.set(guildId, guildConfig);
    });
    
    // Écrire dans le fichier avec une indentation pour une meilleure lisibilité
    await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
    
  } catch (error) {
    const errorMsg = `Erreur lors de la sauvegarde de la configuration: ${error.message}`;
    logger.error(errorMsg, { error });
    throw new Error(errorMsg);
  }
}

/**
 * Récupère la configuration AutoRole d'un serveur
 * @param {string} guildId - L'ID du serveur
 * @returns {Promise<Object>} La configuration AutoRole du serveur
 */
export async function getGuildAutoRoleConfig(guildId) {
  try {
    // Charger la configuration si nécessaire
    const config = await loadConfig();
    
    // Si le serveur n'existe pas dans la configuration, on l'initialise avec les valeurs par défaut
    if (!config[guildId]) {
      logger.info(`Création d'une nouvelle configuration pour le serveur ${guildId}`);
      
      const defaultConfig = {
        name: 'Nouveau Serveur',
        prefix: '!',
        logsActive: true,
        autoRole: { ...autoRoleConfig.defaultSettings }
      };
      
      config[guildId] = defaultConfig;
      await saveConfig(config);
      return defaultConfig.autoRole;
    }
    
    // S'assurer que la configuration AutoRole existe et a la bonne structure
    if (!config[guildId].autoRole) {
      logger.info(`Initialisation de la configuration AutoRole pour le serveur ${guildId}`);
      
      config[guildId].autoRole = { ...autoRoleConfig.defaultSettings };
      await saveConfig(config);
    }
    
    // S'assurer que tous les champs requis sont présents
    const requiredFields = Object.keys(autoRoleConfig.defaultSettings);
    let needsUpdate = false;
    
    for (const field of requiredFields) {
      if (config[guildId].autoRole[field] === undefined) {
        config[guildId].autoRole[field] = autoRoleConfig.defaultSettings[field];
        needsUpdate = true;
      }
    }
    
    if (needsUpdate) {
      logger.info(`Mise à jour de la configuration AutoRole pour le serveur ${guildId}`);
      await saveConfig(config);
    }
    
    return config[guildId].autoRole;
    
  } catch (error) {
    logger.error(`Erreur lors de la récupération de la configuration AutoRole pour le serveur ${guildId}:`, error);
    
    // En cas d'erreur, retourner une configuration par défaut
    return { ...autoRoleConfig.defaultSettings };
  }
}

/**
 * Met à jour la configuration AutoRole d'un serveur
 * @param {string} guildId - L'ID du serveur
 * @param {Object} update - Les mises à jour à appliquer
 * @returns {Promise<Object>} La configuration mise à jour
 * @throws {Error} Si la mise à jour échoue
 */
export async function updateGuildAutoRoleConfig(guildId, update) {
  if (!guildId) {
    throw new Error('ID de serveur manquant pour la mise à jour de la configuration AutoRole');
  }
  
  try {
    // Charger la configuration actuelle
    const config = await loadConfig();
    
    // S'assurer que le serveur existe dans la configuration
    if (!config[guildId]) {
      logger.info(`Création d'une nouvelle configuration pour le serveur ${guildId} lors d'une mise à jour`);
      config[guildId] = {
        name: 'Nouveau Serveur',
        prefix: '!',
        logsActive: true,
        autoRole: { ...autoRoleConfig.defaultSettings }
      };
    }
    
    // S'assurer que la configuration AutoRole existe
    if (!config[guildId].autoRole) {
      config[guildId].autoRole = { ...autoRoleConfig.defaultSettings };
    }
    
    // Appliquer les mises à jour
    const updatedConfig = {
      ...config[guildId].autoRole,
      ...update,
      // S'assurer que les rôles sont uniques
      roles: Array.isArray(update.roles) 
        ? [...new Set(update.roles)] 
        : config[guildId].autoRole.roles || []
    };
    
    // Mettre à jour la configuration
    config[guildId].autoRole = updatedConfig;
    
    // Sauvegarder les modifications
    await saveConfig(config);
    
    logger.info(`Configuration AutoRole mise à jour pour le serveur ${guildId}`);
    return updatedConfig;
    
  } catch (error) {
    const errorMsg = `Échec de la mise à jour de la configuration AutoRole pour le serveur ${guildId}: ${error.message}`;
    logger.error(errorMsg, { error });
    throw new Error(errorMsg);
  }
}

/**
 * Supprime la configuration AutoRole d'un serveur
 * @param {string} guildId - L'ID du serveur
 * @returns {Promise<boolean>} True si la suppression a réussi, false sinon
 */
export async function deleteGuildAutoRoleConfig(guildId) {
  try {
    const config = await loadConfig();
    
    if (config[guildId]?.autoRole) {
      delete config[guildId].autoRole;
      await saveConfig(config);
      
      // Mettre à jour le cache
      if (configCache.has(guildId)) {
        delete configCache.get(guildId)?.autoRole;
      }
      
      logger.info(`Configuration AutoRole supprimée pour le serveur ${guildId}`);
      return true;
    }
    
    return false;
    
  } catch (error) {
    logger.error(`Échec de la suppression de la configuration AutoRole pour le serveur ${guildId}:`, error);
    return false;
  }
}

/**
 * Récupère la configuration AutoRole de tous les serveurs
 * @returns {Promise<Object>} Un objet avec les IDs des serveurs comme clés et les configurations comme valeurs
 */
export async function getAllAutoRoleConfigs() {
  try {
    const config = await loadConfig();
    const result = {};
    
    for (const [guildId, guildConfig] of Object.entries(config)) {
      if (guildConfig.autoRole) {
        result[guildId] = guildConfig.autoRole;
      }
    }
    
    return result;
    
  } catch (error) {
    logger.error('Échec de la récupération de toutes les configurations AutoRole:', error);
    return {};
  }
}