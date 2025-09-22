import { Client, Collection, GatewayIntentBits, Partials, Events, MessageFlags } from 'discord.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { config, assertConfig } from './config.js';
import { logger } from './utils/logger.js';
import { loadPrefixCommands, loadSlashCommands } from './loaders/commandLoader.js';
import { getPrefix, setGuildConfig } from './store/configStore.js';
import { handleHelpButton, handleLogsButton, handleServerInfoButton, handleXPButton, handleXPModal } from './handlers/buttonHandlers.js';
import QueueManager from '../music/queueManager.js';
import { MusicButtonHandler } from '../music/buttonHandler.js';
import reactionRolesConfig from '../data/reactionroles.json' with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  try {
    assertConfig();
  } catch (e) {
    logger.error(e.message);
    process.exit(1);
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction],
  });

  // Handlers XP (messages et vocal)
  const { handleMessageXP, handleVoiceStateUpdate } = await import('./handlers/xpHandlers.js');
  client.on(Events.MessageCreate, async (message) => {
    try {
      await handleMessageXP(message);
    } catch (e) {
      logger.warn('XP message handler error:', e?.message || e);
    }
  });
  client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    try {
      await handleVoiceStateUpdate(oldState, newState);
    } catch (e) {
      logger.warn('XP voice handler error:', e?.message || e);
    }
  });

  client.prefixCommands = new Collection();
  client.slashCommands = new Collection();

  // Initialisation du système de musique
  client.queueManager = new QueueManager(client);
  client.musicButtonHandler = new MusicButtonHandler(client);

  // Charger les gestionnaires d'événements
  const eventsPath = path.join(__dirname, 'events');
  const eventFiles = (await fs.readdir(eventsPath)).filter(file => file.endsWith('.js'));

  for (const file of eventFiles) {
    try {
      const filePath = path.join(eventsPath, file);
      const { default: event } = await import(`file://${filePath.replace(/\\/g, '/')}`);
      
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
      
      logger.info(`Événement chargé: ${event.name}`);
    } catch (error) {
      logger.error(`Erreur lors du chargement de l'événement ${file}:`, error);
    }
  }

  // Les interactions sont gérées par src/events/interactioncreate.js

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild) return;
    const guildPrefix = getPrefix(message.guild.id, config.prefix);
    if (!message.content.startsWith(guildPrefix)) return;

    const args = message.content.slice(guildPrefix.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();
    const command = client.prefixCommands.get(commandName);
    if (!command) return; // silencieux si commande inconnue

    try {
      await command.execute(message, args, client);
    } catch (error) {
      logger.error('Erreur lors de l\'exécution d\'une commande préfixée:', error);
      await message.reply('Une erreur est survenue lors de l\'exécution de cette commande.');
    }
  });

  // Chargement des commandes
  const prefixPath = path.join(__dirname, '../commands/prefix');
  const slashPath = path.join(__dirname, '../commands/slashcommands');
  
  try {
    await Promise.all([
      loadPrefixCommands(prefixPath, client),
      loadSlashCommands(slashPath, client)
    ]);
    
    logger.info('Commandes chargées avec succès');
  } catch (error) {
    logger.error('Erreur lors du chargement des commandes:', error);
    process.exit(1);
  }

  // Gestion des réactions pour les rôles
  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    if (user.bot) return;
    
    // Vérifier si la réaction partielle doit être récupérée
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        logger.error('Erreur lors de la récupération de la réaction:', error);
        return;
      }
    }

    const reactionRule = reactionRolesConfig.find(rule => rule.id_message === reaction.message.id);
    if (!reactionRule) return;

    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id);

    const roleMapping = reactionRule.reactions.find(r => r.id_emoji === reaction.emoji.id);
    if (!roleMapping) return;

    try {
      await member.roles.add(roleMapping.id_role);
      logger.info(`✅ Rôle ajouté à ${user.tag}`);
    } catch (error) {
      logger.error('❌ Impossible d\'ajouter le rôle:', error);
    }
  });

  client.on(Events.MessageReactionRemove, async (reaction, user) => {
    if (user.bot) return;
    
    // Vérifier si la réaction partielle doit être récupérée
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        logger.error('Erreur lors de la récupération de la réaction:', error);
        return;
      }
    }

    const reactionRule = reactionRolesConfig.find(rule => rule.id_message === reaction.message.id);
    if (!reactionRule) return;

    const guild = reaction.message.guild;
    const member = await guild.members.fetch(user.id);

    const roleMapping = reactionRule.reactions.find(r => r.id_emoji === reaction.emoji.id);
    if (!roleMapping) return;

    try {
      await member.roles.remove(roleMapping.id_role);
      logger.info(`❌ Rôle retiré à ${user.tag}`);
    } catch (error) {
      logger.error('❌ Impossible de retirer le rôle:', error);
    }
  });

  // Connexion
  try {
    await client.login(config.token);
    logger.success('Connecté avec succès à Discord');
  } catch (error) {
    logger.error('Impossible de se connecter au bot:', error);
    process.exit(1);
  }
}

main();


