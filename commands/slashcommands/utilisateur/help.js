import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { getPrefix } from '../../../src/store/configStore.js';

export default {
  category: 'utilisateur',
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Affiche la liste des commandes disponibles avec pagination'),
  async execute(interaction, client) {
    try {
      const guildId = interaction.guildId;
      const member = interaction.member;
      const prefix = getPrefix(guildId, '!');
      
      // Vérifier les permissions
      const hasAdminPerms = member.permissions.has(PermissionFlagsBits.Administrator);
      const hasModPerms = member.permissions.has(PermissionFlagsBits.ModerateMembers) || 
                         member.permissions.has(PermissionFlagsBits.KickMembers) || 
                         member.permissions.has(PermissionFlagsBits.BanMembers);

      // Déterminer les catégories disponibles selon les permissions
      const categories = getAvailableCategories(hasAdminPerms, hasModPerms);
      
      // Commencer à la première page
      const currentPage = 0;
      const embed = createCategoryEmbed(categories[currentPage], prefix, client, currentPage + 1, categories.length);
      const components = createNavigationButtons(currentPage, categories.length, hasAdminPerms, hasModPerms);

      await interaction.reply({ 
        embeds: [embed], 
        components: components, 
        flags: MessageFlags.Ephemeral 
      });
    } catch (error) {
      console.error('❌ [ERREUR] Slash /help:', error);
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply("❌ Une erreur est survenue lors de l'affichage de l'aide.");
      }
      return interaction.reply({ 
        content: "❌ Une erreur est survenue lors de l'affichage de l'aide.", 
        flags: MessageFlags.Ephemeral 
      });
    }
  },
};

// Définir les catégories avec leurs commandes
const CATEGORIES = {
  admin: {
    name: 'Administration',
    emoji: '🛠️',
    color: '#FF4757',
    commands: [
      { name: 'ban', description: 'Bannir un membre' },
      { name: 'boutonrole', description: 'Gérer les rôles via boutons' },
      { name: 'kick', description: 'Expulser un membre' },
      { name: 'logs', description: 'Active ou désactive les logs' },
      { name: 'reactionrole', description: 'Gérer les reaction roles' },
      { name: 'setprefix', description: 'Change le préfixe' },
      { name: 'setrole', description: 'Attribue un rôle' },
      { name: 'unban', description: 'Débannir un membre' }
    ]
  },
  moderation: {
    name: 'Modération',
    emoji: '🔨',
    color: '#FFA502',
    commands: [
      { name: 'clear', description: 'Supprime plusieurs messages' },
      { name: 'mute', description: 'Met un membre en sourdine' },
      { name: 'unmute', description: 'Retire la sourdine' },
      { name: 'warn', description: 'Avertir un membre' }
    ]
  },
  music: {
    name: 'Musique',
    emoji: '🎵',
    color: '#FF6B6B',
    commands: [
      { name: 'bass', description: 'Égaliseur basse' },
      { name: 'loop', description: 'Répétition' },
      { name: 'lyrics', description: 'Affiche paroles' },
      { name: 'np', description: 'Musique en cours' },
      { name: 'pause', description: 'Met en pause' },
      { name: 'play', description: 'Joue une musique' },
      { name: 'playyt', description: 'Jouer depuis YouTube' },
      { name: 'queue', description: 'Affiche la file d\'attente' },
      { name: 'resume', description: 'Reprend la lecture' },
      { name: 'seek', description: 'Avancer/reculer' },
      { name: 'skip', description: 'Passe la musique' },
      { name: 'slowed', description: 'Effet slowed' },
      { name: 'speed', description: 'Vitesse' },
      { name: 'stop', description: 'Arrête la musique' },
      { name: 'volume', description: 'Change le volume' }
    ]
  },
  xp: {
    name: 'XP / Niveaux',
    emoji: '🏆',
    color: '#FFD93D',
    commands: [
      { name: 'leaderboard', description: 'Affiche le classement' },
      { name: 'rank', description: 'Affiche ton niveau' },
      { name: 'resetallxp', description: 'Réinitialiser XP de tout le serveur' },
      { name: 'resetxp', description: 'Réinitialiser XP d\'un membre' },
      { name: 'xpconfig', description: 'Configurer gains d\'XP' }
    ]
  },
  fun: {
    name: 'Utilisateur / Fun',
    emoji: '🎉',
    color: '#74B9FF',
    commands: [
      { name: 'avatar', description: 'Affiche avatar' },
      { name: 'invite', description: 'Lien bot' },
      { name: 'ping', description: 'Test latence' },
      { name: 'say', description: 'Le bot répète ton message' },
      { name: 'serverinfo', description: 'Info serveur' },
      { name: 'userinfo', description: 'Info utilisateur' }
    ]
  },
  rgb: {
    name: 'RGB / Rôle dynamique',
    emoji: '🌈',
    color: '#A8E6CF',
    commands: [
      { name: 'pauseRGB', description: 'Met pause le RGB' },
      { name: 'randomcolor', description: 'Démarre RGB pour un rôle' },
      { name: 'resumeRGB', description: 'Reprend RGB' },
      { name: 'stopRGB', description: 'Arrête le RGB' }
    ]
  }
};

