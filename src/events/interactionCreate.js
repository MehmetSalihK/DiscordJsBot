// src/events/interactionCreate.js
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType, EmbedBuilder } from 'discord.js';
import { getGuildAutoRoleConfig, updateGuildAutoRoleConfig } from '../store/autoRoleStore.js';
import { createSuccessEmbed, createErrorEmbed, createInfoEmbed } from '../utils/embeds.js';
import { sendAutoRoleLog } from '../utils/logs.js';

// Fonction pour gérer les interactions de boutons
export async function handleButtonInteraction(interaction) {
  if (!interaction.isButton()) return false;
  
  const { customId, guild, member } = interaction;
  
  // Vérifier si c'est une interaction AutoRole
  if (!customId.startsWith('autorole_')) return false;
  
  // Vérifier les permissions administrateur
  if (!member.permissions.has('Administrator')) {
    await interaction.reply({
      embeds: [createErrorEmbed('Erreur de permission', 'Vous devez être administrateur pour utiliser ces boutons.')],
      ephemeral: true
    });
    return true;
  }
  
  // Extraire l'action du customId
  const action = customId.split('_')[1];
  
  try {
    switch (action) {
      case 'add':
        await handleAddRole(interaction);
        break;
      case 'remove':
        await handleRemoveRole(interaction);
        break;
      case 'toggle':
        await handleToggleAutoRole(interaction);
        break;
      case 'reset':
        await handleResetRoles(interaction);
        break;
      default:
        return false;
    }
    return true;
  } catch (error) {
    console.error('Error in AutoRole button handler:', error);
    await interaction.reply({
      embeds: [createErrorEmbed('Erreur', 'Une erreur est survenue lors du traitement de votre demande.')],
      ephemeral: true
    });
    return true;
  }
}

// Fonction pour gérer l'ajout de rôle via le bouton
async function handleAddRole(interaction) {
  // Créer un sélecteur de rôle
  const roleSelect = new StringSelectMenuBuilder()
    .setCustomId('autorole_select_role')
    .setPlaceholder('Sélectionnez un rôle à ajouter')
    .setMinValues(1)
    .setMaxValues(1);
  
  // Ajouter les rôles disponibles
  const roles = interaction.guild.roles.cache
    .sort((a, b) => b.position - a.position)
    .filter(role => !role.managed && role.id !== interaction.guild.id)
    .slice(0, 25); // Limite de 25 rôles dans le menu
  
  if (roles.size === 0) {
    return interaction.reply({
      embeds: [createErrorEmbed('Erreur', 'Aucun rôle disponible à ajouter.')],
      ephemeral: true
    });
  }
  
  roles.forEach(role => {
    roleSelect.addOptions([
      {
        label: role.name.length > 100 ? role.name.substring(0, 97) + '...' : role.name,
        value: role.id,
        description: `Ajouter le rôle ${role.name}`,
        emoji: '🎭'
      }
    ]);
  });
  
  const row = new ActionRowBuilder().addComponents(roleSelect);
  
  await interaction.reply({
    content: 'Veuillez sélectionner un rôle à ajouter à l\'AutoRole :',
    components: [row],
    ephemeral: true
  });
}

// Fonction pour gérer la suppression de rôle via le bouton
async function handleRemoveRole(interaction) {
  const config = await getGuildAutoRoleConfig(interaction.guildId);
  
  if (config.roles.length === 0) {
    return interaction.reply({
      embeds: [createErrorEmbed('Erreur', 'Aucun rôle configuré pour l\'AutoRole.')],
      ephemeral: true
    });
  }
  
  // Créer un sélecteur de rôle avec uniquement les rôles configurés
  const roleSelect = new StringSelectMenuBuilder()
    .setCustomId('autorole_remove_role')
    .setPlaceholder('Sélectionnez un rôle à retirer')
    .setMinValues(1)
    .setMaxValues(1);
  
  // Ajouter les rôles configurés
  config.roles.forEach(roleId => {
    const role = interaction.guild.roles.cache.get(roleId);
    if (role) {
      roleSelect.addOptions([
        {
          label: role.name.length > 100 ? role.name.substring(0, 97) + '...' : role.name,
          value: roleId,
          description: `Retirer ce rôle de l'AutoRole`,
          emoji: '🗑️'
        }
      ]);
    }
  });
  
  const row = new ActionRowBuilder().addComponents(roleSelect);
  
  await interaction.reply({
    content: 'Sélectionnez un rôle à retirer de l\'AutoRole :',
    components: [row],
    ephemeral: true
  });
}

