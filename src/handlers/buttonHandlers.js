import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags, EmbedBuilder } from 'discord.js';
import { createInfoEmbed, createSuccessEmbed, createErrorEmbed, Emojis } from '../utils/embeds.js';
import { getPrefix, setLogChannelId, toggleFeature, getGuildConfig, setGuildConfig } from '../store/configStore.js';
import reactionRoleStore from '../store/reactionRoleStore.js';
import reactionRoleLogger from '../utils/reactionRoleLogger.js';
import messageXPHandler from '../utils/messageXpHandler.js';
import voiceXPHandler from '../utils/voiceXpHandler.js';
import XPCalculator from '../utils/xpCalculator.js';
import fs from 'fs';
import path from 'path';

function buildHelpEmbed(client, guildId, page = 0, catPage = 0, commandType = 'slash') {
  const categories = ['admin', 'moderateur', 'utilisateur', 'music'];
  const titles = ['🛠️ Commandes Administrateur', '🛡️ Commandes Modérateur', '👤 Commandes Utilisateur', '🎵 Commandes Musique'];
  const emojiTitle = ['🛠️', '🛡️', '👤', '🎵'];
  const cat = categories[page] || 'utilisateur';

  const isSlash = commandType === 'slash';
  const cmds = isSlash ? Array.from(client.slashCommands?.values?.() || []) : Array.from(client.prefixCommands?.values?.() || []);
  
  const prefix = getPrefix(guildId, '!');
  const commandPrefix = isSlash ? '/' : prefix;
  
  const listLines = cmds
    .filter(c => (c.category || 'utilisateur') === cat)
    .map(c => {
      const name = isSlash ? `/${c.data?.name}` : `${prefix}${c.name}`;
      const desc = isSlash ? (c.data?.description || 'Sans description') : (c.description || 'Sans description');
      const usage = c.usage ? `\n📝 Usage: \`${c.usage.replace(/^!/, prefix)}\`` : '';
      const aliases = !isSlash && c.aliases && c.aliases.length > 0 ? `\n🔗 Alias: \`${c.aliases.map(a => prefix + a).join('`, `')}\`` : '';
      return `**${name}** — ${desc}${usage}${aliases}`;
    });

  // En-tête avec informations sur le type de commande
  const typeInfo = isSlash ? 
    `🔹 **Commandes Slash** - Tapez \`/\` pour commencer\n🔸 *Astuce: Utilisez \`${prefix}help\` pour voir les commandes préfixées*` :
    `🔹 **Commandes Préfixées** - Préfixe actuel: \`${prefix}\`\n🔸 *Astuce: Utilisez \`/help\` pour voir les commandes slash*`;
  
  const pageSize = 6; // Réduire pour un meilleur affichage
  const totalPages = Math.max(1, Math.ceil((listLines.length || 1) / pageSize));
  const safeCatPage = Math.min(Math.max(0, catPage), totalPages - 1);
  const start = safeCatPage * pageSize;
  const end = start + pageSize;
  const current = listLines.slice(start, end);
  
  const descBody = current.length ? current.join('\n\n') : '❌ Aucune commande trouvée dans cette catégorie.';
  
  // Footer avec informations de pagination
  const pageInfo = totalPages > 1 ? `\n\n📄 Page ${safeCatPage + 1}/${totalPages} • ${listLines.length} commande(s) au total` : `\n\n📊 ${listLines.length} commande(s) disponible(s)`;
  
  const full = `${typeInfo}\n\n${descBody}${pageInfo}`;
  
  return { 
    embed: createInfoEmbed(`${titles[page] || '❓ Aide'}`, full, { 
      footer: `💡 Utilisez les boutons ci-dessous pour naviguer • Type: ${commandType.toUpperCase()}`
    }), 
    totalPages, 
    catIndex: page, 
    catPage: safeCatPage,
    commandType 
  };
}



