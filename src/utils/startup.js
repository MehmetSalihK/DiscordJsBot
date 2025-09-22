import logger from './logger.js';
import { config } from '../config.js';
import os from 'os';

/**
 * Affiche le header de démarrage du bot
 */
export function displayStartupHeader() {
  const botName = 'Discord.js Bot';
  const version = '2.0.0';
  const nodeVersion = process.version;
  const platform = os.platform();
  const arch = os.arch();
  
  // Header avec bordure
  logger.info('╔══════════════════════════════════════════════════════════════╗');
  logger.info('║                                                              ║');
  logger.info(`║  🤖 ${botName.padEnd(52)} ║`);
  logger.info(`║  📦 Version: ${version.padEnd(47)} ║`);
  logger.info('║                                                              ║');
  logger.info(`║  🟢 Node.js: ${nodeVersion.padEnd(47)} ║`);
  logger.info(`║  💻 Plateforme: ${platform.padEnd(44)} ║`);
  logger.info(`║  🏗️  Architecture: ${arch.padEnd(42)} ║`);
  logger.info('║                                                              ║');
  logger.info('╚══════════════════════════════════════════════════════════════╝');
  logger.info('');
  
  // Informations de configuration
  logger.info('🔧 Configuration du bot:');
  logger.info(`   • Token: ${config.token ? '✅ Configuré' : '❌ Manquant'}`);
  logger.info(`   • Client ID: ${config.clientId ? '✅ Configuré' : '❌ Manquant'}`);
  logger.info(`   • Guild ID: ${config.guildId ? `✅ ${config.guildId}` : '⚠️  Non défini (mode global)'}`);
  logger.info(`   • Préfixe: ${config.prefix || '!'}`);
  logger.info('');
}

/**
 * Affiche le footer de démarrage une fois le bot connecté
 */
export function displayStartupFooter(client) {
  const guildsCount = client.guilds.cache.size;
  const usersCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
  const commandsCount = client.slashCommands?.size || 0;
  const prefixCommandsCount = client.prefixCommands?.size || 0;
  
  logger.info('');
  logger.info('╔══════════════════════════════════════════════════════════════╗');
  logger.info('║                    🎉 BOT DÉMARRÉ AVEC SUCCÈS               ║');
  logger.info('╚══════════════════════════════════════════════════════════════╝');
  logger.info('');
  
  // Statistiques
  logger.success('📊 Statistiques:');
  logger.info(`   • Serveurs: ${guildsCount}`);
  logger.info(`   • Utilisateurs: ${usersCount.toLocaleString()}`);
  logger.info(`   • Commandes slash: ${commandsCount}`);
  logger.info(`   • Commandes préfixe: ${prefixCommandsCount}`);
  logger.info('');
  
  // Informations utiles
  logger.info('💡 Informations utiles:');
  logger.info('   • Logs: Les événements importants sont enregistrés');
  logger.info('   • Commandes: Tapez /help pour voir toutes les commandes');
  logger.info('   • Support: Vérifiez les logs en cas de problème');
  logger.info('');
  
  // Status final
  logger.success(`🚀 ${client.user.tag} est maintenant en ligne et prêt à servir !`);
  logger.info('');
  logger.info('═'.repeat(64));
  logger.info('');
}

/**
 * Affiche les informations de débogage si nécessaire
 */
export function displayDebugInfo() {
  if (process.env.NODE_ENV === 'development') {
    logger.warn('🔧 Mode développement activé');
    logger.info('   • Logs détaillés activés');
    logger.info('   • Rechargement automatique disponible');
    logger.info('');
  }
}