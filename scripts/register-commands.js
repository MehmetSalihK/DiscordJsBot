import { REST, Routes } from 'discord.js';
import { readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commandsDir = path.join(__dirname, '../commands/slashcommands');

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
    const mod = await import(pathToFileURL(file).href);
    const cmd = mod.default || mod;
    if (!cmd?.data) continue;
    list.push(cmd.data.toJSON());
  }
  return list;
}

async function register() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID || null;

  if (!token || !clientId) {
    console.error('[ERREUR] DISCORD_TOKEN ou CLIENT_ID manquant.');
    process.exit(1);
  }

  const rest = new REST({ version: '10' }).setToken(token);
  const body = await loadSlashJSON();

  try {
    console.log(`[INFO] Enregistrement de ${body.length} commande(s) slash...`);
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
      console.log('[SUCCÈS] Commandes slash enregistrées au niveau serveur (guild).');
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body });
      console.log('[SUCCÈS] Commandes slash enregistrées au niveau global.');
      console.log('[INFO] Note: la propagation globale peut prendre jusqu\'à 1h. Utilisez GUILD_ID pour des tests rapides.');
    }
  } catch (error) {
    console.error('[ERREUR] Échec d\'enregistrement des commandes slash:', error);
  }
}

register();


