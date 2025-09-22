import logger from './logger.js';

/**
 * Liste des patterns d'erreurs et warnings à ignorer
 */
const IGNORED_PATTERNS = [
  // YouTube.js erreurs
  'GridShelfView',
  'SectionHeaderView', 
  'youtubei.js',
  'Failed to find class',
  'Unknown class',
  'YTNodes',
  'Parser.parseItem',
  'RawNode',
  'ButtonView',
  'ShortsLockupView',
  'MusicResponsiveListItemView',
  'MusicTwoRowItemView',
  
  // Discord.js warnings dépréciés
  'DeprecationWarning',
  'ready event has been renamed to clientReady',
  
  // Node.js warnings courants
  'ExperimentalWarning',
  'punycode module is deprecated',
  
  // Autres warnings courants
  'MaxListenersExceededWarning',
  'UnhandledPromiseRejectionWarning'
];

/**
 * Vérifie si un message doit être ignoré
 */
function shouldIgnoreMessage(message) {
  if (typeof message !== 'string') {
    message = String(message);
  }
  
  return IGNORED_PATTERNS.some(pattern => 
    message.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Filtre personnalisé pour console.error
 */
function filteredConsoleError(...args) {
  const message = args.join(' ');
  
  if (shouldIgnoreMessage(message)) {
    // Optionnel: logger en mode debug pour traçabilité
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG_FILTERED) {
      logger.debug(`[FILTERED ERROR] ${message}`);
    }
    return;
  }
  
  // Utiliser notre logger pour les erreurs importantes
  logger.error(...args);
}

/**
 * Filtre personnalisé pour console.warn
 */
function filteredConsoleWarn(...args) {
  const message = args.join(' ');
  
  if (shouldIgnoreMessage(message)) {
    // Optionnel: logger en mode debug pour traçabilité
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG_FILTERED) {
      logger.debug(`[FILTERED WARN] ${message}`);
    }
    return;
  }
  
  // Utiliser notre logger pour les warnings importants
  logger.warn(...args);
}

/**
 * Gestionnaire d'erreurs non gérées filtré
 */
function filteredUncaughtException(error) {
  const message = error.message || error.toString();
  
  if (shouldIgnoreMessage(message)) {
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG_FILTERED) {
      logger.debug(`[FILTERED UNCAUGHT] ${message}`);
    }
    return;
  }
  
  logger.error('Erreur non gérée:', error);
  
  // Pour les erreurs critiques, on peut choisir de quitter
  if (!message.includes('YouTube') && !message.includes('ytdl')) {
    process.exit(1);
  }
}

/**
 * Gestionnaire de promesses rejetées filtré
 */
function filteredUnhandledRejection(reason, promise) {
  const message = reason?.message || reason?.toString() || '';
  
  if (shouldIgnoreMessage(message)) {
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG_FILTERED) {
      logger.debug(`[FILTERED REJECTION] ${message}`);
    }
    return;
  }
  
  logger.error('Promesse rejetée non gérée:', reason);
  logger.debug('Promise:', promise);
}

/**
 * Initialise le système de filtrage des erreurs
 */
export function initializeErrorFiltering() {
  // Sauvegarder les fonctions originales
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  // Remplacer les fonctions console
  console.error = filteredConsoleError;
  console.warn = filteredConsoleWarn;
  
  // Gérer les erreurs non gérées
  process.removeAllListeners('uncaughtException');
  process.removeAllListeners('unhandledRejection');
  
  process.on('uncaughtException', filteredUncaughtException);
  process.on('unhandledRejection', filteredUnhandledRejection);
  
  // Gérer les warnings Node.js
  process.on('warning', (warning) => {
    if (shouldIgnoreMessage(warning.message)) {
      if (process.env.NODE_ENV === 'development' && process.env.DEBUG_FILTERED) {
        logger.debug(`[FILTERED WARNING] ${warning.name}: ${warning.message}`);
      }
      return;
    }
    
    logger.warn(`${warning.name}: ${warning.message}`);
  });
  
  logger.info('Système de filtrage des erreurs initialisé');
  
  // Retourner les fonctions originales pour usage si nécessaire
  return {
    originalConsoleError,
    originalConsoleWarn
  };
}

/**
 * Ajoute un pattern à ignorer dynamiquement
 */
export function addIgnoredPattern(pattern) {
  if (!IGNORED_PATTERNS.includes(pattern)) {
    IGNORED_PATTERNS.push(pattern);
    logger.debug(`Pattern ajouté à la liste d'ignorés: ${pattern}`);
  }
}

/**
 * Supprime un pattern de la liste d'ignorés
 */
export function removeIgnoredPattern(pattern) {
  const index = IGNORED_PATTERNS.indexOf(pattern);
  if (index > -1) {
    IGNORED_PATTERNS.splice(index, 1);
    logger.debug(`Pattern supprimé de la liste d'ignorés: ${pattern}`);
  }
}

/**
 * Obtient la liste des patterns ignorés
 */
export function getIgnoredPatterns() {
  return [...IGNORED_PATTERNS];
}