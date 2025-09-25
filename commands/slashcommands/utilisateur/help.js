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
      const embed = createCategoryEmbed(categories[currentPage], prefix, client, currentPage, categories.length);
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
    color: '#E74C3C',
    description: 'Commandes réservées aux administrateurs',
    commands: [
      { name: 'ban', description: 'Bannir un membre du serveur' },
      { name: 'boutonrole', description: 'Gérer les rôles via boutons' },
      { name: 'kick', description: 'Expulser un membre du serveur' },
      { name: 'logs', description: 'Configurer le système de logs' },
      { name: 'reactionrole', description: 'Gérer les reaction roles' },
      { name: 'rs-set', description: 'Configurer la modération des liens' },
      { name: 'rs-config', description: 'Panneau de configuration des liens' },
      { name: 'setprefix', description: 'Changer le préfixe du bot' },
      { name: 'setrole', description: 'Attribuer un rôle à un membre' },
      { name: 'unban', description: 'Débannir un membre' }
    ]
  },
  moderation: {
    name: 'Modération',
    emoji: '🔨',
    color: '#F39C12',
    description: 'Commandes pour modérer le serveur',
    commands: [
      { name: 'clear', description: 'Supprimer plusieurs messages' },
      { name: 'mute', description: 'Mettre un membre en timeout' },
      { name: 'unmute', description: 'Retirer le timeout d\'un membre' },
      { name: 'warn', description: 'Avertir un membre' }
    ]
  },
  music: {
    name: 'Musique',
    emoji: '🎵',
    color: '#9B59B6',
    description: 'Commandes pour écouter de la musique',
    commands: [
      { name: 'play', description: 'Jouer une musique' },
      { name: 'playyt', description: 'Jouer depuis YouTube' },
      { name: 'pause', description: 'Mettre en pause la lecture' },
      { name: 'resume', description: 'Reprendre la lecture' },
      { name: 'skip', description: 'Passer à la musique suivante' },
      { name: 'stop', description: 'Arrêter la musique' },
      { name: 'queue', description: 'Afficher la file d\'attente' },
      { name: 'np', description: 'Musique actuellement en cours' },
      { name: 'volume', description: 'Changer le volume' },
      { name: 'loop', description: 'Répéter la musique' },
      { name: 'seek', description: 'Avancer dans la musique' },
      { name: 'back', description: 'Reculer dans la musique' },
      { name: 'bass', description: 'Effet bass boost' },
      { name: 'speed', description: 'Effet accéléré (nightcore)' },
      { name: 'slowed', description: 'Effet ralenti (vaporwave)' },
      { name: 'disconnect', description: 'Déconnecter le bot du vocal' }
    ]
  },
  fun: {
    name: 'Utilisateur & Fun',
    emoji: '🎉',
    color: '#3498DB',
    description: 'Commandes utiles et amusantes',
    commands: [
      { name: 'ping', description: 'Tester la latence du bot' },
      { name: 'avatar', description: 'Afficher l\'avatar d\'un utilisateur' },
      { name: 'userinfo', description: 'Informations sur un utilisateur' },
      { name: 'serverinfo', description: 'Informations sur le serveur' },
      { name: 'invite', description: 'Lien d\'invitation du bot' },
      { name: 'say', description: 'Faire répéter un message au bot' }
    ]
  },
  rgb: {
    name: 'RGB & Rôles Dynamiques',
    emoji: '🌈',
    color: '#2ECC71',
    description: 'Animation de couleurs pour les rôles',
    commands: [
      { name: 'randomcolor', description: 'Démarrer l\'animation RGB' },
      { name: 'pausergb', description: 'Mettre en pause l\'animation' },
      { name: 'resumergb', description: 'Reprendre l\'animation' },
      { name: 'stoprgb', description: 'Arrêter l\'animation RGB' }
    ]
  }
};

function getAvailableCategories(hasAdminPerms, hasModPerms) {
  const categories = [];
  
  if (hasAdminPerms) {
    // Admin : Administration, Modération, puis autres
    categories.push('admin', 'moderation', 'music', 'fun', 'rgb');
  } else if (hasModPerms) {
    // Modérateur : Modération, puis autres
    categories.push('moderation', 'music', 'fun', 'rgb');
  } else {
    // Utilisateur simple : Fun, Musique, RGB
    categories.push('fun', 'music', 'rgb');
  }
  
  return categories;
}

