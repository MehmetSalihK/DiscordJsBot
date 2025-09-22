import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { createInfoEmbed, createSuccessEmbed, createErrorEmbed, Emojis } from '../utils/embeds.js';
import { getPrefix, setLogChannelId, toggleFeature, getGuildConfig, setGuildConfig } from '../store/configStore.js';

function buildHelpEmbed(client, guildId, page = 0, catPage = 0) {
  const categories = ['admin', 'moderateur', 'utilisateur', 'xp'];
  const titles = ['Commandes Administrateur', 'Commandes Modérateur', 'Commandes Utilisateur', 'Commandes XP'];
  const emojiTitle = [Emojis.admin, Emojis.mod, Emojis.user, '📈'];
  const cat = categories[page] || 'utilisateur';

  const isSlash = true; // pour la cohérence du contenu; l’aide présente slash par défaut
  const cmds = isSlash ? Array.from(client.slashCommands?.values?.() || []) : Array.from(client.prefixCommands?.values?.() || []);
  const listLines = cmds
    .filter(c => (c.category || 'utilisateur') === cat)
    .map(c => {
      const name = isSlash ? `/${c.data?.name}` : `${c.name}`;
      const desc = isSlash ? (c.data?.description || 'Sans description') : (c.description || 'Sans description');
      const usage = c.usage ? `\nUsage: ${c.usage}` : '';
      return `• ${name} — ${desc}${usage}`;
    });
  const prefix = getPrefix(guildId, '!');
  const header = `Préfixe actuel du serveur: \`${prefix}\``;
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil((listLines.length || 1) / pageSize));
  const safeCatPage = Math.min(Math.max(0, catPage), totalPages - 1);
  const start = safeCatPage * pageSize;
  const end = start + pageSize;
  const current = listLines.slice(start, end);
  const descBody = current.length ? current.join('\n') : 'Aucune commande trouvée.';
  const full = `${header}\n\n${descBody}`;
  return { embed: createInfoEmbed(`${emojiTitle[page] || Emojis.help} ${titles[page] || 'Aide'}`, full, {}), totalPages, catIndex: page, catPage: safeCatPage };
}

// ============ Voice Logs Config (minimal panel) ============

export function buildVoiceLogsInitial(guild) {
  const conf = getGuildConfig(guild.id);
  const x = conf?.xpSystem || {};
  const lines = [
    `Logs vocaux: ${(x.voiceLogs?.active !== false) ? 'Activés ✅' : 'Désactivés ❌'}`,
    `Salon logs vocaux: ${x.voiceLogs?.logChannelId ? '<#' + x.voiceLogs.logChannelId + '>' : 'Non défini'}`,
  ];
  const embed = createInfoEmbed('🎙️ Configuration des logs vocaux', lines.join('\n'));
  const setVoiceLogsHere = new ButtonBuilder().setCustomId('xp_voice_logs_here').setLabel('Définir ce salon').setEmoji('🎙️').setStyle(ButtonStyle.Primary);
  const toggleVoiceLogs = new ButtonBuilder().setCustomId('xp_voice_logs_toggle').setLabel((x?.voiceLogs?.active !== false) ? 'Désactiver' : 'Activer').setEmoji('📡').setStyle(ButtonStyle.Secondary);
  const row = new ActionRowBuilder().addComponents(setVoiceLogsHere, toggleVoiceLogs);
  return { embed, components: [row] };
}