// Fonction pour activer/désactiver l'AutoRole
async function handleToggleAutoRole(interaction) {
  const { guild, user } = interaction;
  const config = await getGuildAutoRoleConfig(guild.id);
  const newStatus = !config.active;
  
  // Mettre à jour la configuration
  await updateGuildAutoRoleConfig(guild.id, { active: newStatus });
  
  // Créer l'embed de réponse
  const responseEmbed = createSuccessEmbed(
    'Paramètre mis à jour',
    `L'AutoRole a été ${newStatus ? 'activé' : 'désactivé'} avec succès.`
  );
  
  // Répondre à l'interaction
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ embeds: [responseEmbed] });
  } else {
    await interaction.reply({ embeds: [responseEmbed], ephemeral: true });
  }
  
  // Envoyer un log
  try {
    const logEmbed = new EmbedBuilder()
      .setColor(newStatus ? 0x4CAF50 : 0xF44336)
      .setTitle(`🔧 AutoRole ${newStatus ? 'activé' : 'désactivé'}`)
      .setDescription(`**Modérateur:** ${user} (${user.id})\n**Action:** L'AutoRole a été ${newStatus ? 'activé' : 'désactiv' + (newStatus ? 'é' : 'e')}`)
      .setTimestamp();
      
    await sendAutoRoleLog(interaction.client, guild.id, logEmbed);
  } catch (logError) {
    console.error('Erreur lors de l\'envoi du log de basculement AutoRole:', logError);
  }
  
  // Rafraîchir le panneau
  await showAutoRolePanel(interaction);
}

// Fonction pour réinitialiser les rôles AutoRole
async function handleResetRoles(interaction) {
  const { guild, user } = interaction;
  const config = await getGuildAutoRoleConfig(guild.id);
  const removedRolesCount = config.roles?.length || 0;
  
  // Mettre à jour la configuration
  await updateGuildAutoRoleConfig(guild.id, { roles: [] });
  
  // Créer l'embed de réponse
  const responseEmbed = createSuccessEmbed(
    'Réinitialisation effectuée',
    `Tous les rôles AutoRole (${removedRolesCount}) ont été supprimés.`
  );
  
  // Répondre à l'interaction
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ embeds: [responseEmbed] });
  } else {
    await interaction.reply({ embeds: [responseEmbed], ephemeral: true });
  }
  
  // Envoyer un log si des rôles ont été supprimés
  if (removedRolesCount > 0) {
    try {
      const logEmbed = new EmbedBuilder()
        .setColor(0xF44336)
        .setTitle('🗑️ Rôles AutoRole réinitialisés')
        .setDescription(`**Modérateur:** ${user} (${user.id})\n**Action:** ${removedRolesCount} rôle(s) AutoRole supprimé(s)`)
        .setTimestamp();
        
      await sendAutoRoleLog(interaction.client, guild.id, logEmbed);
    } catch (logError) {
      console.error('Erreur lors de l\'envoi du log de réinitialisation AutoRole:', logError);
    }
  }
  
  // Rafraîchir le panneau
  await showAutoRolePanel(interaction);
}

