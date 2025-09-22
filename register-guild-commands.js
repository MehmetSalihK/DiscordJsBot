import { REST, Routes } from 'discord.js';
import { readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';
import logger from './src/utils/logger.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commandsDir = path.join(__dirname, 'commands/slashcommands');

function walk(dir) {
  const entries = readdirSync(dir);
  let files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) files = files.concat(walk(fullPath));
    else if (stats.isFile() && (entry.endsWith('.js') || entry.endsWith('.mjs'))) files.push(fullPath);
  }
  return files;
}

async function loadSlashJSON() {
  const files = walk(commandsDir);
  const list = [];
  for (const file of files) {
    try {
      const mod = await import(pathToFileURL(file).href);
      const cmd = mod.default || mod;
      if (!cmd?.data) {
        logger.warn(`Commande sans data ignorée: ${file}`);
        continue;
      }
      list.push(cmd.data.toJSON());
      logger.success(`Commande chargée: /${cmd.data.name}`);
    } catch (error) {
      logger.error(`Erreur lors du chargement de ${file}:`, error.message);
    }
  }
  return list;
}

async function registerGuildCommands() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  
  // Demander le GUILD_ID si pas défini
  let guildId = process.env.GUILD_ID;
  
  if (!token || !clientId) {
    logger.error('DISCORD_TOKEN ou CLIENT_ID manquant dans .env');
    process.exit(1);
  }

  if (!guildId) {
    logger.warn('GUILD_ID non défini dans .env');
    logger.info('Pour enregistrer rapidement les commandes, ajoutez GUILD_ID=VotreServerID dans votre fichier .env');
    logger.info('Vous pouvez obtenir l\'ID de votre serveur en activant le mode développeur dans Discord');
    logger.info('puis clic droit sur votre serveur > Copier l\'ID');
    logger.info('');
    logger.info('Enregistrement global en cours (peut prendre jusqu\'à 1h)...');
    
    const rest = new REST({ version: '10' }).setToken(token);
    const body = await loadSlashJSON();

    try {
      await rest.put(Routes.applicationCommands(clientId), { body });
      logger.success('Commandes slash enregistrées au niveau global.');
      logger.info('Note: la propagation globale peut prendre jusqu\'à 1h.');
    } catch (error) {
      logger.error('Échec d\'enregistrement des commandes slash:', error);
    }
    return;
  }

  const rest = new REST({ version: '10' }).setToken(token);
  const body = await loadSlashJSON();

  try {
    logger.info(`Enregistrement de ${body.length} commande(s) slash pour le serveur ${guildId}...`);
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
    logger.success('Commandes slash enregistrées au niveau serveur (immédiat).');
    logger.success('Les commandes devraient être disponibles immédiatement !');
  } catch (error) {
    logger.error('Échec d\'enregistrement des commandes slash:', error);
    if (error.code === 50001) {
      logger.info('Erreur: Accès manquant. Vérifiez que:');
      logger.info('   - Le bot est bien dans le serveur');
      logger.info('   - L\'ID du serveur est correct');
      logger.info('   - Le bot a les permissions applications.commands');
    }
  }
}

registerGuildCommands();