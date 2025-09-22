import { Client, GatewayIntentBits } from 'discord.js';
import { config } from './src/config.js';
import { loadSlashCommands } from './src/loaders/commandLoader.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test simple pour vérifier le chargement des slash commands
 */
async function testSlashCommands() {
    logger.info('Test du système de slash commands...\n');

    try {
        // Test 1: Vérifier la configuration
        logger.info('Test 1: Vérification de la configuration');
        logger.info(`Token configuré: ${config.token ? 'Oui' : 'Non'}`);
        logger.info(`Client ID configuré: ${config.clientId ? 'Oui' : 'Non'}`);
        logger.info(`Guild ID configuré: ${config.guildId ? config.guildId : 'Non (enregistrement global)'}`);

        // Test 2: Charger les commandes
        logger.info('\nTest 2: Chargement des slash commands');
        const client = { slashCommands: new Map() };
        const slashPath = path.join(__dirname, 'commands/slashcommands');
        
        await loadSlashCommands(slashPath, client);
        
        logger.success(`${client.slashCommands.size} commandes slash chargées`);

        // Test 3: Vérifier quelques commandes importantes
        logger.info('\nTest 3: Vérification des commandes importantes');
        const importantCommands = ['help', 'ping', 'serverinfo', 'userinfo'];
        
        for (const cmdName of importantCommands) {
            const cmd = client.slashCommands.get(cmdName);
            if (cmd) {
                logger.success(`/${cmdName} - OK`);
            } else {
                logger.error(`/${cmdName} - MANQUANTE`);
            }
        }

        // Test 4: Lister toutes les commandes par catégorie
        logger.info('\nTest 4: Liste des commandes par catégorie');
        const categories = {};
        
        for (const [name, cmd] of client.slashCommands) {
            const category = cmd.category || 'sans_catégorie';
            if (!categories[category]) categories[category] = [];
            categories[category].push(name);
        }

        for (const [category, commands] of Object.entries(categories)) {
            logger.info(`${category}: ${commands.length} commandes`);
            logger.info(`   ${commands.map(c => `/${c}`).join(', ')}`);
        }

        logger.success('\nTests terminés avec succès !');
        logger.info('\nSi les slash commands ne fonctionnent toujours pas :');
        logger.info('   1. Configurez GUILD_ID dans .env pour un enregistrement rapide');
        logger.info('   2. Exécutez: node register-guild-commands.js');
        logger.info('   3. Vérifiez les permissions du bot sur Discord');

    } catch (error) {
        logger.error('Erreur lors des tests:', error);
        process.exit(1);
    }
}

// Exécuter les tests
testSlashCommands().then(() => {
    logger.success('\nTests terminés.');
    process.exit(0);
}).catch(error => {
    logger.error('Erreur fatale:', error);
    process.exit(1);
});