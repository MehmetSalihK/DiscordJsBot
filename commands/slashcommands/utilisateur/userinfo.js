import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, MessageFlags } from 'discord.js';
import { createErrorEmbed, Emojis } from '../../../src/utils/embeds.js';
import messageXPHandler from '../../../src/utils/messageXpHandler.js';
import voiceXPHandler from '../../../src/utils/voiceXpHandler.js';
import XPCalculator from '../../../src/utils/xpCalculator.js';

export default {
  category: 'utilisateur',
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Affiche les informations détaillées d\'un utilisateur')
    .addUserOption(option => 
      option.setName('utilisateur')
        .setDescription('L\'utilisateur dont vous voulez voir les informations')
        .setRequired(false)
    ),
  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser('utilisateur') || interaction.user;
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      
      if (!member) {
        return interaction.reply({ 
          embeds: [createErrorEmbed('Utilisateur introuvable', 'Cet utilisateur n\'est pas membre de ce serveur.')], 
          flags: MessageFlags.Ephemeral 
        });
      }

      console.log(`ℹ️  [INFO] Commande /userinfo utilisée par ${interaction.user.tag} pour ${targetUser.tag}`);

      // Créer l'embed de la page "Personne" par défaut
      const embed = await createUserInfoEmbed(member, 'person', interaction.user.id);
      const components = createUserInfoButtons('person', targetUser.id);

      await interaction.reply({ 
        embeds: [embed], 
        components: components,
        flags: MessageFlags.Ephemeral 
      });
    } catch (error) {
      console.error('❌ [ERREUR] Slash /userinfo:', error);
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ embeds: [createErrorEmbed('Erreur', 'Une erreur est survenue lors de l\'affichage des informations utilisateur.')] });
      }
      return interaction.reply({ 
        embeds: [createErrorEmbed('Erreur', 'Une erreur est survenue lors de l\'affichage des informations utilisateur.')], 
        flags: MessageFlags.Ephemeral 
      });
    }
  },
};

// Fonction pour créer l'embed selon la page
async function createUserInfoEmbed(member, page, viewerId = null) {
  const user = member.user;
  const guild = member.guild;
  
  // Couleur basée sur le rôle le plus haut ou bleu par défaut
  const highestRole = member.roles.highest;
  const embedColor = highestRole.color !== 0 ? highestRole.color : Colors.Blurple;

  switch (page) {
    case 'person': // Page Informations utilisateur
      return await createUserInfoPage(member, embedColor);
    case 'xp': // Page XP
      return await createXPPage(member, embedColor);
    case 'social': // Page Réseaux sociaux
      return createSocialPage(member, embedColor, viewerId);
    default:
      return await createUserInfoPage(member, embedColor);
  }
}

// Page 1: Informations utilisateur
async function createUserInfoPage(member, color) {
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
         );

  embed.setFooter({ text: `${Emojis.search} Informations détaillées • Page Personne • ${new Date().toLocaleString('fr-FR')}` })
    .setTimestamp();

  return embed;
}



// Page 3: Réseaux sociaux
function createSocialPage(member, color, viewerId = null) {
  const user = member.user;
  const fs = require('fs');
  const path = require('path');
  
  // Lire les données des réseaux sociaux
  const socialsPath = path.join(__dirname, '../../../json/socials.json');
  let socialsData = {};
  
  try {
    if (fs.existsSync(socialsPath)) {
      const data = fs.readFileSync(socialsPath, 'utf8');
      socialsData = JSON.parse(data);
    }
  } catch (error) {
    console.error('❌ [SOCIAL] Erreur lecture socials.json:', error);
  }
  
  const userSocials = socialsData[user.id] || {};
  const isOwnProfile = viewerId === user.id;
  
  // Configuration des réseaux supportés
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
    const socialData = userSocials[networkKey];
    
    if (socialData && (isOwnProfile || socialData.privacy === 'public')) {
      const privacyText = socialData.privacy === 'private' ? ' (Privé)' : ' (Public)';
      description += `${networkConfig.emoji} **${networkConfig.name}** : @${socialData.username}${isOwnProfile ? privacyText : ''}\n`;
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
    const messageStats = await messageXPHandler.getStats(user.id);
    const voiceStats = await voiceXPHandler.getStats(user.id);
    
    const messageXP = messageStats ? messageStats.xp : 0;
    const voiceXP = voiceStats ? voiceStats.xp : 0;
    const totalXP = messageXP + voiceXP;
    
    const level = XPCalculator.calculateLevel(totalXP);
    const xpForCurrentLevel = XPCalculator.calculateXPForLevel(level);
    const xpForNextLevel = XPCalculator.calculateXPForLevel(level + 1);
    const progressXP = totalXP - xpForCurrentLevel;
    const neededXP = xpForNextLevel - xpForCurrentLevel;
    const progressPercentage = Math.round((progressXP / neededXP) * 100);
    
    xpInfo = {
      level,
      messageXP,
      voiceXP,
      totalXP,
      progressXP,
      neededXP,
      progressPercentage
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des données XP:', error);
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