function helpButtons(page = 0, totalPages = 1, catPage = 0, commandType = 'slash') {
  // Navigation entre catégories (gauche/droite)
  const prevCat = new ButtonBuilder()
    .setCustomId(`help_prev_${page}`)
    .setLabel('◀️ Catégorie')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page === 0);
  
  const nextCat = new ButtonBuilder()
    .setCustomId(`help_next_${page}`)
    .setLabel('Catégorie ▶️')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page === 4); // 5 catégories (0-4)
  
  const row1 = new ActionRowBuilder().addComponents(prevCat, nextCat);

  // Boutons de catégories avec style actif/inactif
  const catAdmin = new ButtonBuilder()
    .setCustomId('help_cat_admin')
    .setLabel('Admin')
    .setEmoji('🛠️')
    .setStyle(page === 0 ? ButtonStyle.Primary : ButtonStyle.Secondary);
    
  const catMod = new ButtonBuilder()
    .setCustomId('help_cat_moderateur')
    .setLabel('Modérateur')
    .setEmoji('🛡️')
    .setStyle(page === 1 ? ButtonStyle.Primary : ButtonStyle.Secondary);
    
  const catUser = new ButtonBuilder()
    .setCustomId('help_cat_utilisateur')
    .setLabel('Utilisateur')
    .setEmoji('👤')
    .setStyle(page === 2 ? ButtonStyle.Primary : ButtonStyle.Secondary);
    
  const catMusic = new ButtonBuilder()
    .setCustomId('help_cat_music')
    .setLabel('Musique')
    .setEmoji('🎵')
    .setStyle(page === 3 ? ButtonStyle.Primary : ButtonStyle.Secondary);

  const row2 = new ActionRowBuilder().addComponents(catAdmin, catMod, catUser, catMusic);
  
  const rows = [row1, row2];
  
  // Navigation des pages si nécessaire
  if (totalPages > 1) {
    const pprev = new ButtonBuilder()
      .setCustomId(`help_pg_prev_${page}_${catPage}`)
      .setLabel('◀️ Page')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(catPage === 0);
      
    const indicator = new ButtonBuilder()
      .setCustomId('help_pg_indicator')
      .setLabel(`${catPage + 1}/${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);
      
    const pnext = new ButtonBuilder()
      .setCustomId(`help_pg_next_${page}_${catPage}`)
      .setLabel('Page ▶️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(catPage >= totalPages - 1);
      
    const row3 = new ActionRowBuilder().addComponents(pprev, indicator, pnext);
    rows.push(row3);
  }
  
  // Bouton pour changer de type de commande
  const switchType = new ButtonBuilder()
    .setCustomId(`help_switch_type_${commandType}`)
    .setLabel(commandType === 'slash' ? '🔄 Voir Préfixées' : '🔄 Voir Slash')
    .setStyle(ButtonStyle.Success)
    .setEmoji('🔄');
    
  const row4 = new ActionRowBuilder().addComponents(switchType);
  rows.push(row4);
  
  return rows;
}

export async function handleHelpButton(interaction, client) {
  const id = interaction.customId;
  const member = interaction.member;
  const guildId = interaction.guildId;
  const prefix = getPrefix(guildId, '!');
  
  try {
    // Vérifier les permissions
    const hasAdminPerms = member.permissions.has(PermissionFlagsBits.Administrator);
    const hasModPerms = member.permissions.has(PermissionFlagsBits.ModerateMembers) || 
                       member.permissions.has(PermissionFlagsBits.KickMembers) || 
                       member.permissions.has(PermissionFlagsBits.BanMembers);

    // Importer les fonctions nécessaires
    const { getAvailableCategories, createCategoryEmbed, createNavigationButtons } = 
      await import('../../commands/slashcommands/utilisateur/help.js');

    // Gestion des boutons d'action (non-pagination)
    if (id === 'help_copy_prefix') {
      const prefixEmbed = new EmbedBuilder()
        .setColor('#00ff88')
        .setTitle('📋 Préfixe du serveur')
        .setDescription(`Le préfixe actuel de ce serveur est : \`${prefix}\``)
        .addFields(
          {
            name: '💡 Comment utiliser ?',
            value: `Tapez \`${prefix}help\` pour voir toutes les commandes préfixées\nExemple : \`${prefix}ping\`, \`${prefix}userinfo\``,
            inline: false
          },
          {
            name: '⚙️ Configuration',
            value: `Seuls les administrateurs peuvent modifier le préfixe avec \`/config prefix\``,
            inline: false
          }
        )
        .setFooter({ text: 'Préfixe copié dans votre presse-papiers !' })
        .setTimestamp();

      await interaction.reply({
        embeds: [prefixEmbed],
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (id === 'help_invite_bot') {
      const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
      
      const inviteEmbed = new EmbedBuilder()
        .setColor('#5865f2')
        .setTitle('🤖 Inviter le bot')
        .setDescription(`Ajoutez **${client.user.username}** à votre serveur Discord !`)
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
          {
            name: '🔗 Lien d\'invitation',
            value: `[**Cliquez ici pour inviter ${client.user.username}**](${inviteUrl})`,
            inline: false
          },
          {
            name: '🛡️ Permissions incluses',
            value: '• **Administrateur** (recommandé)\n• Accès à toutes les fonctionnalités\n• Gestion des rôles et canaux\n• Commandes slash et préfixées',
            inline: false
          },
          {
            name: '✨ Fonctionnalités principales',
            value: '• Système de modération complet\n• Musique et divertissement\n• Rôles RGB dynamiques\n• Configuration personnalisée',
            inline: false
          }
        )
        .setFooter({ text: 'Merci de faire confiance à notre bot !' })
        .setTimestamp();

      await interaction.reply({
        embeds: [inviteEmbed],
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (id === 'help_support_server') {
      const supportEmbed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('🆘 Support & Assistance')
        .setDescription('Besoin d\'aide ? Notre équipe est là pour vous accompagner !')
        .addFields(
          {
            name: '💬 Serverinfo Discord',
            value: '[**Rejoindre le serverinfo de support**](https://discord.gg/votre-serveur)\nCommunauté active et support en temps réel',
            inline: false
          },
          {
            name: '📧 Contact direct',
            value: '**Email :** support@votre-bot.com\n**Réponse :** Sous 24h en moyenne',
            inline: true
          },
          {
            name: '🐛 Signaler un bug',
            value: 'Utilisez `/bugreport` ou contactez-nous directement sur le serverinfo',
            inline: true
          },
          {
            name: '💡 Suggestions',
            value: 'Vos idées nous intéressent !\nPartagez-les sur notre serverinfo Discord',
            inline: false
          },
          {
            name: '📚 Documentation',
            value: 'Consultez notre guide complet avec `/help` ou sur notre site web',
            inline: false
          }
        )
        .setFooter({ text: 'Nous sommes là pour vous aider ! 💙' })
        .setTimestamp();

      await interaction.reply({
        embeds: [supportEmbed],
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (id === 'help_refresh') {
      // Actualiser la page actuelle
      const currentEmbed = interaction.message.embeds[0];
      let currentPage = 0;
      if (currentEmbed && currentEmbed.footer && currentEmbed.footer.text) {
        const footerMatch = currentEmbed.footer.text.match(/📄 Page (\d+)\/(\d+)/);
        if (footerMatch) {
          currentPage = parseInt(footerMatch[1]) - 1; // Convertir en index 0-based
        }
      }
      
      const availableCategories = getAvailableCategories(hasAdminPerms, hasModPerms);
      if (currentPage < 0 || currentPage >= availableCategories.length) {
        currentPage = 0;
      }
      
      const category = availableCategories[currentPage];
      const embed = createCategoryEmbed(category, prefix, client, currentPage, availableCategories.length);
      const components = createNavigationButtons(currentPage, availableCategories.length, hasAdminPerms, hasModPerms);
      
      await interaction.update({
        embeds: [embed],
        components: components
      });
      return;
    }

    if (id === 'help_all_commands') {
      // Afficher toutes les commandes dans un embed
      const allCommandsEmbed = new EmbedBuilder()
        .setColor('#00ff88')
        .setTitle('📋 **Toutes les Commandes Disponibles**')
        .setDescription('```yaml\nVoici la liste complète de toutes les commandes disponibles :\n```')
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setTimestamp();

      const availableCategories = getAvailableCategories(hasAdminPerms, hasModPerms);
      
      availableCategories.forEach(categoryKey => {
        const category = CATEGORIES[categoryKey];
        let commandsList = '';
        category.commands.forEach(cmd => {
          commandsList += `• \`/${cmd.name}\` - ${cmd.description}\n`;
        });
        
        allCommandsEmbed.addFields({
          name: `${category.emoji} **${category.name}**`,
          value: commandsList || 'Aucune commande disponible',
          inline: false
        });
      });

      allCommandsEmbed.setFooter({
        text: `💡 Utilisez /help pour plus de détails • ${client.user.username}`,
        iconURL: client.user.displayAvatarURL({ dynamic: true, size: 64 })
      });

      await interaction.reply({
        embeds: [allCommandsEmbed],
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    // Gestion des boutons de navigation première/dernière page
    if (id.startsWith('help_nav_first_')) {
      currentPage = 0;
    } else if (id.startsWith('help_nav_last_')) {
      const availableCategories = getAvailableCategories(hasAdminPerms, hasModPerms);
      currentPage = availableCategories.length - 1;
    }

    // Gestion de la pagination
    const availableCategories = getAvailableCategories(hasAdminPerms, hasModPerms);
    let currentPage = 0;

    // Extraire le numéro de page depuis l'ID du bouton (format: help_nav_next_currentPage_hasAdmin_hasMod)
    if (id.startsWith('help_nav_prev_')) {
      const parts = id.split('_');
      const pageFromId = parseInt(parts[3]) || 0;
      currentPage = Math.max(0, pageFromId - 1);
    } else if (id.startsWith('help_nav_next_')) {
      const parts = id.split('_');
      const pageFromId = parseInt(parts[3]) || 0;
      currentPage = Math.min(availableCategories.length - 1, pageFromId + 1);
    } else if (id.startsWith('help_nav_first_')) {
      currentPage = 0;
    } else if (id.startsWith('help_nav_last_')) {
      currentPage = availableCategories.length - 1;
    }

    // Vérifier que la page est valide
    if (currentPage < 0 || currentPage >= availableCategories.length) {
      currentPage = 0;
    }

    // Créer l'embed pour la page demandée
    const category = availableCategories[currentPage];
    const embed = createCategoryEmbed(category, prefix, client, currentPage, availableCategories.length);
    const components = createNavigationButtons(currentPage, availableCategories.length, hasAdminPerms, hasModPerms);

    // Mettre à jour le message
    await interaction.update({
      embeds: [embed],
      components: components
    });



  } catch (error) {
    // Erreur dans handleHelpButton
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Une erreur est survenue lors du traitement de votre demande.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
}

function buildLogsPanelEmbed(guild, conf) {
  const lines = [
    `${Emojis.log} Salon de logs: ${conf.logChannelId ? '<#' + conf.logChannelId + '>' : 'Non défini'}`,
    `Journalisation: ${conf.logsActive ? 'Activée ✅' : 'Désactivée ❌'}`,
  ];
  return createInfoEmbed('Configuration des logs', lines.join('\n'));
}

function logsButtons(conf) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('logs_set_here').setStyle(ButtonStyle.Primary).setLabel('Définir ici').setEmoji('📝'),
    new ButtonBuilder().setCustomId('logs_unset').setStyle(ButtonStyle.Secondary).setLabel('Retirer').setEmoji('🗑️'),
    new ButtonBuilder().setCustomId('logs_enable').setStyle(ButtonStyle.Success).setLabel('Activer').setEmoji('✅'),
    new ButtonBuilder().setCustomId('logs_disable').setStyle(ButtonStyle.Danger).setLabel('Désactiver').setEmoji('❌')
  );
  return [row];
}

export async function handleLogsButton(interaction, client) {
  const conf = getGuildConfig(interaction.guildId);
  if (interaction.customId === 'logs_set_here') {
    setLogChannelId(interaction.guildId, interaction.channelId);
  } else if (interaction.customId === 'logs_unset') {
    setGuildConfig(interaction.guildId, { logChannelId: null });
  } else if (interaction.customId === 'logs_enable') {
    toggleFeature(interaction.guildId, 'logging', true);
  } else if (interaction.customId === 'logs_disable') {
    toggleFeature(interaction.guildId, 'logging', false);
  }
  const updated = getGuildConfig(interaction.guildId);
  const embed = buildLogsPanelEmbed(interaction.guild, updated);
  await interaction.update({ embeds: [embed], components: logsButtons(updated) });
}

export function buildHelpInitial(client, guildId, commandType = 'slash') {
  const data = buildHelpEmbed(client, guildId, 0, 0, commandType);
  return { embed: data.embed, components: helpButtons(0, data.totalPages, 0, commandType) };
}

export function buildLogsInitial(guild) {
  const conf = getGuildConfig(guild.id);
  const embed = buildLogsPanelEmbed(guild, conf);
  return { embed, components: logsButtons(conf) };
}





// ============ Server Info (interactive) ============

function buildServerInfoButtons(activeKey, page = 0, totalPages = 1) {
  const cats = [
    { key: 'general', emoji: '🏠', label: 'Infos' },
    { key: 'roles', emoji: '🤖', label: 'Rôles' },
    { key: 'emojis', emoji: '😀', label: 'Émojis' },
    { key: 'stickers', emoji: '🪄', label: 'Stickers' },
    { key: 'soundboard', emoji: '🎵', label: 'Soundboard' },
  ];
  const catButtons = cats.map(c => new ButtonBuilder()
    .setCustomId(`srv_cat_${c.key}`)
    .setLabel(c.label)
    .setEmoji(c.emoji)
    .setStyle(c.key === activeKey ? ButtonStyle.Primary : ButtonStyle.Secondary));

  const rows = [];
  // Discord limite à 5 composants par ligne
  const firstRow = new ActionRowBuilder().addComponents(...catButtons.slice(0, 5));
  rows.push(firstRow);
  if (catButtons.length > 5) {
    const secondRow = new ActionRowBuilder().addComponents(...catButtons.slice(5, 10));
    rows.push(secondRow);
  }
  if (totalPages > 1) {
    const prev = new ButtonBuilder().setCustomId(`srv_pg_prev_${activeKey}_${page}`).setLabel('Précédent').setStyle(ButtonStyle.Secondary);
    const indicator = new ButtonBuilder().setCustomId('srv_pg_indicator').setLabel(`Page ${page + 1}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true);
    const next = new ButtonBuilder().setCustomId(`srv_pg_next_${activeKey}_${page}`).setLabel('Suivant').setStyle(ButtonStyle.Secondary);
    rows.push(new ActionRowBuilder().addComponents(prev, indicator, next));
  }
  return rows;
}

async function buildServerInfoData(guild, key = 'general', page = 0) {
  const pageSize = 25; // pour listes (rôles/émojis/stickers)
  const titleMap = {
    general: '🏠 Infos générales',
    members: '👥 Membres',
    roles: '🤖 Rôles',
    emojis: '😀 Émojis',
    stickers: '🪄 Stickers',
    soundboard: '🎵 Soundboard',
  };

  // S’assurer d’avoir les membres pour comptages corrects
  try { await guild.members.fetch(); } catch {}

  const created = `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`;
  const ownerId = guild.ownerId;
  const prefix = getPrefix(guild.id, '!');
  const conf = getGuildConfig(guild.id);
  const roles = guild.roles.cache.sort((a,b)=>b.position-a.position).map(r => r);
  const channels = guild.channels.cache;
  const textCount = channels.filter(c => c.type === 0 /* GuildText */).size;
  const voiceCount = channels.filter(c => c.type === 2 /* GuildVoice */).size;
  const categoryCount = channels.filter(c => c.type === 4 /* GuildCategory */).size;
  const emojis = guild.emojis.cache.map(e => e);
  const emojisStatic = emojis.filter(e => !e.animated);
  const emojisAnim = emojis.filter(e => e.animated);
  const stickers = guild.stickers?.cache ? Array.from(guild.stickers.cache.values()) : [];
  // Soundboard (si non supporté par discord.js v14, gérer en vide)
  let soundCount = 0; let sounds = [];
  try {
    const any = guild.soundboard?.sounds || guild.sounds || [];
    if (Array.isArray(any)) { soundCount = any.length; sounds = any; }
  } catch {}

  const bots = guild.members.cache.filter(m => m.user.bot).size;
  const humans = guild.members.cache.filter(m => !m.user.bot).size;
  const presences = guild.members.cache.map(m => m.presence?.status).filter(Boolean);
  const online = presences.filter(s => s === 'online').length;
  const idle = presences.filter(s => s === 'idle').length;
  const dnd = presences.filter(s => s === 'dnd').length;
  const offline = guild.memberCount - (online + idle + dnd);
  const boostLevel = guild.premiumTier || 0;
  const boosts = guild.premiumSubscriptionCount || 0;

  let desc = '';
  let fields = [];
  let items = [];

  switch (key) {
    case 'general':
      fields = [
        { name: '🪪 Nom & ID', value: `Nom: **${guild.name}**\nID: **${guild.id}**`, inline: false },
        { name: '👑 Propriétaire', value: `<@${ownerId}> (${ownerId})`, inline: true },
        { name: '🚀 Boost', value: `Niveau: **${boostLevel}**\nBoosts: **${boosts}**`, inline: true },
        { name: '💬 Salons', value: `Texte: **${textCount}**\nVocal: **${voiceCount}**\nCatégories: **${categoryCount}**`, inline: true },
        { name: '👥 Membres', value: `Total: **${guild.memberCount}**\nHumains: **${humans}**\nBots: **${bots}**`, inline: true },
        { name: '📶 Statuts', value: `🟢 En ligne: **${online}**\n🌙 Inactif: **${idle}**\n⛔ DND: **${dnd}**\n⚫ Hors ligne: **${offline}**`, inline: true },
        { name: '🔣 Préfixe', value: `\`${prefix}\``, inline: true },
        { name: '📝 Logs', value: `État: **${conf?.logsActive ? 'Activés' : 'Désactivés'}**\nSalon: ${conf?.logChannelId ? '<#' + conf.logChannelId + '>' : 'Non défini'}`, inline: true },
        { name: '📅 Créé le', value: created, inline: false },
      ];
      break;

    case 'roles':
      items = roles.map(r => `<@&${r.id}>`);
      break;
    case 'emojis':
      items = [
        `Statique (${emojisStatic.length}): ${emojisStatic.map(e => e.toString()).join(' ') || 'Aucun'}`,
        `Animé (${emojisAnim.length}): ${emojisAnim.map(e => e.toString()).join(' ') || 'Aucun'}`,
      ];
      break;
    case 'stickers':
      items = stickers.map(s => `• ${s.name} — ${s.id}`);
      break;
    case 'soundboard':
      items = sounds.map((s, i) => `• Son ${i + 1}`);
      desc = soundCount ? `Sons: **${soundCount}**` : 'Soundboard non disponible sur ce serveur.';
      break;
  }

  let totalPages = 1; let paged = [];
  if (items.length) {
    totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const safe = Math.min(Math.max(0, page), totalPages - 1);
    const start = safe * pageSize;
    paged = items.slice(start, start + pageSize);
    page = safe;
  }

  const embed = createInfoEmbed(titleMap[key] || 'Informations', desc || (paged.length ? paged.join('\n') : ''), {});
  embed.setThumbnail?.(guild.iconURL({ size: 256 }));
  if (guild.bannerURL()) embed.setImage?.(guild.bannerURL({ size: 512 }));
  if (fields.length) embed.addFields?.(fields);

  return { embed, components: buildServerInfoButtons(key, page, totalPages) };
}

export async function handleServerInfoButton(interaction, client) {
  const id = interaction.customId;
  const cat = (id.match(/^srv_cat_(\w+)/)?.[1]) || null;
  const pgPrev = id.match(/^srv_pg_prev_(\w+)_(\d+)/);
  const pgNext = id.match(/^srv_pg_next_(\w+)_(\d+)/);
  let key = cat;
  let page = 0;
  if (pgPrev) { key = pgPrev[1]; page = Math.max(0, parseInt(pgPrev[2], 10) - 1); }
  if (pgNext) { key = pgNext[1]; page = parseInt(pgNext[2], 10) + 1; }
  if (!key) key = 'general';
  const data = await buildServerInfoData(interaction.guild, key, page);
  await interaction.update({ embeds: [data.embed], components: data.components });
}

export async function buildServerInfoInitial(guild) {
  return buildServerInfoData(guild, 'general', 0);
}

// ============ Reaction Roles Panel ============

export function buildReactionRolesPanel(guild) {
  const configPath = path.join(process.cwd(), 'data', 'reactionroles.json');
  let config = [];
  
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(data);
    }
  } catch (error) {
    // Erreur lors de la lecture de la configuration des reaction roles
  }

  const guildConfig = config.filter(rule => rule.guildId === guild.id);
  const totalRules = guildConfig.length;
  
  const embed = createInfoEmbed(
    '⚡ Panel de gestion des Reaction Roles',
    `**Serveur:** ${guild.name}\n**Règles actives:** ${totalRules}\n\nUtilisez les boutons ci-dessous pour gérer vos reaction roles.`
  );

  const addButton = new ButtonBuilder()
    .setCustomId('rr_add_rule')
    .setLabel('Ajouter une règle')
    .setEmoji('➕')
    .setStyle(ButtonStyle.Success);

  const listButton = new ButtonBuilder()
    .setCustomId('rr_list_rules')
    .setLabel('Lister les règles')
    .setEmoji('📋')
    .setStyle(ButtonStyle.Primary);

  const logsButton = new ButtonBuilder()
    .setCustomId('rr_toggle_logs')
    .setLabel('Basculer les logs')
    .setEmoji('📝')
    .setStyle(ButtonStyle.Secondary);

  const removeButton = new ButtonBuilder()
    .setCustomId('rr_remove_rule')
    .setLabel('Supprimer une règle')
    .setEmoji('🗑️')
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(addButton, listButton, logsButton, removeButton);
  
  return { embed, components: [row] };
}

export async function handleReactionRoleButton(interaction, client) {
  // Vérification des permissions administrateur
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: '❌ Vous devez être administrateur pour utiliser ce panel.',
      flags: 64 // MessageFlags.Ephemeral
    });
  }

  const customId = interaction.customId;
  const configPath = path.join(process.cwd(), 'data', 'reactionroles.json');
  
  let config = [];
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(data);
    }
  } catch (error) {
    // Erreur lors de la lecture de la configuration
  }

  switch (customId) {
    case 'rr_add_rule':
      const addModal = new ModalBuilder()
        .setCustomId('rr_add_modal')
        .setTitle('Ajouter une règle de reaction role');

      const messageIdInput = new TextInputBuilder()
        .setCustomId('rr_message_id')
        .setLabel('ID du message')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('123456789012345678');

      const emojiInput = new TextInputBuilder()
        .setCustomId('rr_emoji')
        .setLabel('Emoji')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('🎉 ou <:nom:123456789012345678>');

      const roleIdInput = new TextInputBuilder()
        .setCustomId('rr_role_id')
        .setLabel('ID du rôle')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('123456789012345678');

      const descriptionInput = new TextInputBuilder()
        .setCustomId('rr_description')
        .setLabel('Description (optionnel)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder('Description de cette règle');

      const firstRow = new ActionRowBuilder().addComponents(messageIdInput);
      const secondRow = new ActionRowBuilder().addComponents(emojiInput);
      const thirdRow = new ActionRowBuilder().addComponents(roleIdInput);
      const fourthRow = new ActionRowBuilder().addComponents(descriptionInput);

      addModal.addComponents(firstRow, secondRow, thirdRow, fourthRow);
      await interaction.showModal(addModal);
      break;

    case 'rr_list_rules':
      if (config.length === 0) {
        const embed = createInfoEmbed('📋 Liste des règles', 'Aucune règle de reaction role configurée.');
        await interaction.reply({ embeds: [embed], flags: 64 }); // MessageFlags.Ephemeral
        return;
      }

      let rulesList = '';
      let ruleIndex = 1;
      
      for (const rule of config) {
        const channel = interaction.guild.channels.cache.get(rule.id_salon);
        const channelName = channel ? `<#${rule.id_salon}>` : 'Canal introuvable';
        
        rulesList += `**Message ${ruleIndex}:** ${rule.id_message}\n**Canal:** ${channelName}\n**Réactions:**\n`;
        
        for (const reaction of rule.reactions) {
          const role = interaction.guild.roles.cache.get(reaction.id_role);
          const roleName = role ? role.name : 'Rôle introuvable';
          const emoji = reaction.id_emoji;
          rulesList += `  • ${emoji} → ${roleName}\n`;
        }
        rulesList += '\n';
        ruleIndex++;
      }

      const listEmbed = createInfoEmbed('📋 Liste des règles de reaction roles', rulesList);
      await interaction.reply({ embeds: [listEmbed], flags: 64 }); // MessageFlags.Ephemeral
      break;

    case 'rr_toggle_logs':
      const guildConfig = getGuildConfig(interaction.guild.id) || {};
      const currentLogsState = guildConfig.reactionRoles?.logs !== false;
      
      if (!guildConfig.reactionRoles) {
        guildConfig.reactionRoles = {};
      }
      guildConfig.reactionRoles.logs = !currentLogsState;
      
      setGuildConfig(interaction.guild.id, guildConfig);
      
      const logsEmbed = createSuccessEmbed(
        '📝 Logs des reaction roles',
        `Les logs ont été **${!currentLogsState ? 'activés' : 'désactivés'}** pour ce serveur.`
      );
      await interaction.reply({ embeds: [logsEmbed], flags: 64 }); // MessageFlags.Ephemeral
      break;

    case 'rr_remove_rule':
      const removeModal = new ModalBuilder()
        .setCustomId('rr_remove_modal')
        .setTitle('Supprimer une règle de reaction role');

      const removeMessageIdInput = new TextInputBuilder()
        .setCustomId('rr_remove_message_id')
        .setLabel('ID du message')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('123456789012345678');

      const removeEmojiInput = new TextInputBuilder()
        .setCustomId('rr_remove_emoji')
        .setLabel('Emoji')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('🎉 ou <:nom:123456789012345678>');

      const removeFirstRow = new ActionRowBuilder().addComponents(removeMessageIdInput);
      const removeSecondRow = new ActionRowBuilder().addComponents(removeEmojiInput);

      removeModal.addComponents(removeFirstRow, removeSecondRow);
      await interaction.showModal(removeModal);
      break;

    // Nouveaux gestionnaires de modaux pour le système ReactionRole avancé
    case 'rr_add_reaction_modal':
      const addMessageId = interaction.fields.getTextInputValue('rr_add_message_id');
      const addEmoji = interaction.fields.getTextInputValue('rr_add_emoji');
      const addRoleId = interaction.fields.getTextInputValue('rr_add_role_id');

      // Vérifications
      const addRole = interaction.guild.roles.cache.get(addRoleId);
      if (!addRole) {
        const embed = createErrorEmbed('❌ Erreur', 'Rôle introuvable avec cet ID.');
        await interaction.reply({ embeds: [embed], flags: 64 });
        return;
      }

      // Vérifier que le message existe
      let addMessage;
      try {
        addMessage = await interaction.channel.messages.fetch(addMessageId);
      } catch (error) {
        const embed = createErrorEmbed('❌ Erreur', 'Message introuvable dans ce canal.');
        await interaction.reply({ embeds: [embed], flags: 64 });
        return;
      }

      try {
        // Ajouter la réaction role
        await reactionRoleStore.addReactionRole(
          interaction.guild.id,
          addMessageId,
          interaction.channel.id,
          addEmoji,
          addRoleId
        );

        // Ajouter la réaction au message
        try {
          await addMessage.react(addEmoji);
        } catch (error) {
          console.warn('Impossible d\'ajouter la réaction au message:', error);
        }

        const embed = createSuccessEmbed(
          '✅ ReactionRole Ajouté',
          `**Message:** [Aller au message](${addMessage.url})\n**Emoji:** ${addEmoji}\n**Rôle:** ${addRole}`
        );

        await interaction.reply({ embeds: [embed], flags: 64 });
        
        // Log de l'action
        try {
          await reactionRoleLogger.logReactionAdded(interaction.guild, interaction.user, addRole, addMessage, addEmoji);
        } catch (logError) {
          // Erreur lors du logging
        }
      } catch (error) {
        // Erreur lors de l'ajout du ReactionRole
        const embed = createErrorEmbed('❌ Erreur', 'Impossible d\'ajouter le ReactionRole. Vérifiez que cette configuration n\'existe pas déjà.');
        await interaction.reply({ embeds: [embed], flags: 64 });
      }
      break;

    case 'rr_remove_reaction_modal':
      const removeMessageId = interaction.fields.getTextInputValue('rr_remove_message_id');
      const removeEmoji = interaction.fields.getTextInputValue('rr_remove_emoji');

      try {
        const success = await reactionRoleStore.removeReactionRole(interaction.guild.id, removeMessageId, removeEmoji);

        if (!success) {
          const embed = createErrorEmbed('❌ Erreur', 'Aucune configuration trouvée pour ce message et cet emoji.');
          await interaction.reply({ embeds: [embed], flags: 64 });
          return;
        }

        // Supprimer la réaction du message si possible
        try {
          const message = await interaction.channel.messages.fetch(removeMessageId);
          const reaction = message.reactions.cache.find(r => r.emoji.name === removeEmoji || r.emoji.toString() === removeEmoji);
          if (reaction) {
            await reaction.users.remove(interaction.client.user);
          }
        } catch (error) {
          console.warn('Impossible de supprimer la réaction du message:', error);
        }

        const embed = createSuccessEmbed(
          '✅ ReactionRole Supprimé',
          `**Message ID:** ${removeMessageId}\n**Emoji:** ${removeEmoji}`
        );

        await interaction.reply({ embeds: [embed], flags: 64 });
        
        // Log de l'action (on ne peut pas récupérer le rôle car il a été supprimé)
        try {
          const message = await interaction.channel.messages.fetch(removeMessageId);
          await reactionRoleLogger.logReactionRemoved(interaction.guild, interaction.user, null, message, removeEmoji);
        } catch (logError) {
          // Erreur lors du logging
        }
      } catch (error) {
        // Erreur lors de la suppression du ReactionRole
        const embed = createErrorEmbed('❌ Erreur', 'Impossible de supprimer le ReactionRole.');
        await interaction.reply({ embeds: [embed], flags: 64 });
      }
      break;

    case 'rr_config_logs_modal':
      const channelId = interaction.fields.getTextInputValue('rr_logs_channel_id').trim();

      if (channelId && channelId !== '') {
        const channel = interaction.guild.channels.cache.get(channelId);
        if (!channel) {
          const embed = createErrorEmbed('❌ Erreur', 'Canal introuvable avec cet ID.');
          await interaction.reply({ embeds: [embed], flags: 64 });
          return;
        }

        await reactionRoleStore.setLogsChannel(interaction.guild.id, channelId);
        
        const embed = createSuccessEmbed(
          '📍 Canal de Logs Configuré',
          `Les logs seront envoyés dans ${channel}`
        );
        
        await interaction.reply({ embeds: [embed], flags: 64 });
        await reactionRoleLogger.logLogsConfigured(interaction.guild, interaction.user, channel);
      } else {
        await reactionRoleStore.setLogsChannel(interaction.guild.id, null);
        
        const embed = createSuccessEmbed(
          '📍 Canal de Logs Désactivé',
          'Les logs ont été désactivés'
        );
        
        await interaction.reply({ embeds: [embed], flags: 64 });
        await reactionRoleLogger.logLogsConfigured(interaction.guild, interaction.user, null);
      }
      break;
  }
}

export async function handleReactionRoleModal(interaction, client) {
  // Vérification des permissions administrateur
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: '❌ Vous devez être administrateur pour utiliser cette fonctionnalité.',
      flags: 64 // MessageFlags.Ephemeral
    });
  }

  const customId = interaction.customId;
  const configPath = path.join(process.cwd(), 'data', 'reactionroles.json');
  
  let config = [];
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(data);
    }
  } catch (error) {
    // Erreur lors de la lecture de la configuration
  }

  switch (customId) {
    case 'rr_add_modal':
      const messageId = interaction.fields.getTextInputValue('rr_message_id');
      const emoji = interaction.fields.getTextInputValue('rr_emoji');
      const roleId = interaction.fields.getTextInputValue('rr_role_id');
      const description = interaction.fields.getTextInputValue('rr_description') || '';

      // Vérifications
      const guild = interaction.guild;
      const role = guild.roles.cache.get(roleId);
      
      if (!role) {
        const embed = createErrorEmbed('❌ Erreur', 'Le rôle spécifié est introuvable.');
        await interaction.reply({ embeds: [embed], flags: 64 }); // MessageFlags.Ephemeral
        return;
      }

      // Vérifier si le message existe
      try {
        const channel = interaction.channel;
        const message = await channel.messages.fetch(messageId);
        
        // Ajouter la réaction au message
        await message.react(emoji);
      } catch (error) {
        const embed = createErrorEmbed('❌ Erreur', 'Impossible de trouver le message ou d\'ajouter la réaction.');
        await interaction.reply({ embeds: [embed], flags: 64 }); // MessageFlags.Ephemeral
        return;
      }

      // Chercher une règle existante pour ce message
      let existingRule = config.find(rule => 
        rule.id_salon === interaction.channel.id && 
        rule.id_message === messageId
      );

      // Vérifier si l'emoji existe déjà dans cette règle
      if (existingRule) {
        const existingReaction = existingRule.reactions.find(r => r.id_emoji === emoji);
        if (existingReaction) {
          const embed = createErrorEmbed('❌ Erreur', 'Une règle avec ce message et cet emoji existe déjà.');
          await interaction.reply({ embeds: [embed], flags: 64 }); // MessageFlags.Ephemeral
          return;
        }
        
        // Ajouter la nouvelle réaction à la règle existante
        existingRule.reactions.push({
          id_emoji: emoji,
          id_role: roleId
        });
      } else {
        // Créer une nouvelle règle
        const newRule = {
          id_salon: interaction.channel.id,
          id_message: messageId,
          reactions: [{
            id_emoji: emoji,
            id_role: roleId
          }]
        };
        config.push(newRule);
      }

      // Sauvegarder la configuration
      try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        const embed = createSuccessEmbed(
          '✅ Règle ajoutée',
          `La règle de reaction role a été ajoutée avec succès !\n\n**Message:** ${messageId}\n**Emoji:** ${emoji}\n**Rôle:** ${role.name}\n**Canal:** <#${interaction.channel.id}>`
        );
        
        await interaction.reply({ embeds: [embed], flags: 64 }); // MessageFlags.Ephemeral

        // Log de l'action
        const guildConfig = getGuildConfig(guild.id) || {};
        if (guildConfig.reactionRoles?.logs !== false && guildConfig.logChannelId) {
          const logEmbed = createInfoEmbed(
            '📝 Reaction Role - Règle ajoutée',
            `**Utilisateur:** ${interaction.user}\n**Message:** [Aller au message](https://discord.com/channels/${guild.id}/${interaction.channel.id}/${messageId})\n**Emoji:** ${emoji}\n**Rôle:** ${role}\n**Canal:** <#${interaction.channel.id}>`
          );
          
          const logChannel = guild.channels.cache.get(guildConfig.logChannelId);
          if (logChannel) {
            await logChannel.send({ embeds: [logEmbed] });
          }
        }
      } catch (error) {
        // Erreur lors de la sauvegarde
        const embed = createErrorEmbed('❌ Erreur', 'Impossible de sauvegarder la configuration.');
        await interaction.reply({ embeds: [embed], flags: 64 }); // MessageFlags.Ephemeral
      }
      break;

    case 'rr_remove_modal':
      const removeMessageId = interaction.fields.getTextInputValue('rr_remove_message_id');
      const removeEmoji = interaction.fields.getTextInputValue('rr_remove_emoji');

      // Trouver la règle à supprimer
      let ruleFound = false;
      let removedRole = null;
      
      for (let i = 0; i < config.length; i++) {
        const rule = config[i];
        if (rule.id_message === removeMessageId) {
          // Chercher l'emoji dans les réactions
          const reactionIndex = rule.reactions.findIndex(reaction => reaction.id_emoji === removeEmoji);
          
          if (reactionIndex !== -1) {
            removedRole = interaction.guild.roles.cache.get(rule.reactions[reactionIndex].id_role);
            
            // Supprimer cette réaction spécifique
            rule.reactions.splice(reactionIndex, 1);
            
            // Si plus aucune réaction, supprimer la règle entière
            if (rule.reactions.length === 0) {
              config.splice(i, 1);
            }
            
            ruleFound = true;
            break;
          }
        }
      }

      if (!ruleFound) {
        const embed = createErrorEmbed('❌ Erreur', 'Aucune règle trouvée avec ce message et cet emoji.');
        await interaction.reply({ embeds: [embed], flags: 64 }); // MessageFlags.Ephemeral
        return;
      }

      // Sauvegarder la configuration
      try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        const embed = createSuccessEmbed(
          '✅ Règle supprimée',
          `La règle de reaction role a été supprimée avec succès !\n\n**Message:** ${removeMessageId}\n**Emoji:** ${removeEmoji}\n**Rôle:** ${removedRole ? removedRole.name : 'Rôle introuvable'}`
        );
        
        await interaction.reply({ embeds: [embed], flags: 64 }); // MessageFlags.Ephemeral

        // Log de l'action
        const guildConfig = getGuildConfig(interaction.guild.id) || {};
        if (guildConfig.reactionRoles?.logs !== false) {
          const logEmbed = createInfoEmbed(
            '📝 Reaction Role - Règle supprimée',
            `**Utilisateur:** ${interaction.user}\n**Message:** [Aller au message](https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id}/${removeMessageId})\n**Emoji:** ${removeEmoji}\n**Rôle:** ${removedRole ? removedRole.name : 'Rôle introuvable'}\n**Canal:** <#${interaction.channel.id}>`
          );
          
          const logChannel = interaction.guild.channels.cache.get(guildConfig.logChannelId);
          if (logChannel) {
            await logChannel.send({ embeds: [logEmbed] });
          }
        }
      } catch (error) {
        // Erreur lors de la sauvegarde
        const embed = createErrorEmbed('❌ Erreur', 'Impossible de sauvegarder la configuration.');
        await interaction.reply({ embeds: [embed], flags: 64 }); // MessageFlags.Ephemeral
      }
      break;

    // Nouveaux gestionnaires pour le système ReactionRole avancé
    case 'rr_add_reaction':
      const addReactionModal = new ModalBuilder()
        .setCustomId('rr_add_reaction_modal')
        .setTitle('➕ Ajouter un ReactionRole');

      const addMsgIdInput = new TextInputBuilder()
        .setCustomId('rr_add_message_id')
        .setLabel('ID du message')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('123456789012345678');

      const addEmojiInput = new TextInputBuilder()
        .setCustomId('rr_add_emoji')
        .setLabel('Emoji')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('🎉 ou <:nom:123456789012345678>');

      const addRoleIdInput = new TextInputBuilder()
        .setCustomId('rr_add_role_id')
        .setLabel('ID du rôle')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('123456789012345678');

      const addRow1 = new ActionRowBuilder().addComponents(addMsgIdInput);
      const addRow2 = new ActionRowBuilder().addComponents(addEmojiInput);
      const addRow3 = new ActionRowBuilder().addComponents(addRoleIdInput);

      addReactionModal.addComponents(addRow1, addRow2, addRow3);
      await interaction.showModal(addReactionModal);
      break;

    case 'rr_remove_reaction':
      const removeReactionModal = new ModalBuilder()
        .setCustomId('rr_remove_reaction_modal')
        .setTitle('➖ Supprimer un ReactionRole');

      const removeMsgIdInput = new TextInputBuilder()
        .setCustomId('rr_remove_message_id')
        .setLabel('ID du message')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('123456789012345678');

      const removeEmojiInput = new TextInputBuilder()
        .setCustomId('rr_remove_emoji')
        .setLabel('Emoji')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('🎉 ou <:nom:123456789012345678>');

      const removeRow1 = new ActionRowBuilder().addComponents(removeMsgIdInput);
      const removeRow2 = new ActionRowBuilder().addComponents(removeEmojiInput);

      removeReactionModal.addComponents(removeRow1, removeRow2);
      await interaction.showModal(removeReactionModal);
      break;

    case 'rr_list_reactions':
      const reactionRoles = await reactionRoleStore.getAllReactionRoles(interaction.guild.id);

      if (reactionRoles.length === 0) {
        const embed = createInfoEmbed('📋 Liste des ReactionRoles', 'Aucune configuration ReactionRole trouvée.');
        await interaction.reply({ embeds: [embed], flags: 64 });
        return;
      }

      let listDescription = '';
      for (const rr of reactionRoles.slice(0, 10)) {
        const status = rr.globalEnabled && rr.messageEnabled && rr.reactionEnabled ? '✅' : '❌';
        const role = interaction.guild.roles.cache.get(rr.roleId);
        const roleName = role ? role.name : 'Rôle supprimé';
        const channel = interaction.guild.channels.cache.get(rr.channelId);
        const channelName = channel ? channel.name : 'Canal supprimé';
        
        listDescription += `${status} **${rr.emoji}** → **${roleName}**\n`;
        listDescription += `   📝 Message: \`${rr.messageId}\` | 📍 #${channelName}\n\n`;
      }

      if (reactionRoles.length > 10) {
        listDescription += `... et ${reactionRoles.length - 10} autre(s)`;
      }

      const listEmbed = createInfoEmbed('📋 Liste des ReactionRoles', listDescription);
      await interaction.reply({ embeds: [listEmbed], flags: 64 });
      break;

    case 'rr_toggle_system':
      const enabled = await reactionRoleStore.toggleGuildEnabled(interaction.guild.id);
      
      const toggleEmbed = createSuccessEmbed(
        `⚙️ Système ${enabled ? 'Activé' : 'Désactivé'}`,
        `Le système ReactionRole a été ${enabled ? 'activé' : 'désactivé'} pour ce serveur.`
      );
      
      await interaction.reply({ embeds: [toggleEmbed], flags: 64 });
      await reactionRoleLogger.logSystemToggled(interaction.guild, interaction.user, enabled);
      break;

    case 'rr_config_logs':
      const configLogsModal = new ModalBuilder()
        .setCustomId('rr_config_logs_modal')
        .setTitle('📝 Configuration des Logs');

      const channelIdInput = new TextInputBuilder()
        .setCustomId('rr_logs_channel_id')
        .setLabel('ID du canal de logs (vide pour désactiver)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder('123456789012345678');

      const configLogsRow = new ActionRowBuilder().addComponents(channelIdInput);
      configLogsModal.addComponents(configLogsRow);
      await interaction.showModal(configLogsModal);
      break;

    case 'rr_toggle_logs':
      const logsEnabled = await reactionRoleStore.toggleLogs(interaction.guild.id);
      
      const logsToggleEmbed = createSuccessEmbed(
        `📝 Logs ${logsEnabled ? 'Activés' : 'Désactivés'}`,
        `Les logs ReactionRole ont été ${logsEnabled ? 'activés' : 'désactivés'}.`
      );
      
      await interaction.reply({ embeds: [logsToggleEmbed], flags: 64 });
      await reactionRoleLogger.logLogsToggled(interaction.guild, interaction.user, logsEnabled);
      break;

    case 'rr_reset_config':
      const resetEmbed = createErrorEmbed(
        '⚠️ Confirmation de Reset',
        'Êtes-vous sûr de vouloir supprimer **TOUTE** la configuration ReactionRole ?\n\n**Cette action est irréversible !**'
      );

      const confirmButton = new ButtonBuilder()
        .setCustomId('rr_confirm_reset')
        .setLabel('✅ Confirmer')
        .setStyle(ButtonStyle.Danger);

      const cancelButton = new ButtonBuilder()
        .setCustomId('rr_cancel_reset')
        .setLabel('❌ Annuler')
        .setStyle(ButtonStyle.Secondary);

      const resetRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

      await interaction.reply({
        embeds: [resetEmbed],
        components: [resetRow],
        flags: 64
      });
      break;

    case 'rr_confirm_reset':
      await reactionRoleStore.resetGuildConfig(interaction.guild.id);
      
      const resetSuccessEmbed = createSuccessEmbed(
        '🔄 Configuration Réinitialisée',
        'Toute la configuration ReactionRole a été supprimée avec succès.'
      );
      
      await interaction.update({
        embeds: [resetSuccessEmbed],
        components: []
      });
      
      // Log du reset (on ne peut pas récupérer les stats avant suppression)
      await reactionRoleLogger.logSystemReset(interaction.guild, interaction.user, 0, 0);
      break;

    case 'rr_cancel_reset':
      const cancelEmbed = createInfoEmbed(
        '❌ Reset Annulé',
        'La réinitialisation a été annulée. Votre configuration est préservée.'
      );
      
      await interaction.update({
        embeds: [cancelEmbed],
        components: []
      });
      break;
  }

  // Gestionnaires pour les boutons de gestion spécifique des réactions
  if (interaction.customId.startsWith('rr_toggle_message_')) {
    const [messageId, emoji] = interaction.customId.replace('rr_toggle_message_', '').split(':');
    
    try {
      const reactionRole = await reactionRoleStore.getReactionRole(interaction.guild.id, messageId, emoji);
      if (!reactionRole) {
        return interaction.reply({
          embeds: [createErrorEmbed('❌ Erreur', 'Cette configuration n\'existe plus.')],
          flags: 64
        });
      }

      const newStatus = !reactionRole.messageEnabled;
      await reactionRoleStore.updateReactionRole(interaction.guild.id, messageId, emoji, {
        messageEnabled: newStatus
      });

      const embed = createSuccessEmbed(
        '✅ Statut mis à jour',
        `Le message a été ${newStatus ? 'activé' : 'désactivé'} pour cette réaction.`
      );

      await interaction.reply({ embeds: [embed], flags: 64 });
      // Log du toggle de message
      try {
        const message = await interaction.channel.messages.fetch(messageId);
        await reactionRoleLogger.logMessageToggled(interaction.guild, interaction.user, message, newStatus);
      } catch (logError) {
        // Erreur lors du logging
      }
    } catch (error) {
      // Erreur toggle message
      await interaction.reply({
        embeds: [createErrorEmbed('❌ Erreur', 'Une erreur est survenue.')],
        flags: 64
      });
    }
    return;
  }

  if (interaction.customId.startsWith('rr_toggle_reaction_')) {
    const [messageId, emoji] = interaction.customId.replace('rr_toggle_reaction_', '').split(':');
    
    try {
      const reactionRole = await reactionRoleStore.getReactionRole(interaction.guild.id, messageId, emoji);
      if (!reactionRole) {
        return interaction.reply({
          embeds: [createErrorEmbed('❌ Erreur', 'Cette configuration n\'existe plus.')],
          flags: 64
        });
      }

      const newStatus = !reactionRole.reactionEnabled;
      await reactionRoleStore.updateReactionRole(interaction.guild.id, messageId, emoji, {
        reactionEnabled: newStatus
      });

      const embed = createSuccessEmbed(
        '✅ Statut mis à jour',
        `La réaction a été ${newStatus ? 'activée' : 'désactivée'}.`
      );

      await interaction.reply({ embeds: [embed], flags: 64 });
      // Log du toggle de réaction
      try {
        const message = await interaction.channel.messages.fetch(messageId);
        const role = interaction.guild.roles.cache.get(reactionRole.roleId);
        await reactionRoleLogger.logReactionToggled(interaction.guild, interaction.user, role, message, emoji, newStatus);
      } catch (logError) {
        // Erreur lors du logging
      }
    } catch (error) {
      // Erreur toggle reaction
      await interaction.reply({
        embeds: [createErrorEmbed('❌ Erreur', 'Une erreur est survenue.')],
        flags: 64
      });
    }
    return;
  }

  if (interaction.customId.startsWith('rr_delete_specific_')) {
    const [messageId, emoji] = interaction.customId.replace('rr_delete_specific_', '').split(':');
    
    try {
      const reactionRole = await reactionRoleStore.getReactionRole(interaction.guild.id, messageId, emoji);
      if (!reactionRole) {
        return interaction.reply({
          embeds: [createErrorEmbed('❌ Erreur', 'Cette configuration n\'existe plus.')],
          flags: 64
        });
      }

      await reactionRoleStore.removeReactionRole(interaction.guild.id, messageId, emoji);

      const embed = createSuccessEmbed(
        '✅ Réaction supprimée',
        `La configuration pour ${emoji} a été supprimée avec succès.`
      );

      await interaction.reply({ embeds: [embed], flags: 64 });
      // Log de la suppression
      try {
        const message = await interaction.channel.messages.fetch(messageId);
        const role = interaction.guild.roles.cache.get(reactionRole.roleId);
        await reactionRoleLogger.logReactionRemoved(interaction.guild, interaction.user, role, message, emoji);
      } catch (logError) {
        // Erreur lors du logging
      }
    } catch (error) {
      // Erreur delete specific
      await interaction.reply({
        embeds: [createErrorEmbed('❌ Erreur', 'Une erreur est survenue.')],
        flags: 64
      });
    }
    return;
  }
}

