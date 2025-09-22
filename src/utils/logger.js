import chalk from 'chalk';

class Logger {
    constructor() {
        this.verbose = process.env.VERBOSE === 'true' || false;
        this.startTime = Date.now();
    }

    // Fonction utilitaire pour formater l'heure
    getTimestamp() {
        const now = new Date();
        return chalk.gray(`[${now.toLocaleTimeString('fr-FR')}]`);
    }

    // Fonction utilitaire pour formater la durée depuis le démarrage
    getUptime() {
        const uptime = Math.floor((Date.now() - this.startTime) / 1000);
        return chalk.gray(`+${uptime}s`);
    }

    // Messages d'information généraux
    info(message, showTime = true) {
        const timestamp = showTime ? this.getTimestamp() : '';
        console.log(`${timestamp} ${chalk.blue('ℹ️  [INFO]')} ${chalk.white(message)}`);
    }

    // Messages de succès
    success(message, showTime = true) {
        const timestamp = showTime ? this.getTimestamp() : '';
        console.log(`${timestamp} ${chalk.green('✅ [SUCCÈS]')} ${chalk.white(message)}`);
    }

    // Messages d'erreur
    error(message, error = null, showTime = true) {
        const timestamp = showTime ? this.getTimestamp() : '';
        console.log(`${timestamp} ${chalk.red('❌ [ERREUR]')} ${chalk.white(message)}`);
        if (error && this.verbose) {
            console.log(chalk.red(`   └─ ${error.stack || error.message || error}`));
        }
    }

    // Messages d'avertissement
    warn(message, showTime = true) {
        const timestamp = showTime ? this.getTimestamp() : '';
        console.log(`${timestamp} ${chalk.yellow('⚠️  [AVERTISSEMENT]')} ${chalk.white(message)}`);
    }

    // Actions utilisateur (rôles, commandes, etc.)
    action(message, showTime = true) {
        const timestamp = showTime ? this.getTimestamp() : '';
        console.log(`${timestamp} ${chalk.magenta('🎨 [ACTION]')} ${chalk.white(message)}`);
    }

    // Réparations automatiques
    autoRepair(message, showTime = true) {
        const timestamp = showTime ? this.getTimestamp() : '';
        console.log(`${timestamp} ${chalk.cyan('🔧 [AUTO-REPAIR]')} ${chalk.white(message)}`);
    }

    // Chargement de modules
    loading(message, showTime = true) {
        const timestamp = showTime ? this.getTimestamp() : '';
        console.log(`${timestamp} ${chalk.blue('⏳ [CHARGEMENT]')} ${chalk.white(message)}`);
    }

    // Messages de débogage (seulement en mode verbose)
    debug(message, showTime = true) {
        if (!this.verbose) return;
        const timestamp = showTime ? this.getTimestamp() : '';
        console.log(`${timestamp} ${chalk.gray('🐛 [DEBUG]')} ${chalk.gray(message)}`);
    }

    // Header de démarrage
    startupHeader() {
        console.clear();
        console.log(chalk.cyan('╔══════════════════════════════════════════════════════════════╗'));
        console.log(chalk.cyan('║') + chalk.bold.white('                    🚀 DISCORD BOT STARTUP                    ') + chalk.cyan('║'));
        console.log(chalk.cyan('║') + chalk.white('                     Discord.js v14 Bot                       ') + chalk.cyan('║'));
        console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════╝'));
        console.log('');
    }

    // Séparateur de section
    section(title) {
        console.log('');
        console.log(chalk.cyan('─'.repeat(60)));
        console.log(chalk.bold.white(`📋 ${title}`));
        console.log(chalk.cyan('─'.repeat(60)));
    }

    // Footer avec statistiques
    startupFooter(stats) {
        console.log('');
        console.log(chalk.cyan('╔══════════════════════════════════════════════════════════════╗'));
        console.log(chalk.cyan('║') + chalk.bold.green('                        ✅ BOT PRÊT                           ') + chalk.cyan('║'));
        console.log(chalk.cyan('║') + chalk.white(`  👥 Utilisateurs: ${stats.users || 0}`.padEnd(58)) + chalk.cyan('║'));
        console.log(chalk.cyan('║') + chalk.white(`  🏠 Serveurs: ${stats.guilds || 0}`.padEnd(58)) + chalk.cyan('║'));
        console.log(chalk.cyan('║') + chalk.white(`  ⚡ Commandes: ${stats.commands || 0}`.padEnd(58)) + chalk.cyan('║'));
        console.log(chalk.cyan('║') + chalk.white(`  🎯 Événements: ${stats.events || 0}`.padEnd(58)) + chalk.cyan('║'));
        console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════╝'));
        console.log('');
    }

    // Ligne de commande chargée
    commandLoaded(type, name, category = null) {
        const categoryText = category ? chalk.gray(`[${category}]`) : '';
        const typeIcon = type === 'slash' ? '/' : '!';
        console.log(`   ${chalk.green('✅')} ${chalk.white(type === 'slash' ? 'Slash' : 'Préfixe')} chargé: ${chalk.cyan(typeIcon + name)} ${categoryText}`);
    }

    // Ligne d'événement chargé
    eventLoaded(name) {
        console.log(`   ${chalk.green('✅')} Événement chargé: ${chalk.cyan(name)}`);
    }

    // Ligne d'erreur de chargement
    loadError(type, name, error) {
        console.log(`   ${chalk.red('❌')} Échec ${type}: ${chalk.red(name)}`);
        if (this.verbose && error) {
            console.log(`      ${chalk.red('└─')} ${error.message}`);
        }
    }

    // Connexion Discord
    discordConnected(username, tag) {
        this.success(`Bot connecté en tant que ${chalk.bold.cyan(username + '#' + tag)}`);
    }

    // Statistiques de connexion
    connectionStats(users, guilds) {
        this.info(`Prêt à servir ${chalk.bold.yellow(users)} utilisateurs dans ${chalk.bold.yellow(guilds)} serveurs`);
    }

    // Filtrer les warnings Node.js inutiles
    filterNodeWarnings() {
        const originalEmit = process.emit;
        process.emit = function (name, data, ...args) {
            // Filtrer les warnings de dépréciation Discord.js
            if (name === 'warning' && data.name === 'DeprecationWarning') {
                if (data.message.includes('ready event has been renamed to clientReady')) {
                    return false; // Ignorer ce warning spécifique
                }
            }
            return originalEmit.apply(process, arguments);
        };
    }
}

// Instance singleton
const logger = new Logger();

export default logger;


