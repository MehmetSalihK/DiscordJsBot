import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BUTTONREACT_FILE = path.join(__dirname, '../../../data/buttonreact.json');

/**
 * Charge les données de boutons de réaction depuis le fichier JSON
 * @returns {Object} Les données de boutons de réaction
 */
function loadButtonReactData() {
    try {
        if (!fs.existsSync(BUTTONREACT_FILE)) {
            return {};
        }
        const data = fs.readFileSync(BUTTONREACT_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Erreur lors du chargement des données de boutons de réaction:', error);
        return {};
    }
}

/**
 * Sauvegarde les données de boutons de réaction dans le fichier JSON
 * @param {Object} data - Les données à sauvegarder
 */
function saveButtonReactData(data) {
    try {
        fs.writeFileSync(BUTTONREACT_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des données de boutons de réaction:', error);
    }
}

/**
 * Obtient la configuration des boutons de réaction pour un serveur
 * @param {string} guildId - L'ID du serveur
 * @returns {Object} La configuration du serveur
 */
function getGuildButtonReactConfig(guildId) {
    const data = loadButtonReactData();
    return data.guilds?.[guildId] || { panels: {} };
}

/**
 * Met à jour la configuration des boutons de réaction pour un serveur
 * @param {string} guildId - L'ID du serveur
 * @param {Object} config - La nouvelle configuration
 */
function updateGuildButtonReactConfig(guildId, config) {
    const data = loadButtonReactData();
    if (!data.guilds) {
        data.guilds = {};
    }
    data.guilds[guildId] = config;
    saveButtonReactData(data);
}

/**
 * Ajoute un panneau de boutons de réaction
 * @param {string} guildId - L'ID du serveur
 * @param {string} panelId - L'ID du panneau
 * @param {Object} panelConfig - La configuration du panneau
 */
function addButtonReactPanel(guildId, panelId, panelConfig) {
    const config = getGuildButtonReactConfig(guildId);
    config.panels[panelId] = panelConfig;
    updateGuildButtonReactConfig(guildId, config);
}

/**
 * Supprime un panneau de boutons de réaction
 * @param {string} guildId - L'ID du serveur
 * @param {string} panelId - L'ID du panneau
 */
function removeButtonReactPanel(guildId, panelId) {
    const config = getGuildButtonReactConfig(guildId);
    delete config.panels[panelId];
    updateGuildButtonReactConfig(guildId, config);
}

/**
 * Obtient un panneau de boutons de réaction spécifique
 * @param {string} guildId - L'ID du serveur
 * @param {string} panelId - L'ID du panneau
 * @returns {Object|null} La configuration du panneau ou null
 */
function getButtonReactPanel(guildId, panelId) {
    const config = getGuildButtonReactConfig(guildId);
    return config.panels[panelId] || null;
}

/**
 * Obtient tous les panneaux de boutons de réaction d'un serveur
 * @param {string} guildId - L'ID du serveur
 * @returns {Object} Tous les panneaux du serveur
 */
function getAllButtonReactPanels(guildId) {
    const config = getGuildButtonReactConfig(guildId);
    return config.panels || {};
}

export {
    loadButtonReactData,
    saveButtonReactData,
    getGuildButtonReactConfig,
    updateGuildButtonReactConfig,
    addButtonReactPanel,
    removeButtonReactPanel,
    getButtonReactPanel,
    getAllButtonReactPanels
};