export async function handleReactionRoleSelectMenu(interaction, client) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
            embeds: [createErrorEmbed('❌ Permissions insuffisantes', 'Vous devez être administrateur pour utiliser cette fonctionnalité.')],
            flags: 64
        });
    }

    try {
        const selectedValue = interaction.values[0];
        const [messageId, emoji] = selectedValue.split(':');
        
        // Récupérer les informations de la réaction
        const reactionRole = await reactionRoleStore.getReactionRole(interaction.guild.id, messageId, emoji);
        
        if (!reactionRole) {
            return interaction.reply({
                embeds: [createErrorEmbed('❌ Erreur', 'Cette configuration de réaction n\'existe plus.')],
                flags: 64
            });
        }

        // Créer l'embed avec les détails de la réaction
        const role = interaction.guild.roles.cache.get(reactionRole.roleId);
        const channel = interaction.guild.channels.cache.get(reactionRole.channelId);
        
        const embed = createInfoEmbed(
            '🔧 Gestion de la réaction',
            `**Emoji :** ${emoji}\n` +
            `**Rôle :** ${role ? role.toString() : 'Rôle supprimé'}\n` +
            `**Message ID :** ${messageId}\n` +
            `**Canal :** ${channel ? channel.toString() : 'Canal supprimé'}\n` +
            `**Statut Global :** ${reactionRole.globalEnabled ? '✅ Activé' : '❌ Désactivé'}\n` +
            `**Statut Message :** ${reactionRole.messageEnabled ? '✅ Activé' : '❌ Désactivé'}\n` +
            `**Statut Réaction :** ${reactionRole.reactionEnabled ? '✅ Activé' : '❌ Désactivé'}`
        );

        // Créer les boutons d'action
        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`rr_toggle_message_${messageId}:${emoji}`)
                    .setLabel(reactionRole.messageEnabled ? 'Désactiver Message' : 'Activer Message')
                    .setStyle(reactionRole.messageEnabled ? ButtonStyle.Danger : ButtonStyle.Success)
                    .setEmoji(reactionRole.messageEnabled ? '❌' : '✅'),
                new ButtonBuilder()
                    .setCustomId(`rr_toggle_reaction_${messageId}:${emoji}`)
                    .setLabel(reactionRole.reactionEnabled ? 'Désactiver Réaction' : 'Activer Réaction')
                    .setStyle(reactionRole.reactionEnabled ? ButtonStyle.Danger : ButtonStyle.Success)
                    .setEmoji(reactionRole.reactionEnabled ? '❌' : '✅'),
                new ButtonBuilder()
                    .setCustomId(`rr_delete_specific_${messageId}:${emoji}`)
                    .setLabel('Supprimer')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️')
            );

        await interaction.reply({
            embeds: [embed],
            components: [actionButtons],
            flags: 64
        });

    } catch (error) {
        // Erreur dans handleReactionRoleSelectMenu
        await interaction.reply({
            embeds: [createErrorEmbed('❌ Erreur', 'Une erreur est survenue lors de la gestion de la sélection.')],
            flags: 64
        });
    }
}