function createCategoryEmbed(categoryKey, prefix, client, currentPage, totalPages) {
  const category = CATEGORIES[categoryKey];
  
  const embed = new EmbedBuilder()
    .setTitle(`${category.emoji} **${category.name}**`)
    .setColor(category.color)
    .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setTimestamp();

  // Description simple et élégante
  embed.setDescription(`> ${category.description.replace(/```yaml\n|\n```/g, '').trim()}`);
  
  // Créer un format très propre et lisible
  const commands = category.commands;
  let commandList = '';
  
  commands.forEach((cmd, index) => {
    // Format avec slash ET préfixe : /commande • !commande • Description
    commandList += `\`/${cmd.name}\` • \`${prefix}${cmd.name}\` • ${cmd.description.replace(/\*\*/g, '')}\n`;
    
    // Ajouter un petit espace tous les 3 éléments pour la lisibilité
    if ((index + 1) % 3 === 0 && index !== commands.length - 1) {
      commandList += '\n';
    }
  });
  
  // Un seul field propre avec toutes les commandes
  embed.addFields({
    name: '📋 **Commandes Disponibles**',
    value: commandList || 'Aucune commande disponible',
    inline: false
  });
  
  // Informations utiles en bas
  embed.addFields({
    name: '💡 **Comment utiliser**',
    value: `• Tapez \`${prefix}help\` ou \`/help\` pour cette aide\n• Utilisez \`/${commands[0]?.name || 'commande'}\` ou \`${prefix}${commands[0]?.name || 'commande'}\` pour exécuter une commande\n• Les deux formats fonctionnent : **slash** (\`/\`) et **préfixe** (\`${prefix}\`)\n• Naviguez avec les boutons ci-dessous`,
    inline: false
  });
  
  // Footer simple et professionnel
  embed.setFooter({
    text: `Page ${currentPage + 1}/${totalPages} • Préfixe: ${prefix}`,
    iconURL: client.user.displayAvatarURL({ dynamic: true, size: 64 })
  });

  return embed;
}

function createNavigationButtons(currentPage, totalPages, hasAdminPerms, hasModPerms) {
  const row1 = new ActionRowBuilder();
  const row2 = new ActionRowBuilder();

  // Boutons de navigation améliorés
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
    .setLabel(`📄 ${currentPage + 1}/${totalPages}`)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  // Bouton pour aller à la première page
  const firstPageButton = new ButtonBuilder()
    .setCustomId(`help_nav_first_${hasAdminPerms}_${hasModPerms}`)
    .setLabel('⏮️')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(currentPage === 0);

  // Bouton pour aller à la dernière page
  const lastPageButton = new ButtonBuilder()
    .setCustomId(`help_nav_last_${hasAdminPerms}_${hasModPerms}`)
    .setLabel('⏭️')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(currentPage === totalPages - 1);

  row1.addComponents(firstPageButton, prevButton, pageInfo, nextButton, lastPageButton);

  // Boutons d'actions améliorés
  const inviteButton = new ButtonBuilder()
    .setLabel('🔗 Inviter le Bot')
    .setStyle(ButtonStyle.Link)
    .setURL(`https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID || '1234567890'}&permissions=8&scope=bot%20applications.commands`);

  const supportButton = new ButtonBuilder()
    .setCustomId('help_support_server')
    .setLabel('💬 Support Discord')
    .setStyle(ButtonStyle.Secondary);

  const refreshButton = new ButtonBuilder()
    .setCustomId('help_refresh')
    .setLabel('🔄 Actualiser')
    .setStyle(ButtonStyle.Success);

  const commandsButton = new ButtonBuilder()
    .setCustomId('help_all_commands')
    .setLabel('📋 Toutes les Commandes')
    .setStyle(ButtonStyle.Secondary);

  row2.addComponents(inviteButton, supportButton, refreshButton, commandsButton);

  return [row1, row2];
}

export { getAvailableCategories, createCategoryEmbed, createNavigationButtons, CATEGORIES };




