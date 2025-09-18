import fs from 'fs';
import path from 'path';

const AUTOROLE_DATA_PATH = path.join(process.cwd(), 'data', 'autorole.json');

/**
 * Structure des données AutoRole
 * {
 *   "guildId": {
 *     "enabled": boolean,
 *     "roles": ["roleId1", "roleId2"],
 *     "logChannel": "channelId",
 *     "createdAt": timestamp,
 *     "updatedAt": timestamp
 *   }
 * }
 */

/**
 * Charge les données AutoRole depuis le fichier
 */
function loadAutoRoleData() {
  try {
    if (!fs.existsSync(AUTOROLE_DATA_PATH)) {
      // Créer le dossier data s'il n'existe pas
      const dataDir = path.dirname(AUTOROLE_DATA_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Créer le fichier avec un objet vide
      fs.writeFileSync(AUTOROLE_DATA_PATH, JSON.stringify({}, null, 2));
      return {};
    }
    
    const data = fs.readFileSync(AUTOROLE_DATA_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erreur lors du chargement des données AutoRole:', error);
    return {};
  }
}

/**
 * Sauvegarde les données AutoRole dans le fichier
 */
function saveAutoRoleData(data) {
  try {
    fs.writeFileSync(AUTOROLE_DATA_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des données AutoRole:', error);
    return false;
  }
}

/**
 * Récupère la configuration AutoRole d'un serveur
 */
export function getGuildConfig(guildId) {
  const data = loadAutoRoleData();
  return data[guildId] || {
    enabled: false,
    roles: [],
    logChannel: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

/**
 * Met à jour la configuration AutoRole d'un serveur
 */
export function updateGuildConfig(guildId, config) {
  const data = loadAutoRoleData();
  
  if (!data[guildId]) {
    data[guildId] = {
      enabled: false,
      roles: [],
      logChannel: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }
  
  // Mettre à jour les champs fournis
  Object.assign(data[guildId], config, { updatedAt: Date.now() });
  
  return saveAutoRoleData(data);
}

/**
 * Active ou désactive l'AutoRole pour un serveur
 */
export function toggleAutoRole(guildId, enabled) {
  return updateGuildConfig(guildId, { enabled });
}

/**
 * Ajoute un rôle à la liste AutoRole d'un serveur
 */
export function addRole(guildId, roleId) {
  const config = getGuildConfig(guildId);
  
  if (!config.roles.includes(roleId)) {
    config.roles.push(roleId);
    return updateGuildConfig(guildId, { roles: config.roles });
  }
  
  return false; // Rôle déjà présent
}

/**
 * Supprime un rôle de la liste AutoRole d'un serveur
 */
export function removeRole(guildId, roleId) {
  const config = getGuildConfig(guildId);
  const initialLength = config.roles.length;
  
  config.roles = config.roles.filter(id => id !== roleId);
  
  if (config.roles.length !== initialLength) {
    return updateGuildConfig(guildId, { roles: config.roles });
  }
  
  return false; // Rôle non trouvé
}

/**
 * Configure le canal de logs pour un serveur
 */
export function setLogChannel(guildId, channelId) {
  return updateGuildConfig(guildId, { logChannel: channelId });
}

/**
 * Réinitialise complètement la configuration d'un serveur
 */
export function resetGuildConfig(guildId) {
  const data = loadAutoRoleData();
  delete data[guildId];
  return saveAutoRoleData(data);
}

/**
 * Nettoie les rôles invalides d'un serveur
 */
export function cleanInvalidRoles(guildId, validRoleIds) {
  const config = getGuildConfig(guildId);
  const originalRoles = [...config.roles];
  
  config.roles = config.roles.filter(roleId => validRoleIds.includes(roleId));
  
  if (config.roles.length !== originalRoles.length) {
    updateGuildConfig(guildId, { roles: config.roles });
    return originalRoles.filter(roleId => !validRoleIds.includes(roleId));
  }
  
  return [];
}

/**
 * Récupère toutes les configurations AutoRole
 */
export function getAllConfigs() {
  return loadAutoRoleData();
}