// Handler pour les boutons userinfo
export async function handleUserInfoButton(interaction, client) {
    try {
        const customId = interaction.customId;
        
        // Extraire les informations du customId
        const parts = customId.split('_');
        const page = parts[1]; // person ou social
        const userId = parts[2];
        
        // Récupérer l'utilisateur et le membre
        const targetUser = await client.users.fetch(userId).catch((err) => {
            return null;
        });
        if (!targetUser) {
            return interaction.reply({
                embeds: [createErrorEmbed('Erreur', 'Utilisateur introuvable.')],
                flags: MessageFlags.Ephemeral
            });
        }
        
        const member = await interaction.guild.members.fetch(userId).catch((err) => {
            return null;
        });
        if (!member) {
            return interaction.reply({
                embeds: [createErrorEmbed('Erreur', 'Cet utilisateur n\'est pas membre de ce serveur.')],
                flags: MessageFlags.Ephemeral
            });
        }
        
        // Créer le nouvel embed et les nouveaux boutons
        const embed = await createUserInfoEmbed(member, page, interaction.user.id);
        
        const components = createUserInfoButtons(page, userId);
        
        await interaction.update({
            embeds: [embed],
            components: components
        });
        
    } catch (error) {
        if (interaction.deferred || interaction.replied) {
            return interaction.editReply({
                embeds: [createErrorEmbed('Erreur', 'Une erreur est survenue lors de la navigation.')],
                components: []
            });
        }
        return interaction.reply({
            embeds: [createErrorEmbed('Erreur', 'Une erreur est survenue lors de la navigation.')],
            flags: MessageFlags.Ephemeral
        });
    }
}

