import { Client, Collection, GatewayIntentBits, Partials, Events, MessageFlags } from 'discord.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { config, assertConfig } from './config.js';
import { logger } from './utils/logger.js';
import { loadPrefixCommands, loadSlashCommands } from './loaders/commandLoader.js';
import { getPrefix, setGuildConfig } from './store/configStore.js';
import { handleHelpButton, handleLogsButton, handleServerInfoButton, handleXPButton, handleXPModal } from './handlers/buttonHandlers.js';

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
    ],
    partials: [Partials.Channel],
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

  // Gestionnaire pour les commandes slash et les interactions
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const command = client.slashCommands.get(interaction.commandName);
        if (!command) {
          await interaction.reply({ content: 'Commande introuvable.', flags: MessageFlags.Ephemeral });
          return;
        }
        await command.execute(interaction, client);
      } else if (interaction.isButton()) {
        const id = interaction.customId || '';
        if (id.startsWith('help_')) return handleHelpButton(interaction, client);
        if (id.startsWith('logs_')) return handleLogsButton(interaction, client);
        if (id.startsWith('srv_')) return handleServerInfoButton(interaction, client);
        if (id.startsWith('xp_')) return handleXPButton(interaction, client);
        
        // Gestion des boutons AutoRole via le gestionnaire dédié
        if (id.startsWith('autorole_')) {
          const { handleAutoRoleInteraction } = await import('./modules/autorole/interactions.js');
          return handleAutoRoleInteraction(interaction);
        }
      } else if (interaction.isStringSelectMenu()) {
        // Gestion des menus de sélection via le gestionnaire dédié
        if (interaction.customId.startsWith('autorole_')) {
          const { handleAutoRoleInteraction } = await import('./modules/autorole/interactions.js');
          return handleAutoRoleInteraction(interaction);
        }
      } else if (interaction.isModalSubmit()) {
        if (interaction.customId === 'xp_levels_modal') return handleXPModal(interaction, client);
        
        // Gestion des modales AutoRole via le gestionnaire dédié
        if (interaction.customId.startsWith('autorole_')) {
          const { handleAutoRoleInteraction } = await import('./modules/autorole/interactions.js');
          return handleAutoRoleInteraction(interaction);
        }
      }
    } catch (error) {
      logger.error('Erreur lors du traitement d\'une interaction:', error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('Une erreur est survenue.');
      } else {
        await interaction.reply({ content: 'Une erreur est survenue.', flags: MessageFlags.Ephemeral });
      }
    }
  });

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