// Fonction pour afficher le panneau AutoRole
async function showAutoRolePanel(interaction) {
  const { guild } = interaction;
  const config = await getGuildAutoRoleConfig(guild.id);
  
  // Préparer la liste des rôles
  let rolesList = '*Aucun rôle configuré*';
  let rolesCount = 0;
  
  if (config.roles.length > 0) {
    const validRoles = [];
    
    // Vérifier chaque rôle pour s'assurer qu'il existe toujours
    for (const roleId of config.roles) {
      const role = guild.roles.cache.get(roleId);
      if (role) {
        validRoles.push(`• ${role} (${role.id})`);
        rolesCount++;
      }
    }
    
    // Mettre à jour la configuration si des rôles invalides ont été trouvés
    if (validRoles.length !== config.roles.length) {
      const validRoleIds = validRoles.map(r => r.match(/\(\d+\)/)[0].slice(1, -1));
      await updateGuildAutoRoleConfig(guild.id, { roles: validRoleIds });
    }
    
    if (validRoles.length > 0) {
      rolesList = validRoles.join('\n');
    }
  }
  
  // Créer l'embed
  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle('⚙️ Configuration AutoRole')
    .setDescription('Gérez les rôles attribués automatiquement aux nouveaux membres.')
    .addFields(
      { 
        name: '📊 Statut', 
        value: config.active ? '🟢 **Activé**\nLes nouveaux membres recevront automatiquement les rôles configurés.' : '🔴 **Désactivé**\nAucun rôle ne sera attribué automatiquement.', 
        inline: false 
      },
      { 
        name: `🏷️ Rôles configurés (${rolesCount})`, 
        value: rolesList,
        inline: false 
      }
    )
    .setFooter({ text: `ID du serveur: ${guild.id}` })
    .setTimestamp();

  // Créer les boutons
  const addButton = new ButtonBuilder()
    .setCustomId('autorole_add')
    .setLabel('Ajouter un rôle')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('➕');
    
  const removeButton = new ButtonBuilder()
    .setCustomId('autorole_remove')
    .setLabel('Retirer un rôle')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('➖')
    .setDisabled(config.roles.length === 0);
    
  const toggleButton = new ButtonBuilder()
    .setCustomId('autorole_toggle')
    .setLabel(config.active ? 'Désactiver' : 'Activer')
    .setStyle(config.active ? ButtonStyle.Danger : ButtonStyle.Success)
    .setEmoji(config.active ? '❌' : '✅');
    
  const resetButton = new ButtonBuilder()
    .setCustomId('autorole_reset')
    .setLabel('Réinitialiser')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('🔄')
    .setDisabled(config.roles.length === 0);
    
  const row = new ActionRowBuilder()
    .addComponents(addButton, removeButton, toggleButton, resetButton);

  // Vérifier si c'est une mise à jour ou une nouvelle réponse
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({
      embeds: [embed],
      components: [row]
    });
  } else {
    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  }
}

export default {
  name: 'interactionCreate',
  async execute(interaction) {
    try {
      // Gérer les interactions de boutons
      if (interaction.isButton() && interaction.customId.startsWith('autorole_')) {
        return await handleButtonInteraction(interaction);
      }
      
      // Gérer les sélecteurs de rôle
      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'autorole_select_role') {
          return await handleRoleSelection(interaction);
        }
        if (interaction.customId === 'autorole_remove_role') {
          return await handleRoleRemoval(interaction);
        }
      }
      
      // Gérer les commandes slash (au cas où elles ne sont pas gérées ailleurs)
      if (interaction.isChatInputCommand() && interaction.commandName === 'autorole') {
        // La commande slash est déjà gérée par le fichier de commande
        return;
      }
    } catch (error) {
      console.error('Erreur dans le gestionnaire d\'interactions:', error);
      
      // Créer un embed d'erreur
      const errorEmbed = createErrorEmbed(
        '❌ Erreur',
        'Une erreur est survenue lors du traitement de votre demande. Veuillez réessayer plus tard.'
      );
      
      // Répondre à l'interaction
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          embeds: [errorEmbed],
          ephemeral: true
        });
      } else {
        await interaction.reply({
          embeds: [errorEmbed],
          ephemeral: true
        });
      }
      
      // Logger l'erreur complète pour le débogage
      console.error('Détails de l\'erreur:', {
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        userId: interaction.user.id,
        customId: interaction.customId,
        error: {
          message: error.message,
          stack: error.stack
        }
      });
    }
  }
};

