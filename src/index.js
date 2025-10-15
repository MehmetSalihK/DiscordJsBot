import { Client, Collection, GatewayIntentBits, Partials, Events, MessageFlags, EmbedBuilder } from 'discord.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { config, assertConfig } from './config.js';
import mongoose from 'mongoose';
import { initializeSync } from './utils/syncAllJson.js';
import { initializeSyncCategorized } from './utils/syncCategorizedJson.js';
import { startDashboardServer } from './dashboard/server.js';
import logger from './utils/logger.js';
import { initializeErrorFiltering } from './utils/errorFilter.js';
import { displayStartupHeader, displayStartupFooter, displayDebugInfo } from './utils/startup.js';
import { loadPrefixCommands, loadSlashCommands } from './loaders/commandLoader.js';
import { getPrefix, setGuildConfig } from './store/configStore.js';
import { handleHelpButton, handleLogsButton, handleServerInfoButton } from './handlers/buttonHandlers.js';
import QueueManager from '../music/queueManager.js';
import { MusicButtonHandler } from '../music/buttonHandler.js';
import reactionRolesConfig from '../data/reactionroles.json' with { type: "json" };

// Initialiser le système de filtrage des erreurs
initializeErrorFiltering();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Afficher le header de démarrage
  displayStartupHeader();
  displayDebugInfo();
  
  try {
    assertConfig();
  } catch (e) {
    logger.error(e.message);
    process.exit(1);
  }

  // Connecter MongoDB
  const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://msk:msk123@discordbot.j5uxjzc.mongodb.net/discordbot';
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connecté !');
  } catch (err) {
    console.error('❌ Erreur de connexion MongoDB :', err.message);
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

  // Initialiser la synchronisation JSON ⇄ MongoDB (catégorisée)
  await initializeSyncCategorized();

  // Démarrer le serveur dashboard en parallèle, avec le client Discord
  startDashboardServer(client);

  // Les interactions sont gérées par src/events/interactioncreate.js

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild) return;
    
    // Vérifier si le message est exactement "prefix" (insensible à la casse)
    if (message.content.trim().toLowerCase() === 'prefix') {
      const currentPrefix = getPrefix(message.guild.id, config.prefix);
      const embed = new EmbedBuilder()
        .setColor('#4CAF50')
        .setTitle('🔧 Préfixe actuel')
        .setDescription(`Le préfixe actuel de ce serveur est : \`${currentPrefix}\``)
        .setFooter({ text: 'Pour changer le préfixe, utilisez la commande setprefix (admin uniquement)' })
        .setTimestamp();
      
      return message.reply({ embeds: [embed] });
    }
    
    // Vérification normale du préfixe pour les autres commandes
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
      const role = guild.roles.cache.get(roleMapping.id_role);
      if (role && !member.roles.cache.has(role.id)) {
        await member.roles.add(roleMapping.id_role);
        logger.info(`✅ Reaction Role: Rôle ${role.name} ajouté à ${user.tag} (Message: ${reaction.message.id}, Emoji: ${reaction.emoji.toString()})`);
        
        // Envoyer un log dans le canal de logs si configuré
        const { getGuildConfig } = await import('./store/configStore.js');
        const { createSuccessEmbed } = await import('./utils/embeds.js');
        
        const guildConfig = getGuildConfig(reaction.message.guild.id) || {};
        if (guildConfig.reactionRoles?.logs !== false && guildConfig.logChannelId) {
          const logChannel = reaction.message.guild.channels.cache.get(guildConfig.logChannelId);
          if (logChannel) {
            const logEmbed = createSuccessEmbed(
              'Reaction Role - Rôle ajouté',
              `**Utilisateur:** ${user}\n**Rôle:** ${role}\n**Message:** [Aller au message](${reaction.message.url})\n**Emoji:** ${reaction.emoji.toString()}\n**Description:** ${roleMapping.description || 'Aucune'}`
            );
            await logChannel.send({ embeds: [logEmbed] });
          }
        }
      }
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
      const role = guild.roles.cache.get(roleMapping.id_role);
      if (role && member.roles.cache.has(role.id)) {
        await member.roles.remove(roleMapping.id_role);
        logger.info(`❌ Reaction Role: Rôle ${role.name} retiré à ${user.tag} (Message: ${reaction.message.id}, Emoji: ${reaction.emoji.toString()})`);
        
        // Envoyer un log dans le canal de logs si configuré
        const { getGuildConfig } = await import('./store/configStore.js');
        const { createErrorEmbed } = await import('./utils/embeds.js');
        
        const guildConfig = getGuildConfig(reaction.message.guild.id) || {};
        if (guildConfig.reactionRoles?.logs !== false && guildConfig.logChannelId) {
          const logChannel = reaction.message.guild.channels.cache.get(guildConfig.logChannelId);
          if (logChannel) {
            const logEmbed = createErrorEmbed(
              'Reaction Role - Rôle retiré',
              `**Utilisateur:** ${user}\n**Rôle:** ${role}\n**Message:** [Aller au message](${reaction.message.url})\n**Emoji:** ${reaction.emoji.toString()}`
            );
            await logChannel.send({ embeds: [logEmbed] });
          }
        }
      }
    } catch (error) {
      logger.error('❌ Impossible de retirer le rôle:', error);
    }
  });

  // Système d'expiration automatique des suspensions
  const { checkExpiredSuspensions } = await import('./handlers/progressiveSuspensions.js');
  
  // Vérifier les suspensions expirées toutes les 5 minutes
  setInterval(async () => {
    try {
      await checkExpiredSuspensions(client);
    } catch (error) {
      logger.error('Erreur lors de la vérification des suspensions expirées:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes

  // Connexion
  try {
    await client.login(config.token);
    logger.success('Connecté avec succès à Discord');
    
    // Vérifier les suspensions expirées au démarrage
    setTimeout(async () => {
      try {
        await checkExpiredSuspensions(client);
        logger.info('Vérification initiale des suspensions expirées effectuée');
      } catch (error) {
        logger.error('Erreur lors de la vérification initiale des suspensions:', error);
      }
    }, 10000); // Attendre 10 secondes après le démarrage
    
  } catch (error) {
    logger.error('Impossible de se connecter au bot:', error);
    process.exit(1);
  }
}

main();


