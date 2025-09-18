export const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[AVERTISSEMENT]', ...args),
  error: (...args) => console.error('[ERREUR]', ...args),
  success: (...args) => console.log('[SUCCÈS]', ...args),
};