// Gérer la sélection d'un rôle à ajouter
async function handleRoleSelection(interaction) {
  const { guild, user } = interaction;
  const roleId = interaction.values[0];
  const role = guild.roles.cache.get(roleId);
  
  if (!role) {
    return interaction.update({
      content: 'Erreur: Rôle introuvable.',
      components: []
    });
  }
  
  const config = await getGuildAutoRoleConfig(guild.id);
  
  // Vérifier si le rôle est déjà dans la liste
  if (config.roles.includes(roleId)) {
    return interaction.update({
      content: `Le rôle ${role} est déjà configuré pour l'AutoRole.`,
      components: []
    });
  }
  
  // Ajouter le rôle à la configuration
  await updateGuildAutoRoleConfig(guild.id, {
    roles: [...config.roles, roleId]
  });
  
  // Mettre à jour l'interaction
  await interaction.update({
    content: `Le rôle ${role} a été ajouté à l'AutoRole avec succès !`,
    components: []
  });
  
  // Envoyer un log
  try {
    const logEmbed = new EmbedBuilder()
      .setColor(0x4CAF50)
      .setTitle('➕ Rôle AutoRole ajouté')
      .setDescription(`**Modérateur:** ${user} (${user.id})\n**Rôle ajouté:** ${role} (${role.id})\n**Total des rôles AutoRole:** ${config.roles.length + 1}`)
      .setTimestamp();
      
    await sendAutoRoleLog(interaction.client, guild.id, logEmbed);
  } catch (logError) {
    console.error('Erreur lors de l\'envoi du log d\'ajout de rôle AutoRole:', logError);
  }
  
  // Rafraîchir le panneau
  await showAutoRolePanel(interaction);
}

// Gérer la suppression d'un rôle
async function handleRoleRemoval(interaction) {
  const { guild, user } = interaction;
  const roleId = interaction.values[0];
  const role = guild.roles.cache.get(roleId);
  
  if (!role) {
    return interaction.update({
      content: 'Erreur: Rôle introuvable.',
      components: []
    });
  }
  
  const config = await getGuildAutoRoleConfig(guild.id);
  
  // Vérifier si le rôle est dans la liste
  if (!config.roles.includes(roleId)) {
    return interaction.update({
      content: `Le rôle ${role} n'est pas configuré pour l'AutoRole.`,
      components: []
    });
  }
  
  // Supprimer le rôle de la configuration
  await updateGuildAutoRoleConfig(guild.id, {
    roles: config.roles.filter(id => id !== roleId)
  });
  
  // Mettre à jour l'interaction
  await interaction.update({
    content: `Le rôle ${role} a été retiré de l'AutoRole avec succès !`,
    components: []
  });
  
  // Envoyer un log
  try {
    const logEmbed = new EmbedBuilder()
      .setColor(0xF44336)
      .setTitle('➖ Rôle AutoRole supprimé')
      .setDescription(`**Modérateur:** ${user} (${user.id})\n**Rôle supprimé:** ${role} (${role.id})\n**Total des rôles AutoRole restants:** ${config.roles.length - 1}`)
      .setTimestamp();
      
    await sendAutoRoleLog(interaction.client, guild.id, logEmbed);
  } catch (logError) {
    console.error('Erreur lors de l\'envoi du log de suppression de rôle AutoRole:', logError);
  }
  
  // Rafraîchir le panneau
  await showAutoRolePanel(interaction);
}
