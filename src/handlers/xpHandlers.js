import { EmbedBuilder, Colors } from 'discord.js';
import { createSuccessEmbed } from '../utils/embeds.js';
import { sendXPLog, sendVoiceLog } from '../utils/logs.js';
import { getGuildConfig } from '../store/configStore.js';
import { addXP, getUserData, setUserData } from '../store/xpStore.js';

// Mémoire temporaire pour l'état vocal: { [guildId]: { [userId]: joinTimestampMs } }
const voiceJoins = new Map();

function getGuildStore(map, guildId) {
  if (!map.has(guildId)) map.set(guildId, new Map());
  return map.get(guildId);
}

export async function handleMessageXP(message) {
  if (!message.guild || message.author.bot) return;
  const conf = getGuildConfig(message.guild.id);
  const xpConf = conf?.xpSystem || {};
  if (xpConf.active === false) return;
  const perMsg = Number(xpConf.messageXP ?? 1) || 0;
  if (perMsg <= 0) return;

  // Anti-spam 5s par défaut
  const data = getUserData(message.guild.id, message.author.id);
  const now = Math.floor(Date.now() / 1000);
  if (data.lastMessage && now - data.lastMessage < 5) {
    return; // ignorer messages trop rapprochés
  }
  data.lastMessage = now;
  setUserData(message.guild.id, message.author.id, data);

  const { updated, leveledUp } = addXP(message.guild.id, message.author.id, perMsg);
  if (leveledUp) {
    const emb = createSuccessEmbed('🎉 Niveau supérieur !', `Bravo <@${message.author.id}>, tu es passé au niveau **${updated.level}** avec **${updated.xp} XP** !`);
    // Respecter le toggle de logs XP dédiés
    if (xpConf?.xpLogs?.active !== false) {
      await sendXPLog(message.client, message.guild.id, emb).catch(async () => {
        try { await message.channel.send({ embeds: [emb] }); } catch {}
      });
    } else {
      try { await message.channel.send({ embeds: [emb] }); } catch {}
    }
  }
}

export async function handleVoiceStateUpdate(oldState, newState) {
  const guild = newState.guild || oldState.guild;
  if (!guild) return;
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;
  const conf = getGuildConfig(guild.id);
  const xpConf = conf?.xpSystem || {};
  if (xpConf.active === false) return;

  const per5 = Number(xpConf.voiceXPPer5Min ?? 10) || 0;
  if (per5 <= 0) return;

  const ignoreAfkId = xpConf.ignoreAfkChannelId || guild.afkChannelId || null;

  const store = getGuildStore(voiceJoins, guild.id);
  const uid = member.id;

  const connected = newState.channelId && (!ignoreAfkId || newState.channelId !== ignoreAfkId);
  const wasConnected = oldState.channelId && (!ignoreAfkId || oldState.channelId !== ignoreAfkId);

  // Join to a valid channel
  if (connected && !wasConnected) {
    store.set(uid, Date.now());
    return;
  }
  // Moved between channels
  if (connected && wasConnected) {
    // reset timer when switching between valid channels
    store.set(uid, Date.now());
    return;
  }
  // Left or moved to AFK/ignored
  if (!connected && wasConnected) {
    const start = store.get(uid);
    store.delete(uid);
    if (!start) return;
    const ms = Date.now() - start;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const chunks = Math.floor(ms / (5 * 60 * 1000));
    if (chunks <= 0) return;
    const gain = chunks * per5;
    const { updated, leveledUp } = addXP(guild.id, uid, gain);
    if (leveledUp) {
      const emb = createSuccessEmbed('🎉 Niveau supérieur (vocal) !', `Bravo <@${uid}>, tu es passé au niveau **${updated.level}** avec **${updated.xp} XP** !`);
      if (xpConf?.xpLogs?.active !== false) {
        await sendXPLog(guild.client, guild.id, emb).catch(async () => {
          try { await guild.systemChannel?.send({ embeds: [emb] }); } catch {}
        });
      } else {
        try { await guild.systemChannel?.send({ embeds: [emb] }); } catch {}
      }
    }

    // Log vocal détaillé si activé
    const startDate = new Date(start);
    const endDate = new Date();
    const fr = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
    const voiceChannel = oldState?.channel || newState?.channel; // canal quitté
    const vEmb = new EmbedBuilder()
      .setColor(Colors.Blurple)
      .setTitle('🔊 Activité vocale')
      .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
      .addFields(
        { name: '👤 Utilisateur', value: `<@${uid}>`, inline: true },
        { name: '🔊 Salon', value: voiceChannel?.name ? `#${voiceChannel.name}` : (oldState?.channelId ? `ID: ${oldState.channelId}` : 'Inconnu'), inline: true },
        { name: '🕒 Temps passé', value: `${minutes} min ${seconds}s`, inline: true },
        { name: '✨ XP gagné', value: `**${gain} XP**`, inline: true },
        { name: '📅 Début', value: fr.format(startDate), inline: true },
        { name: '📅 Fin', value: fr.format(endDate), inline: true },
      )
      .setTimestamp();
    await sendVoiceLog(guild.client, guild.id, vEmb).catch(() => {});
  }
}
