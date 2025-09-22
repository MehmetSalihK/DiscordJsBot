import { readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { Collection } from 'discord.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function walk(dir) {
  const entries = readdirSync(dir);
  let files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files = files.concat(walk(fullPath));
    } else if (stats.isFile() && (entry.endsWith('.js') || entry.endsWith('.mjs'))) {
      files.push(fullPath);
    }
  }
  return files;
}

export async function loadPrefixCommands(commandsPath, client) {
  const commands = new Collection();
  try {
    const files = walk(commandsPath);
    logger.info(`Chargement des commandes préfixées depuis: ${commandsPath}`);
    for (const file of files) {
      try {
        const mod = await import(pathToFileURLSafe(file));
        const cmd = mod.default || mod;
        if (!cmd || !cmd.name || typeof cmd.execute !== 'function') {
          logger.warn(`Commande préfixée invalide (ignorée): ${file}`);
          continue;
        }
        commands.set(cmd.name, cmd);
        logger.success(`Préfixe chargé: ${cmd.name}${cmd.category ? ' [' + cmd.category + ']' : ''}`);
      } catch (err) {
        logger.error(`Échec de chargement (préfixe): ${file}`, err);
      }
    }
  } catch (e) {
    logger.error('Erreur lors du chargement des commandes préfixées:', e);
  }
  client.prefixCommands = commands;
  return commands;
}

export async function loadSlashCommands(commandsPath, client) {
  const commands = new Collection();
  try {
    const files = walk(commandsPath);
    logger.info(`Chargement des commandes slash depuis: ${commandsPath}`);
    for (const file of files) {
      try {
        const mod = await import(pathToFileURLSafe(file));
        const cmd = mod.default || mod;
        if (!cmd || !cmd.data || typeof cmd.execute !== 'function') {
          logger.warn(`Commande slash invalide (ignorée): ${file}`);
          continue;
        }
        commands.set(cmd.data.name, cmd);
        logger.success(`Slash chargé: /${cmd.data.name}${cmd.category ? ' [' + cmd.category + ']' : ''}`);
      } catch (err) {
        logger.error(`Échec de chargement (slash): ${file}`, err);
      }
    }
  } catch (e) {
    logger.error('Erreur lors du chargement des commandes slash:', e);
  }
  client.slashCommands = commands;
  return commands;
}

function pathToFileURLSafe(p) {
  let absolute = p;
  if (!path.isAbsolute(absolute)) {
    absolute = path.join(__dirname, absolute);
  }
  return pathToFileURL(absolute).href;
}


