import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

class Logger {
    constructor() {
        this.verbose = process.env.VERBOSE === 'true' || false;
        this.startTime = Date.now();
        this.events = [];
        this.maxEvents = 500;
        this.subscribers = new Set();
        this.persistPath = path.join(process.cwd(), 'data', 'logs.json');
        try {
            if (fs.existsSync(this.persistPath)) {
                const raw = fs.readFileSync(this.persistPath, 'utf8');
                const parsed = raw ? JSON.parse(raw) : { events: [] };
                if (Array.isArray(parsed.events)) {
                    this.events = parsed.events.slice(-this.maxEvents);
                }
            } else {
                fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
                fs.writeFileSync(this.persistPath, JSON.stringify({ events: [] }, null, 2));
            }
        } catch (e) {
            // Ignore file init errors
        }
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
        this._record('info', message);
    }

    // Messages de succès
    success(message, showTime = true) {
        const timestamp = showTime ? this.getTimestamp() : '';
        console.log(`${timestamp} ${chalk.green('✅ [SUCCÈS]')} ${chalk.white(message)}`);
        this._record('success', message);
    }

    // Messages d'erreur
    error(message, error = null, showTime = true) {
        const timestamp = showTime ? this.getTimestamp() : '';
        console.log(`${timestamp} ${chalk.red('❌ [ERREUR]')} ${chalk.white(message)}`);
        if (error && this.verbose) {
            console.log(chalk.red(`   └─ ${error.stack || error.message || error}`));
        }
        this._record('error', error ? `${message} :: ${error.message || error}` : message);
    }

    // Messages d'avertissement
    warn(message, showTime = true) {
        const timestamp = showTime ? this.getTimestamp() : '';
        console.log(`${timestamp} ${chalk.yellow('⚠️  [AVERTISSEMENT]')} ${chalk.white(message)}`);
        this._record('warn', message);
    }

    // Actions utilisateur (rôles, commandes, etc.)
    action(message, showTime = true) {
        const timestamp = showTime ? this.getTimestamp() : '';
        console.log(`${timestamp} ${chalk.magenta('🎨 [ACTION]')} ${chalk.white(message)}`);
        this._record('action', message);
    }

    // Réparations automatiques
    autoRepair(message, showTime = true) {
        const timestamp = showTime ? this.getTimestamp() : '';
        console.log(`${timestamp} ${chalk.cyan('🔧 [AUTO-REPAIR]')} ${chalk.white(message)}`);
        this._record('autorepair', message);
    }

    // Chargement de modules
    loading(message, showTime = true) {
        const timestamp = showTime ? this.getTimestamp() : '';
        console.log(`${timestamp} ${chalk.blue('⏳ [CHARGEMENT]')} ${chalk.white(message)}`);
        this._record('loading', message);
    }

    // Messages de débogage (seulement en mode verbose)
    debug(message, showTime = true) {
        if (!this.verbose) return;
        const timestamp = showTime ? this.getTimestamp() : '';
        console.log(`${timestamp} ${chalk.gray('🐛 [DEBUG]')} ${chalk.gray(message)}`);
        this._record('debug', message);
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
        this._record('success', `Événement chargé: ${name}`);
    }

    // Ligne d'erreur de chargement
    loadError(type, name, error) {
        console.log(`   ${chalk.red('❌')} Échec ${type}: ${chalk.red(name)}`);
        if (this.verbose && error) {
            console.log(`      ${chalk.red('└─')} ${error.message}`);
        }
        this._record('error', `Échec ${type}: ${name} :: ${error?.message || 'Erreur'}`);
    }

    // Connexion Discord
    discordConnected(username, tag) {
        this.success(`Bot connecté en tant que ${chalk.bold.cyan(username + '#' + tag)}`);
        this._record('success', `Bot connecté: ${username}#${tag}`);
    }

    // Statistiques de connexion
    connectionStats(users, guilds) {
        this.info(`Prêt à servir ${chalk.bold.yellow(users)} utilisateurs dans ${chalk.bold.yellow(guilds)} serveurs`);
        this._record('info', `Stats connexion: users=${users}, guilds=${guilds}`);
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

    // Souscription pour recevoir les événements de logs
    subscribe(fn) {
        if (typeof fn === 'function') this.subscribers.add(fn);
        return () => this.subscribers.delete(fn);
    }

    // Récupération des derniers événements (avec filtrage optionnel)
    getRecentEvents(levels = null, limit = 200) {
        const src = Array.isArray(this.events) ? this.events : [];
        const filtered = Array.isArray(levels) && levels.length > 0
            ? src.filter(e => levels.includes(e.level))
            : src;
        return filtered.slice(-limit);
    }

    // Enregistrement + notification
    _record(level, message) {
        const event = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            level,
            message: typeof message === 'string' ? message : JSON.stringify(message),
            time: new Date().toISOString(),
            uptimeSec: Math.floor((Date.now() - this.startTime) / 1000)
        };
        try {
            this.events.push(event);
            if (this.events.length > this.maxEvents) {
                this.events = this.events.slice(-this.maxEvents);
            }
            // Persistance légère
            const fileData = fs.existsSync(this.persistPath)
                ? JSON.parse(fs.readFileSync(this.persistPath, 'utf8') || '{}')
                : { events: [] };
            const current = Array.isArray(fileData.events) ? fileData.events : [];
            current.push(event);
            fileData.events = current.slice(-this.maxEvents);
            fs.writeFileSync(this.persistPath, JSON.stringify(fileData, null, 2));
        } catch (e) {
            // ignore persistence errors
        }
        // Notifier les abonnés (Socket.IO, etc.)
        for (const fn of this.subscribers) {
            try { fn(event); } catch {}
        }
    }
}

// Instance singleton
const logger = new Logger();

export default logger;