function getAvailableCategories(hasAdminPerms, hasModPerms) {
  const categories = [];
  
  if (hasAdminPerms) {
    // Admin : Administration, Modération, puis autres
    categories.push('admin', 'moderation', 'music', 'xp', 'fun', 'rgb');
  } else if (hasModPerms) {
    // Modérateur : Modération, puis autres
    categories.push('moderation', 'music', 'xp', 'fun', 'rgb');
  } else {
    // Utilisateur simple : Fun, XP, Musique, RGB
    categories.push('fun', 'xp', 'music', 'rgb');
  }
  
  return categories;
}

function createCategoryEmbed(categoryKey, prefix, client, currentPage, totalPages) {
  const category = CATEGORIES[categoryKey];
  
  const embed = new EmbedBuilder()
    .setTitle(`${category.emoji} ${category.name}`)
    .setColor(category.color)
    .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setTimestamp();

  // Créer la description avec les commandes
  let description = '';
  category.commands.forEach(cmd => {
    description += `**/${cmd.name}** • **${prefix}${cmd.name}** : ${cmd.description}\n`;
  });

  embed.setDescription(description);
  
  embed.setFooter({
    text: `Page ${currentPage}/${totalPages} • Préfixe: ${prefix} • ${client.user.username}`,
    iconURL: client.user.displayAvatarURL({ dynamic: true, size: 64 })
  });

  return embed;
}

function createNavigationButtons(currentPage, totalPages, hasAdminPerms, hasModPerms) {
  const row1 = new ActionRowBuilder();
  const row2 = new ActionRowBuilder();

  // Boutons de navigation
  const prevButton = new ButtonBuilder()
    .setCustomId(`help_nav_prev_${currentPage}_${hasAdminPerms}_${hasModPerms}`)
    .setLabel('◀️ Précédent')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(currentPage === 0);

  const nextButton = new ButtonBuilder()
    .setCustomId(`help_nav_next_${currentPage}_${hasAdminPerms}_${hasModPerms}`)
    .setLabel('Suivant ▶️')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(currentPage === totalPages - 1);

  const pageInfo = new ButtonBuilder()
    .setCustomId('help_page_info')
    .setLabel(`${currentPage + 1}/${totalPages}`)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  row1.addComponents(prevButton, pageInfo, nextButton);

  // Boutons d'actions
  const copyPrefixButton = new ButtonBuilder()
    .setCustomId('help_copy_prefix')
    .setLabel('📋 Préfixe')
    .setStyle(ButtonStyle.Secondary);

  const inviteButton = new ButtonBuilder()
    .setCustomId('help_invite_bot')
    .setLabel('🤖 Inviter')
    .setStyle(ButtonStyle.Secondary);

  const supportButton = new ButtonBuilder()
    .setCustomId('help_support_server')
    .setLabel('🆘 Support')
    .setStyle(ButtonStyle.Secondary);

  const refreshButton = new ButtonBuilder()
    .setCustomId('help_refresh')
    .setLabel('🔄 Actualiser')
    .setStyle(ButtonStyle.Secondary);

  row2.addComponents(copyPrefixButton, inviteButton, supportButton, refreshButton);

  return [row1, row2];
}

export { getAvailableCategories, createCategoryEmbed, createNavigationButtons, CATEGORIES };