// Fonctions utilitaires pour userinfo (importées depuis les commandes)
async function createUserInfoEmbed(member, page, viewerId = null) {
    const user = member.user;
    const guild = member.guild;
    
    // Couleur basée sur le rôle le plus haut ou bleu par défaut
    const highestRole = member.roles.highest;
    const embedColor = highestRole.color !== 0 ? highestRole.color : 0x5865F2; // Discord Blurple
    
    switch (page) {
        case 'person': // Page Informations utilisateur
            return createUserInfoPage(member, embedColor);
        case 'xp': // Page XP
            return await createXPPage(member, embedColor);
        case 'social': // Page Réseaux sociaux
            return createSocialPage(member, embedColor, viewerId);
        default:
            return createUserInfoPage(member, embedColor);
    }
}

// Page 1: Informations utilisateur
function createUserInfoPage(member, color) {
    const user = member.user;
    
    // Calcul du temps écoulé depuis la création du compte
    const accountAge = getTimeAgo(user.createdAt);
    const joinAge = getTimeAgo(member.joinedAt);
    
    // Status et activité
    const presence = member.presence;
    const status = getStatusText(presence?.status);
    const activity = getActivityText(presence?.activities);
    
    // Nombre de rôles (sans @everyone)
    const roleCount = member.roles.cache.size - 1;
    
    // Permissions spéciales
    const isAdmin = member.permissions.has('Administrator');
    const isModerator = member.permissions.has('ManageMessages') || member.permissions.has('KickMembers');
    
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${Emojis.profile} **Profil de ${user.username}**`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setDescription(`${Emojis.clipboard} **Informations générales**\n\`\`\`yaml\nPseudo    : "${user.tag}"\nID        : ${user.id}\nType      : ${user.bot ? 'Bot' : 'Utilisateur'}\nStatut    : ${getStatusText(presence?.status)}\`\`\``)
        .addFields(
            { 
                name: `${Emojis.calendar} **Dates importantes**`, 
                value: `\`\`\`diff\n+ ${Emojis.birthday} Compte créé\n  ${accountAge}\n\n+ ${Emojis.join} Rejoint le serveur\n  ${joinAge}\`\`\``, 
                inline: false 
            },
            { 
                name: `${Emojis.roles} **Rôles & Permissions**`, 
                value: `**${Emojis.progress} Rôles :** \`${roleCount} rôle${roleCount > 1 ? 's' : ''}\`\n\n**${Emojis.permissions} Niveau :**\n${isAdmin ? `${Emojis.crown} \`ADMINISTRATEUR\`` : isModerator ? `${Emojis.moderator} \`MODÉRATEUR\`` : `${Emojis.member} \`MEMBRE\``}`, 
                inline: true 
            },
            { 
                name: `${Emojis.phone} **Statut & Activité**`, 
                value: `**${Emojis.status} Présence :**\n\`${getStatusText(presence?.status)}\`\n\n**${Emojis.activity} Activité :**\n${activity === 'Aucune activité' ? `\`${activity}\`` : `**${activity}**`}`, 
                inline: true 
            }
        )
        .setFooter({ text: `${Emojis.search} Informations détaillées • Page Personne • ${new Date().toLocaleString('fr-FR')}` })
        .setTimestamp();
    
    return embed;
}

// Page 2: Réseaux sociaux
function createSocialPage(member, color, viewerId = null) {
    const user = member.user;
    const isOwnProfile = viewerId === user.id;
    
    // Lire les données sociales depuis le fichier JSON
    const socialsPath = path.join(process.cwd(), 'json', 'socials.json');
    let socialData = {};
    
    try {
        if (fs.existsSync(socialsPath)) {
            const data = fs.readFileSync(socialsPath, 'utf8');
            const allSocials = JSON.parse(data);
            socialData = allSocials[user.id] || {};
        }
    } catch (error) {
        // Erreur lors de la lecture des données sociales
    }
    
    // Configuration des réseaux sociaux supportés
    const supportedNetworks = {
        twitter: { emoji: '🐦', name: 'Twitter' },
        instagram: { emoji: '📸', name: 'Instagram' },
        twitch: { emoji: '🎮', name: 'Twitch' },
        github: { emoji: '💻', name: 'GitHub' },
        youtube: { emoji: '📺', name: 'YouTube' },
        tiktok: { emoji: '🎵', name: 'TikTok' },
        discord: { emoji: '💬', name: 'Discord' },
        linkedin: { emoji: '💼', name: 'LinkedIn' }
    };
    
    const embed = new EmbedBuilder()
        .setColor('#9b59b6') // Couleur violette comme demandé
        .setTitle(`🌐 Réseaux sociaux de ${user.username}`)
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }));
    
    // Créer la description avec les réseaux
    let description = '';
    
    for (const [networkKey, networkConfig] of Object.entries(supportedNetworks)) {
        const socialDataNetwork = socialData[networkKey];
        
        if (socialDataNetwork && (isOwnProfile || socialDataNetwork.privacy === 'public')) {
            const privacyText = socialDataNetwork.privacy === 'private' ? ' (Privé)' : ' (Public)';
            description += `${networkConfig.emoji} **${networkConfig.name}** : @${socialDataNetwork.username}${isOwnProfile ? privacyText : ''}\n`;
        } else {
            description += `${networkConfig.emoji} **${networkConfig.name}** : Aucun\n`;
        }
    }
    
    embed.setDescription(description);
    embed.setFooter({ text: 'Utilise /social panel pour configurer tes réseaux' });
    
    return embed;
}

// Fonction pour créer les boutons de navigation
function createUserInfoButtons(currentPage, userId) {
    const personButton = new ButtonBuilder()
        .setCustomId(`userinfo_person_${userId}`)
        .setLabel('👤 Personne')
        .setStyle(currentPage === 'person' ? ButtonStyle.Primary : ButtonStyle.Secondary);
    
    const xpButton = new ButtonBuilder()
        .setCustomId(`userinfo_xp_${userId}`)
        .setLabel('⭐ XP')
        .setStyle(currentPage === 'xp' ? ButtonStyle.Primary : ButtonStyle.Secondary);
    
    const socialButton = new ButtonBuilder()
        .setCustomId(`userinfo_social_${userId}`)
        .setLabel('🌐 Réseaux sociaux')
        .setStyle(currentPage === 'social' ? ButtonStyle.Primary : ButtonStyle.Secondary);
    
    return [new ActionRowBuilder().addComponents(personButton, xpButton, socialButton)];
}

// Fonctions utilitaires
function getTimeAgo(date) {
    // Formatage de la date complète avec l'heure
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Paris'
    };
    const fullDate = date.toLocaleDateString('fr-FR', options);
    
    // Calcul du temps relatif
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    
    let relativeTime;
    if (diffYears > 0) {
        const remainingMonths = Math.floor((diffDays % 365) / 30);
        relativeTime = `il y a ${diffYears} an${diffYears > 1 ? 's' : ''}${remainingMonths > 0 ? ` et ${remainingMonths} mois` : ''}`;
    } else if (diffMonths > 0) {
        const remainingDays = diffDays % 30;
        relativeTime = `il y a ${diffMonths} mois${remainingDays > 0 ? ` et ${remainingDays} jour${remainingDays > 1 ? 's' : ''}` : ''}`;
    } else if (diffDays > 0) {
        relativeTime = `il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    } else {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        relativeTime = `il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    }
    
    // Retourner la date complète avec le temps relatif
    return `${fullDate}\n(${relativeTime})`;
}

function getStatusText(status) {
    switch (status) {
        case 'online': return '🟢 En ligne';
        case 'idle': return '🌙 Inactif';
        case 'dnd': return '⛔ Ne pas déranger';
        case 'offline':
        default: return '⚫ Hors ligne';
    }
}

function getActivityText(activities) {
    if (!activities || activities.length === 0) {
        return 'Aucune activité';
    }
    
    const activity = activities[0];
    switch (activity.type) {
        case 0: return `🎮 Joue à ${activity.name}`;
        case 1: return `📺 Regarde ${activity.name}`;
        case 2: return `🎵 Écoute ${activity.name}`;
        case 3: return `📺 Stream ${activity.name}`;
        case 5: return `🏆 En compétition sur ${activity.name}`;
        default: return activity.name || 'Activité inconnue';
    }
}

// Fonction pour créer la page XP
async function createXPPage(member, color) {
  const user = member.user;
  
  // Récupération des données XP
  let xpInfo = null;
  try {
    console.log('[XP-DEBUG] Début récupération données XP pour:', user.id, 'dans guild:', member.guild.id);
    
    console.log('[XP-DEBUG] Récupération messageStats...');
    const messageStats = await messageXPHandler.getUserStats(member.guild.id, user.id);
    console.log('[XP-DEBUG] messageStats:', messageStats);
    
    console.log('[XP-DEBUG] Récupération voiceStats...');
    const voiceStats = await voiceXPHandler.getUserVoiceStats(member.guild.id, user.id);
    console.log('[XP-DEBUG] voiceStats:', voiceStats);
    
    const messageXP = messageStats ? messageStats.totalXp : 0;
    const voiceXP = voiceStats ? voiceStats.totalXp : 0;
    const totalXP = messageXP + voiceXP;
    
    console.log('[XP-DEBUG] XP calculés - Message:', messageXP, 'Voice:', voiceXP, 'Total:', totalXP);
    
    console.log('[XP-DEBUG] Calcul du niveau...');
    const level = XPCalculator.calculateLevel(totalXP);
    console.log('[XP-DEBUG] Niveau calculé:', level);
    
    const xpForCurrentLevel = XPCalculator.calculateXPForLevel(level);
    const xpForNextLevel = XPCalculator.calculateXPForLevel(level + 1);
    const progressXP = totalXP - xpForCurrentLevel;
    const neededXP = xpForNextLevel - xpForCurrentLevel;
    const progressPercentage = Math.round((progressXP / neededXP) * 100);
    
    console.log('[XP-DEBUG] Progression calculée:', progressXP, '/', neededXP, '=', progressPercentage, '%');
    
    xpInfo = {
      level,
      messageXP,
      voiceXP,
      totalXP,
      progressXP,
      neededXP,
      progressPercentage
    };
    
    console.log('[XP-DEBUG] xpInfo final:', xpInfo);
  } catch (error) {
    console.error('[XP-DEBUG] Erreur lors de la récupération des données XP:', error);
    console.error('[XP-DEBUG] Stack trace:', error.stack);
  }
  
  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ 
      name: `${user.displayName} • Expérience (XP)`, 
      iconURL: user.displayAvatarURL({ dynamic: true }) 
    })
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }));

  if (xpInfo) {
    const progressBar = createProgressBar(xpInfo.progressPercentage);
    
    embed.addFields(
      {
        name: `${Emojis.level} **Niveau**`,
        value: `\`${xpInfo.level}\``,
        inline: true
      },
      {
        name: `${Emojis.total} **XP Total**`,
        value: `\`${xpInfo.totalXP.toLocaleString()}\``,
        inline: true
      },
      {
        name: `${Emojis.progress} **Progression**`,
        value: `\`${xpInfo.progressPercentage}%\``,
        inline: true
      },
      {
        name: `${Emojis.message} **XP Messages**`,
        value: `\`${xpInfo.messageXP.toLocaleString()}\``,
        inline: true
      },
      {
        name: `${Emojis.voice} **XP Vocal**`,
        value: `\`${xpInfo.voiceXP.toLocaleString()}\``,
        inline: true
      },
      {
        name: `${Emojis.star} **Prochain niveau**`,
        value: `\`${xpInfo.progressXP}/${xpInfo.neededXP} XP\``,
        inline: true
      },
      {
        name: `${Emojis.progress} **Barre de progression**`,
        value: `${progressBar}\n\`${xpInfo.progressXP}/${xpInfo.neededXP} XP\` (${xpInfo.progressPercentage}%)`,
        inline: false
      }
    );
  } else {
    embed.addFields({
      name: `${Emojis.error} **Erreur**`,
      value: `Impossible de récupérer les données XP pour cet utilisateur.`,
      inline: false
    });
  }

  embed.setFooter({ text: `${Emojis.star} Statistiques XP • Page XP • ${new Date().toLocaleString('fr-FR')}` })
    .setTimestamp();

  return embed;
}

// Fonction pour créer une barre de progression
function createProgressBar(percentage) {
  const totalBars = 10;
  const filledBars = Math.round((percentage / 100) * totalBars);
  const emptyBars = totalBars - filledBars;
  
  const filled = '█'.repeat(filledBars);
  const empty = '░'.repeat(emptyBars);
  
  return `\`${filled}${empty}\``;
}