function helpButtons(page = 0, totalPages = 1, catPage = 0) {
  const prev = new ButtonBuilder().setCustomId(`help_prev_${page}`).setLabel('Précédent').setStyle(ButtonStyle.Secondary);
  const next = new ButtonBuilder().setCustomId(`help_next_${page}`).setLabel('Suivant').setStyle(ButtonStyle.Primary);
  const row1 = new ActionRowBuilder().addComponents(prev, next);
  const catAdmin = new ButtonBuilder().setCustomId('help_cat_admin').setLabel('Admin').setEmoji('🛠️').setStyle(ButtonStyle.Secondary);
  const catMod = new ButtonBuilder().setCustomId('help_cat_moderateur').setLabel('Modérateur').setEmoji('🛡️').setStyle(ButtonStyle.Secondary);
  const catUser = new ButtonBuilder().setCustomId('help_cat_utilisateur').setLabel('Utilisateur').setEmoji('👤').setStyle(ButtonStyle.Secondary);
  const catXP = new ButtonBuilder().setCustomId('help_cat_xp').setLabel('XP').setEmoji('📈').setStyle(ButtonStyle.Secondary);
  const row2 = new ActionRowBuilder().addComponents(catAdmin, catMod, catUser, catXP);
  const rows = [row1, row2];
  if (totalPages > 1) {
    const pprev = new ButtonBuilder().setCustomId(`help_pg_prev_${page}_${catPage}`).setLabel('Page précédente').setStyle(ButtonStyle.Secondary);
    const indicator = new ButtonBuilder().setCustomId('help_pg_indicator').setLabel(`Page ${catPage + 1}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true);
    const pnext = new ButtonBuilder().setCustomId(`help_pg_next_${page}_${catPage}`).setLabel('Page suivante').setStyle(ButtonStyle.Secondary);
    const row3 = new ActionRowBuilder().addComponents(pprev, indicator, pnext);
    rows.push(row3);
  }
  return rows;
}

export async function handleHelpButton(interaction, client) {
  const id = interaction.customId;
  const matchPrev = id.match(/^help_prev_(\d+)/);
  const matchNext = id.match(/^help_next_(\d+)/);
  const matchPgPrev = id.match(/^help_pg_prev_(\d+)_(\d+)/);
  const matchPgNext = id.match(/^help_pg_next_(\d+)_(\d+)/);
  let page = 0;
  let catPage = 0;
  if (matchPrev) page = Math.max(0, (parseInt(matchPrev[1], 10) - 1 + 3) % 3);
  if (matchNext) page = (parseInt(matchNext[1], 10) + 1) % 3;
  if (id === 'help_cat_admin') page = 0;
  if (id === 'help_cat_moderateur') page = 1;
  if (id === 'help_cat_utilisateur') page = 2;
  if (id === 'help_cat_xp') page = 3;
  if (matchPgPrev) { page = parseInt(matchPgPrev[1], 10); catPage = Math.max(0, parseInt(matchPgPrev[2], 10) - 1); }
  if (matchPgNext) { page = parseInt(matchPgNext[1], 10); catPage = parseInt(matchPgNext[2], 10) + 1; }
  const data = buildHelpEmbed(client, interaction.guildId, page, catPage);
  // Ajuster catPage pour rester dans bornes avec totalPages
  const adjCatPage = Math.min(data.catPage, Math.max(0, data.totalPages - 1));
  await interaction.update({ embeds: [data.embed], components: helpButtons(page, data.totalPages, adjCatPage) });
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

export function buildHelpInitial(client, guildId) {
  const data = buildHelpEmbed(client, guildId, 0, 0);
  return { embed: data.embed, components: helpButtons(0, data.totalPages, 0) };
}

export function buildLogsInitial(guild) {
  const conf = getGuildConfig(guild.id);
  const embed = buildLogsPanelEmbed(guild, conf);
  return { embed, components: logsButtons(conf) };
}

// ============ XP Config (interactive) ============

function buildXPButtons(conf, guild) {
  const activeBtn = new ButtonBuilder().setCustomId('xp_toggle').setLabel(conf?.xpSystem?.active ? 'Désactiver' : 'Activer').setEmoji(conf?.xpSystem?.active ? '📴' : '✅').setStyle(ButtonStyle.Primary);
  const msgDec = new ButtonBuilder().setCustomId('xp_msg_dec').setLabel('-1 msg XP').setStyle(ButtonStyle.Secondary);
  const msgInc = new ButtonBuilder().setCustomId('xp_msg_inc').setLabel('+1 msg XP').setStyle(ButtonStyle.Secondary);
  const voiceDec = new ButtonBuilder().setCustomId('xp_voice_dec').setLabel('-5 vocal XP').setStyle(ButtonStyle.Secondary);
  const voiceInc = new ButtonBuilder().setCustomId('xp_voice_inc').setLabel('+5 vocal XP').setStyle(ButtonStyle.Secondary);
  const row1 = new ActionRowBuilder().addComponents(activeBtn, msgDec, msgInc, voiceDec, voiceInc);

  const setAfkHere = new ButtonBuilder().setCustomId('xp_set_afk_here').setLabel('Ignorer ce salon (AFK)').setEmoji('😴').setStyle(ButtonStyle.Secondary);
  const clearAfk = new ButtonBuilder().setCustomId('xp_clear_afk').setLabel('Ne rien ignorer').setStyle(ButtonStyle.Secondary);
  const setLogsHere = new ButtonBuilder().setCustomId('xp_logs_here').setLabel('Définir ce salon pour logs (généraux)').setEmoji('📝').setStyle(ButtonStyle.Secondary);
  const setXPLogsHere = new ButtonBuilder().setCustomId('xp_xplogs_here').setLabel('Définir ce salon pour logs XP').setEmoji('📑').setStyle(ButtonStyle.Secondary);
  const toggleXPLogs = new ButtonBuilder().setCustomId('xp_xplogs_toggle').setLabel((conf?.xpSystem?.xpLogs?.active !== false) ? 'Désactiver logs XP' : 'Activer logs XP').setEmoji('📪').setStyle(ButtonStyle.Secondary);
  const editLevels = new ButtonBuilder().setCustomId('xp_edit_levels').setLabel('Éditer paliers').setEmoji('🧮').setStyle(ButtonStyle.Secondary);
  const setVoiceLogsHere = new ButtonBuilder().setCustomId('xp_voice_logs_here').setLabel('Définir ce salon pour logs vocaux').setEmoji('🎙️').setStyle(ButtonStyle.Secondary);
  const toggleVoiceLogs = new ButtonBuilder().setCustomId('xp_voice_logs_toggle').setLabel((conf?.xpSystem?.voiceLogs?.active !== false) ? 'Désactiver logs vocaux' : 'Activer logs vocaux').setEmoji('📡').setStyle(ButtonStyle.Secondary);
  const row2 = new ActionRowBuilder().addComponents(setAfkHere, clearAfk, setLogsHere, setXPLogsHere, toggleXPLogs);
  const row3 = new ActionRowBuilder().addComponents(setVoiceLogsHere, toggleVoiceLogs);
  const row4 = new ActionRowBuilder().addComponents(editLevels);
  return [row1, row2, row3, row4];
}

function buildXPEmbed(guild, conf) {
  const x = conf?.xpSystem || {};
  const lines = [
    `État: ${x.active !== false ? 'Activé ✅' : 'Désactivé ❌'}`,
    `XP par message: **${x.messageXP ?? 1}**`,
    `XP vocal / 5 min: **${x.voiceXPPer5Min ?? 10}**`,
    `Logs (généraux): ${(conf?.logs?.active !== false) ? 'Activés ✅' : 'Désactivés ❌'}`,
    `Logs XP: ${(x.xpLogs?.active !== false) ? 'Activés ✅' : 'Désactivés ❌'}`,
    `Logs vocaux: ${(x.voiceLogs?.active !== false) ? 'Activés ✅' : 'Désactivés ❌'}`,
    `Salon AFK ignoré: ${x.ignoreAfkChannelId ? '<#' + x.ignoreAfkChannelId + '>' : (guild.afkChannelId ? '(AFK par défaut: <#' + guild.afkChannelId + '>)' : 'Aucun')}`,
    `Salon logs XP: ${x.xpLogs?.logChannelId ? '<#' + x.xpLogs.logChannelId + '>' : 'Non défini'}`,
    `Salon logs vocaux: ${x.voiceLogs?.logChannelId ? '<#' + x.voiceLogs.logChannelId + '>' : 'Non défini'}`,
  ];
  return createInfoEmbed('⚙️ Configuration XP', lines.join('\n'));
}

export function buildXPConfigInitial(guild) {
  const conf = getGuildConfig(guild.id);
  const embed = buildXPEmbed(guild, conf);
  const components = buildXPButtons(conf, guild);
  return { embed, components };
}

export async function handleXPButton(interaction, client) {
  const conf = getGuildConfig(interaction.guildId);
  const id = interaction.customId;
  const x = conf.xpSystem || { active: true, messageXP: 1, voiceXPPer5Min: 10 };
  if (id === 'xp_toggle') {
    x.active = !x.active;
  } else if (id === 'xp_msg_inc') {
    x.messageXP = Math.min(50, (x.messageXP || 1) + 1);
  } else if (id === 'xp_msg_dec') {
    x.messageXP = Math.max(0, (x.messageXP || 1) - 1);
  } else if (id === 'xp_voice_inc') {
    x.voiceXPPer5Min = Math.min(500, (x.voiceXPPer5Min || 10) + 5);
  } else if (id === 'xp_voice_dec') {
    x.voiceXPPer5Min = Math.max(0, (x.voiceXPPer5Min || 10) - 5);
  } else if (id === 'xp_set_afk_here') {
    x.ignoreAfkChannelId = interaction.channelId;
  } else if (id === 'xp_clear_afk') {
    x.ignoreAfkChannelId = null;
  } else if (id === 'xp_logs_here') {
    setLogChannelId(interaction.guildId, interaction.channelId);
  } else if (id === 'xp_xplogs_here') {
    x.xpLogs = { ...(x.xpLogs || {}), logChannelId: interaction.channelId };
  } else if (id === 'xp_xplogs_toggle') {
    const current = x.xpLogs?.active !== false;
    x.xpLogs = { ...(x.xpLogs || {}), active: !current };
  } else if (id === 'xp_voice_logs_here') {
    x.voiceLogs = { ...(x.voiceLogs || {}), logChannelId: interaction.channelId };
  } else if (id === 'xp_voice_logs_toggle') {
    const current = x.voiceLogs?.active !== false;
    x.voiceLogs = { ...(x.voiceLogs || {}), active: !current };
  } else if (id === 'xp_edit_levels') {
    const modal = new ModalBuilder()
      .setCustomId('xp_levels_modal')
      .setTitle('Éditer les paliers de niveaux');
    const input = new TextInputBuilder()
      .setCustomId('levels_json')
      .setLabel('JSON des paliers (ex: {"1":500,"2":1000})')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setPlaceholder('{"1":500,"2":1000,"3":2000}');
    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);
    return interaction.showModal(modal);
  }
  setGuildConfig(interaction.guildId, { xpSystem: x });
  const updated = getGuildConfig(interaction.guildId);
  const embed = buildXPEmbed(interaction.guild, updated);
  await interaction.update({ embeds: [embed], components: buildXPButtons(updated, interaction.guild) });
}

export async function handleXPModal(interaction) {
  if (interaction.customId !== 'xp_levels_modal') return;
  try {
    const jsonStr = interaction.fields.getTextInputValue('levels_json');
    const obj = JSON.parse(jsonStr);
    // Validation simple: clés numériques positives, valeurs entières positives
    const levels = {};
    for (const [k, v] of Object.entries(obj)) {
      const lv = Number(k);
      const xp = Number(v);
      if (!Number.isInteger(lv) || lv <= 0 || !Number.isInteger(xp) || xp <= 0) continue;
      levels[String(lv)] = xp;
    }
    if (Object.keys(levels).length === 0) throw new Error('Paliers invalides');
    const conf = getGuildConfig(interaction.guildId);
    conf.xpSystem = { ...(conf.xpSystem || {}), levels };
    setGuildConfig(interaction.guildId, { xpSystem: conf.xpSystem });
    const embed = buildXPEmbed(interaction.guild, conf);
    await interaction.reply({ embeds: [embed] });
  } catch (e) {
    const { createErrorEmbed } = await import('../utils/embeds.js');
    await interaction.reply({ embeds: [createErrorEmbed('Erreur', 'JSON invalide pour les paliers.')], flags: 64 }); // MessageFlags.Ephemeral
  }
}

// ============ Server Info (interactive) ============

function buildServerInfoButtons(activeKey, page = 0, totalPages = 1) {
  const cats = [
    { key: 'general', emoji: '🏠', label: 'Infos' },
    { key: 'members', emoji: '👥', label: 'Membres' },
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
        { name: '🔣 Préfixe', value: `\`${prefix}\``, inline: true },
        { name: '📝 Logs', value: `État: **${conf?.logsActive ? 'Activés' : 'Désactivés'}**\nSalon: ${conf?.logChannelId ? '<#' + conf.logChannelId + '>' : 'Non défini'}`, inline: true },
        { name: '📅 Créé le', value: created, inline: false },
      ];
      break;
    case 'members':
      fields = [
        { name: '👥 Membres', value: `Total: **${guild.memberCount}**\nHumains: **${humans}**\nBots: **${bots}**`, inline: true },
        { name: '📶 Statuts', value: `🟢 En ligne: **${online}**\n🌙 Inactif: **${idle}**\n⛔ DND: **${dnd}**\n⚫ Hors ligne: **${offline}**`, inline: true },
        { name: '🚀 Boosters', value: `**${boosts}** utilisateur(s)`, inline: true },
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
