import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVERS_FILE = path.join(__dirname, '../../json/servers.json');

/**
 * Lit le fichier servers.json
 * @returns {Object} Les données des serveurs
 */
function readServersData() {
  try {
    if (!fs.existsSync(SERVERS_FILE)) {
      fs.writeFileSync(SERVERS_FILE, '{}', 'utf8');
      return {};
    }
    const data = fs.readFileSync(SERVERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erreur lors de la lecture du fichier servers.json:', error);
    return {};
  }
}

/**
 * Écrit dans le fichier servers.json
 * @param {Object} data - Les données à écrire
 */
function writeServersData(data) {
  try {
    fs.writeFileSync(SERVERS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Erreur lors de l\'écriture du fichier servers.json:', error);
  }
}

/**
 * Obtient la configuration AutoRole d'un serveur
 * @param {string} guildId - L'ID du serveur
 * @returns {Object} La configuration AutoRole
 */
export function getGuildAutoRoleConfig(guildId) {
  const servers = readServersData();
  
  if (!servers[guildId]) {
    servers[guildId] = {
      name: "Serveur Inconnu",
      prefix: "!",
      logChannelId: null,
      logsActive: true,
      autoRole: {
        active: false,
        roles: [],
        logChannelId: null
      }
    };
    writeServersData(servers);
  }
  
  // S'assurer que la structure AutoRole existe
  if (!servers[guildId].autoRole) {
    servers[guildId].autoRole = {
      active: false,
      roles: [],
      logChannelId: null
    };
    writeServersData(servers);
  }
  
  return servers[guildId].autoRole;
}

/**
 * Met à jour la configuration AutoRole d'un serveur
 * @param {string} guildId - L'ID du serveur
 * @param {Object} config - La nouvelle configuration
 */
export function updateGuildAutoRoleConfig(guildId, config) {
  const servers = readServersData();
  
  if (!servers[guildId]) {
    servers[guildId] = {
      name: "Serveur Inconnu",
      prefix: "!",
      logChannelId: null,
      logsActive: true,
      autoRole: {
        active: false,
        roles: [],
        logChannelId: null
      }
    };
  }
  
  if (!servers[guildId].autoRole) {
    servers[guildId].autoRole = {
      active: false,
      roles: [],
      logChannelId: null
    };
  }
  
  // Mettre à jour la configuration
  servers[guildId].autoRole = { ...servers[guildId].autoRole, ...config };
  
  writeServersData(servers);
  return servers[guildId].autoRole;
}

/**
 * Ajoute un rôle à la configuration AutoRole
 * @param {string} guildId - L'ID du serveur
 * @param {string} roleId - L'ID du rôle à ajouter
 * @returns {boolean} True si ajouté avec succès
 */
export function addAutoRole(guildId, roleId) {
  const config = getGuildAutoRoleConfig(guildId);
  
  if (!config.roles.includes(roleId)) {
    config.roles.push(roleId);
    updateGuildAutoRoleConfig(guildId, config);
    return true;
  }
  
  return false;
}

/**
 * Supprime un rôle de la configuration AutoRole
 * @param {string} guildId - L'ID du serveur
 * @param {string} roleId - L'ID du rôle à supprimer
 * @returns {boolean} True si supprimé avec succès
 */
export function removeAutoRole(guildId, roleId) {
  const config = getGuildAutoRoleConfig(guildId);
  
  const index = config.roles.indexOf(roleId);
  if (index > -1) {
    config.roles.splice(index, 1);
    updateGuildAutoRoleConfig(guildId, config);
    return true;
  }
  
  return false;
}

/**
 * Active ou désactive l'AutoRole
 * @param {string} guildId - L'ID du serveur
 * @param {boolean} active - État d'activation
 */
export function setAutoRoleActive(guildId, active) {
  updateGuildAutoRoleConfig(guildId, { active });
}

/**
 * Définit le canal de logs AutoRole
 * @param {string} guildId - L'ID du serveur
 * @param {string} channelId - L'ID du canal
 */
export function setAutoRoleLogChannel(guildId, channelId) {
  updateGuildAutoRoleConfig(guildId, { logChannelId: channelId });
}

/**
 * Réinitialise la configuration AutoRole
 * @param {string} guildId - L'ID du serveur
 */
export function resetAutoRoleConfig(guildId) {
  updateGuildAutoRoleConfig(guildId, {
    active: false,
    roles: [],
    logChannelId: null
  });
}

/**
 * Met à jour le nom du serveur
 * @param {string} guildId - L'ID du serveur
 * @param {string} guildName - Le nom du serveur
 */
export function updateGuildName(guildId, guildName) {
  const servers = readServersData();
  
  if (servers[guildId]) {
    servers[guildId].name = guildName;
    writeServersData(servers);
  }
}