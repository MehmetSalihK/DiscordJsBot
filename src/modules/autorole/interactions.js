import { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  MessageFlags
} from 'discord.js';

import { 
  getGuildConfig, 
  toggleAutoRole, 
  addRole, 
  removeRole, 
  setLogChannel, 
  resetGuildConfig 
} from './storage.js';

import { validateRoleForAutoRole, getAutoRoleStats } from './core.js';
import { logConfig } from './logger.js';

/**
 * Crée un embed d'erreur
 */
function createErrorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle(`❌ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

/**
 * Crée un embed de succès
 */
function createSuccessEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

/**
 * Crée un embed d'information
 */
function createInfoEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle(`ℹ️ ${title}`)
    .setDescription(description)
    .setTimestamp();
}

/**
 * Crée l'embed principal du panneau AutoRole
 */
export function createPanelEmbed(guild, config, stats) {
  const embed = new EmbedBuilder()
    .setColor(config.enabled ? 0x00FF00 : 0xFF0000)
    .setTitle('🤖 Panneau de configuration AutoRole')
    .setDescription(`Configuration AutoRole pour **${guild.name}**\n\n📊 **${stats.totalRoles} rôle(s) configuré(s)**`)
    .addFields(
      {
        name: '📊 Statut du système',
        value: config.enabled ? '✅ **Activé**' : '❌ **Désactivé**',
        inline: true
      },
      {
        name: '🎭 Rôles valides',
        value: `${stats.validRoles}/${stats.totalRoles}`,
        inline: true
      },
      {
        name: '📝 Canal de logs',
        value: config.logChannel ? `<#${config.logChannel}>` : '❌ Non configuré',
        inline: true
      }
    )
    .setFooter({ text: 'Utilisez les boutons ci-dessous pour configurer l\'AutoRole' })
    .setTimestamp();

  return embed;
}

/**
 * Crée les composants (boutons) du panneau AutoRole
 */
export function createPanelComponents() {
  const row1 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('autorole_toggle')
        .setLabel('Activer/Désactiver')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔄'),
      new ButtonBuilder()
        .setCustomId('autorole_add_role')
        .setLabel('Ajouter')
        .setStyle(ButtonStyle.Success)
        .setEmoji('➕'),
      new ButtonBuilder()
        .setCustomId('autorole_remove_role')
        .setLabel('Supprimer')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('➖'),
      new ButtonBuilder()
        .setCustomId('autorole_list')
        .setLabel('Voir la liste')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📋')
    );

  const row2 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('autorole_config_logs')
        .setLabel('Configurer les logs')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📝'),
      new ButtonBuilder()
        .setCustomId('autorole_reset')
        .setLabel('Reset')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🗑️'),
      new ButtonBuilder()
        .setCustomId('autorole_refresh')
        .setLabel('Refresh')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄'),
      new ButtonBuilder()
        .setCustomId('autorole_close')
        .setLabel('Fermer le panneau')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❌')
    );

  return [row1, row2];
}

/**
 * Gestionnaire principal des interactions AutoRole
 */
export async function handleAutoRoleInteraction(interaction) {
  if (!interaction.member.permissions.has('Administrator')) {
    const embed = createErrorEmbed(
      '❌ Permissions insuffisantes',
      'Vous devez être administrateur pour utiliser cette fonctionnalité.'
    );
    
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }

  try {
    const customId = interaction.customId;

    switch (customId) {
      case 'autorole_toggle':
        await handleToggleInteraction(interaction);
        break;
      case 'autorole_add_role':
        await handleAddRoleInteraction(interaction);
        break;
      case 'autorole_remove_role':
        await handleRemoveRoleInteraction(interaction);
        break;
      case 'autorole_config_logs':
        await handleConfigLogsInteraction(interaction);
        break;
      case 'autorole_reset':
        await handleResetInteraction(interaction);
        break;
      case 'autorole_reset_confirm':
        await handleResetConfirmInteraction(interaction);
        break;
      case 'autorole_reset_cancel':
        await handleResetCancelInteraction(interaction);
        break;
      case 'autorole_role_select':
        await handleRoleSelectInteraction(interaction);
        break;
      case 'autorole_role_remove_select':
        await handleRoleRemoveSelectInteraction(interaction);
        break;
      case 'autorole_channel_select':
        await handleChannelSelectInteraction(interaction);
        break;
      case 'autorole_list':
        await handleListInteraction(interaction);
        break;
      case 'autorole_refresh':
        await handleRefreshInteraction(interaction);
        break;
      case 'autorole_close':
        await handleCloseInteraction(interaction);
        break;
      default:
        if (customId.startsWith('autorole_add_next_')) {
          const page = parseInt(customId.split('_').pop());
          await handleAddRolePaginationNext(interaction, page);
        } else if (customId.startsWith('autorole_add_prev_')) {
          const page = parseInt(customId.split('_').pop());
          await handleAddRolePaginationPrev(interaction, page);
        } else if (customId.startsWith('autorole_')) {
          await interaction.reply({
            content: '❌ Interaction non reconnue.',
            flags: MessageFlags.Ephemeral
          });
        }
    }
  } catch (error) {
    console.error('Erreur dans l\'interaction AutoRole:', error);
    
    const embed = createErrorEmbed(
      'Erreur système',
      'Une erreur inattendue s\'est produite.'
    );

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  }
}

/**
 * Gère l'interaction de toggle (activer/désactiver)
 */
async function handleToggleInteraction(interaction) {
  await interaction.deferUpdate();
  
  const config = getGuildConfig(interaction.guild.id);
  const newState = !config.enabled;

  const success = toggleAutoRole(interaction.guild.id, newState);

  if (success) {
    const action = newState ? 'activé' : 'désactivé';
    const emoji = newState ? '✅' : '❌';

    await logConfig(
      interaction.guild,
      interaction.user,
      `AutoRole ${action}`,
      `Le système AutoRole a été ${action} via le panneau de contrôle.`
    );

    // Mettre à jour le panneau
    await updatePanel(interaction);

    const embed = createSuccessEmbed(
      `${emoji} AutoRole ${action}`,
      `Le système AutoRole a été ${action} avec succès.`
    );

    await interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral });
  } else {
    const embed = createErrorEmbed(
      'Erreur',
      'Impossible de modifier l\'état du système AutoRole.'
    );

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
}

/**
 * Gère la pagination pour l'ajout de rôles (page suivante)
 */
async function handleAddRolePaginationNext(interaction, currentPage) {
  try {
    const config = getGuildConfig(interaction.guild.id);
    const currentRoles = config.roles || [];
    const newPage = currentPage + 1;

    // Filtrer les rôles disponibles
    const availableRoles = interaction.guild.roles.cache
      .filter(role => 
        !role.managed && 
        role.id !== interaction.guild.id && 
        !currentRoles.includes(role.id) && 
        role.name !== '@everyone'
      )
      .sort((a, b) => b.position - a.position);

    const rolesPerPage = 25;
    const totalPages = Math.ceil(availableRoles.size / rolesPerPage);
    const startIndex = newPage * rolesPerPage;
    const endIndex = startIndex + rolesPerPage;
    
    const rolesArray = Array.from(availableRoles.values());
    const rolesToShow = rolesArray.slice(startIndex, endIndex);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('autorole_role_select')
      .setPlaceholder('Sélectionnez un rôle à ajouter')
      .addOptions(
        rolesToShow.map(role => ({
          label: role.name.length > 100 ? role.name.substring(0, 97) + '...' : role.name,
          value: role.id,
          description: `Position: ${role.position} | Membres: ${role.members.size}`,
          emoji: '🎭'
        }))
      );

    const components = [new ActionRowBuilder().addComponents(selectMenu)];

    // Boutons de pagination
    if (totalPages > 1) {
      const paginationButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`autorole_add_prev_${newPage}`)
          .setLabel('◀️ Précédent')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(newPage === 0),
        new ButtonBuilder()
          .setCustomId(`autorole_add_next_${newPage}`)
          .setLabel('Suivant ▶️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(newPage === totalPages - 1)
      );
      components.push(paginationButtons);
    }

    let description = `Sélectionnez le rôle que vous souhaitez ajouter à l\'AutoRole.\n\n`;
    description += `**Rôles disponibles :** ${availableRoles.size}\n`;
    description += `**Rôles déjà configurés :** ${currentRoles.length}`;
    
    if (totalPages > 1) {
      description += `\n\n📄 **Page ${newPage + 1}/${totalPages}** - Utilisez les boutons pour naviguer`;
    }

    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('➕ Ajouter un rôle')
      .setDescription(description)
      .setFooter({ 
        text: totalPages > 1 
          ? `Page ${newPage + 1}/${totalPages} - ${rolesToShow.length} rôles sur cette page`
          : `${rolesToShow.length} rôles disponibles`
      });

    await interaction.update({ embeds: [embed], components });
  } catch (error) {
    console.error('Erreur dans handleAddRolePaginationNext:', error);
    
    const embed = createErrorEmbed(
      'Erreur',
      'Une erreur s\'est produite lors de la navigation.'
    );
    
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
}

/**
 * Gère la pagination pour l'ajout de rôles (page précédente)
 */
async function handleAddRolePaginationPrev(interaction, currentPage) {
  try {
    const config = getGuildConfig(interaction.guild.id);
    const currentRoles = config.roles || [];
    const newPage = currentPage - 1;

    // Filtrer les rôles disponibles
    const availableRoles = interaction.guild.roles.cache
      .filter(role => 
        !role.managed && 
        role.id !== interaction.guild.id && 
        !currentRoles.includes(role.id) && 
        role.name !== '@everyone'
      )
      .sort((a, b) => b.position - a.position);

    const rolesPerPage = 25;
    const totalPages = Math.ceil(availableRoles.size / rolesPerPage);
    const startIndex = newPage * rolesPerPage;
    const endIndex = startIndex + rolesPerPage;
    
    const rolesArray = Array.from(availableRoles.values());
    const rolesToShow = rolesArray.slice(startIndex, endIndex);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('autorole_role_select')
      .setPlaceholder('Sélectionnez un rôle à ajouter')
      .addOptions(
        rolesToShow.map(role => ({
          label: role.name.length > 100 ? role.name.substring(0, 97) + '...' : role.name,
          value: role.id,
          description: `Position: ${role.position} | Membres: ${role.members.size}`,
          emoji: '🎭'
        }))
      );

    const components = [new ActionRowBuilder().addComponents(selectMenu)];

    // Boutons de pagination
    if (totalPages > 1) {
      const paginationButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`autorole_add_prev_${newPage}`)
          .setLabel('◀️ Précédent')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(newPage === 0),
        new ButtonBuilder()
          .setCustomId(`autorole_add_next_${newPage}`)
          .setLabel('Suivant ▶️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(newPage === totalPages - 1)
      );
      components.push(paginationButtons);
    }

    let description = `Sélectionnez le rôle que vous souhaitez ajouter à l\'AutoRole.\n\n`;
    description += `**Rôles disponibles :** ${availableRoles.size}\n`;
    description += `**Rôles déjà configurés :** ${currentRoles.length}`;
    
    if (totalPages > 1) {
      description += `\n\n📄 **Page ${newPage + 1}/${totalPages}** - Utilisez les boutons pour naviguer`;
    }

    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('➕ Ajouter un rôle')
      .setDescription(description)
      .setFooter({ 
        text: totalPages > 1 
          ? `Page ${newPage + 1}/${totalPages} - ${rolesToShow.length} rôles sur cette page`
          : `${rolesToShow.length} rôles disponibles`
      });

    await interaction.update({ embeds: [embed], components });
  } catch (error) {
    console.error('Erreur dans handleAddRolePaginationPrev:', error);
    
    const embed = createErrorEmbed(
      'Erreur',
      'Une erreur s\'est produite lors de la navigation.'
    );
    
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
}

/**
 * Gère l'interaction d'ajout de rôle
 */
async function handleAddRoleInteraction(interaction) {
  const config = getGuildConfig(interaction.guild.id);
  const currentRoles = config.roles || [];

  // Filtrer les rôles : exclure les rôles gérés, @everyone, et ceux déjà dans AutoRole
  const availableRoles = interaction.guild.roles.cache
    .filter(role => 
      !role.managed && // Pas de rôles de bot
      role.id !== interaction.guild.id && // Pas @everyone
      !currentRoles.includes(role.id) && // Pas déjà dans AutoRole
      role.name !== '@everyone' // Double vérification
    )
    .sort((a, b) => b.position - a.position);

  if (availableRoles.size === 0) {
    const embed = createErrorEmbed(
      'Aucun rôle disponible',
      'Aucun rôle valide n\'est disponible pour l\'AutoRole.\n\n' +
      '**Raisons possibles :**\n' +
      '• Tous les rôles sont déjà configurés\n' +
      '• Seuls les rôles de bot sont disponibles\n' +
      '• Aucun rôle n\'existe sur ce serveur'
    );

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }

  // Pagination : 25 rôles par page (limite Discord)
  const rolesPerPage = 25;
  const page = 0; // Première page par défaut
  const totalPages = Math.ceil(availableRoles.size / rolesPerPage);
  const startIndex = page * rolesPerPage;
  const endIndex = startIndex + rolesPerPage;
  
  const rolesArray = Array.from(availableRoles.values());
  const rolesToShow = rolesArray.slice(startIndex, endIndex);

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('autorole_role_select')
    .setPlaceholder('Sélectionnez un rôle à ajouter')
    .addOptions(
      rolesToShow.map(role => ({
        label: role.name.length > 100 ? role.name.substring(0, 97) + '...' : role.name,
        value: role.id,
        description: `Position: ${role.position} | Membres: ${role.members.size}`,
        emoji: '🎭'
      }))
    );

  const components = [new ActionRowBuilder().addComponents(selectMenu)];

  // Ajouter les boutons de pagination si nécessaire
  if (totalPages > 1) {
    const paginationButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`autorole_add_prev_${page}`)
        .setLabel('◀️ Précédent')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`autorole_add_next_${page}`)
        .setLabel('Suivant ▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === totalPages - 1)
    );
    components.push(paginationButtons);
  }

  let description = `Sélectionnez le rôle que vous souhaitez ajouter à l\'AutoRole.\n\n`;
  description += `**Rôles disponibles :** ${availableRoles.size}\n`;
  description += `**Rôles déjà configurés :** ${currentRoles.length}`;
  
  if (totalPages > 1) {
    description += `\n\n📄 **Page ${page + 1}/${totalPages}** - Utilisez les boutons pour naviguer`;
  }

  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('➕ Ajouter un rôle')
    .setDescription(description)
    .setFooter({ 
      text: totalPages > 1 
        ? `Page ${page + 1}/${totalPages} - ${rolesToShow.length} rôles sur cette page`
        : `${rolesToShow.length} rôles disponibles`
    });

  await interaction.reply({ embeds: [embed], components, flags: MessageFlags.Ephemeral });
}

/**
 * Gère l'interaction de suppression de rôle
 */
async function handleRemoveRoleInteraction(interaction) {
  const config = getGuildConfig(interaction.guild.id);

  if (config.roles.length === 0) {
    const embed = createWarningEmbed(
      'Aucun rôle configuré',
      'Aucun rôle n\'est actuellement configuré dans l\'AutoRole.'
    );

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }

  const roleOptions = config.roles
    .map(roleId => {
      const role = interaction.guild.roles.cache.get(roleId);
      return role ? {
        label: role.name,
        value: role.id,
        description: `Position: ${role.position}`,
        emoji: '🎭'
      } : {
        label: `Rôle supprimé (${roleId})`,
        value: roleId,
        description: 'Ce rôle n\'existe plus',
        emoji: '❌'
      };
    })
    .slice(0, 25);

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('autorole_role_remove_select')
    .setPlaceholder('Sélectionnez un rôle à supprimer')
    .addOptions(roleOptions);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  const embed = new EmbedBuilder()
    .setColor(0xFF6B6B)
    .setTitle('➖ Supprimer un rôle')
    .setDescription('Sélectionnez le rôle que vous souhaitez supprimer de l\'AutoRole.')
    .setFooter({ text: 'Les rôles supprimés du serveur sont marqués en rouge' });

  await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
}

/**
 * Gère l'interaction de configuration des logs
 */
async function handleConfigLogsInteraction(interaction) {
  const channels = interaction.guild.channels.cache
    .filter(channel => channel.type === ChannelType.GuildText && channel.permissionsFor(interaction.guild.members.me).has(['SendMessages', 'EmbedLinks']))
    .sort((a, b) => a.name.localeCompare(b.name))
    .first(24);

  const options = [
    {
      label: 'Désactiver les logs',
      value: 'disable',
      description: 'Désactive complètement les logs AutoRole',
      emoji: '❌'
    },
    ...channels.map(channel => ({
      label: `#${channel.name}`,
      value: channel.id,
      description: `Canal textuel - ${channel.topic || 'Pas de description'}`.substring(0, 100),
      emoji: '📝'
    }))
  ];

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('autorole_channel_select')
    .setPlaceholder('Sélectionnez un canal pour les logs')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('📝 Configuration des logs')
    .setDescription('Sélectionnez le canal où les logs AutoRole seront envoyés, ou désactivez-les.')
    .setFooter({ text: 'Seuls les canaux où le bot peut écrire sont affichés' });

  await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
}

/**
 * Gère l'interaction de réinitialisation
 */
async function handleResetInteraction(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0xFF6B6B)
    .setTitle('🗑️ Confirmation de réinitialisation')
    .setDescription('⚠️ **Attention !** Cette action va supprimer définitivement toute la configuration AutoRole de ce serveur.')
    .addFields({
      name: '📋 Configuration actuelle',
      value: await getConfigSummary(interaction.guild),
      inline: false
    })
    .setFooter({ text: 'Cette action est irréversible !' });

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('autorole_reset_confirm')
        .setLabel('Confirmer la réinitialisation')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🗑️'),
      new ButtonBuilder()
        .setCustomId('autorole_reset_cancel')
        .setLabel('Annuler')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('❌')
    );

  await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
}

/**
 * Gère la confirmation de réinitialisation
 */
async function handleResetConfirmInteraction(interaction) {
  await interaction.deferUpdate();
  
  const success = resetGuildConfig(interaction.guild.id);

  if (success) {
    await logConfig(
      interaction.guild,
      interaction.user,
      'Réinitialisation complète',
      'La configuration AutoRole a été complètement réinitialisée.'
    );

    // Mettre à jour le panneau principal
    await updatePanel(interaction);

    const embed = createSuccessEmbed(
      '🗑️ Configuration réinitialisée',
      'La configuration AutoRole a été complètement réinitialisée avec succès.'
    );

    await interaction.editReply({ embeds: [embed], components: [] });
  } else {
    const embed = createErrorEmbed(
      'Erreur',
      'Impossible de réinitialiser la configuration AutoRole.'
    );

    await interaction.editReply({ embeds: [embed], components: [] });
  }
}

/**
 * Gère l'annulation de réinitialisation
 */
async function handleResetCancelInteraction(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('✅ Réinitialisation annulée')
    .setDescription('La réinitialisation de la configuration AutoRole a été annulée.')
    .setTimestamp();

  await interaction.update({ embeds: [embed], components: [] });
}

/**
 * Gère la sélection de rôle pour ajout
 */
async function handleRoleSelectInteraction(interaction) {
  const roleId = interaction.values[0];
  const role = interaction.guild.roles.cache.get(roleId);

  if (!role) {
    const embed = createErrorEmbed(
      'Rôle introuvable',
      'Le rôle sélectionné n\'existe plus.'
    );

    await interaction.update({ embeds: [embed], components: [] });
    return;
  }

  const validation = validateRoleForAutoRole(interaction.guild, role);

  if (!validation.valid) {
    const embed = createErrorEmbed('Rôle invalide', validation.reason);
    await interaction.update({ embeds: [embed], components: [] });
    return;
  }

  const success = addRole(interaction.guild.id, role.id);

  if (success) {
    await logConfig(
      interaction.guild,
      interaction.user,
      'Ajout de rôle',
      `Le rôle ${role.name} (${role.id}) a été ajouté à l'AutoRole via le panneau.`
    );

    // Mettre à jour le panneau principal
    await updatePanel(interaction);

    const embed = createSuccessEmbed(
      '✅ Rôle ajouté',
      `Le rôle ${role} a été ajouté à l'AutoRole avec succès.`
    );

    await interaction.update({ embeds: [embed], components: [] });
  } else {
    const embed = createWarningEmbed(
      '⚠️ Rôle déjà présent',
      `Le rôle ${role} est déjà dans la liste AutoRole.`
    );

    await interaction.update({ embeds: [embed], components: [] });
  }
}

/**
 * Gère la sélection de rôle pour suppression
 */
async function handleRoleRemoveSelectInteraction(interaction) {
  const roleId = interaction.values[0];
  const role = interaction.guild.roles.cache.get(roleId);
  const roleName = role ? role.name : `Rôle supprimé (${roleId})`;

  const success = removeRole(interaction.guild.id, roleId);

  if (success) {
    await logConfig(
      interaction.guild,
      interaction.user,
      'Suppression de rôle',
      `Le rôle ${roleName} (${roleId}) a été supprimé de l'AutoRole via le panneau.`
    );

    // Mettre à jour le panneau principal
    await updatePanel(interaction);

    const embed = createSuccessEmbed(
      '✅ Rôle supprimé',
      `Le rôle **${roleName}** a été supprimé de l'AutoRole avec succès.`
    );

    await interaction.update({ embeds: [embed], components: [] });
  } else {
    const embed = createWarningEmbed(
      '⚠️ Rôle non trouvé',
      `Le rôle **${roleName}** n'était pas dans la liste AutoRole.`
    );

    await interaction.update({ embeds: [embed], components: [] });
  }
}

/**
 * Gère la sélection de canal pour les logs
 */
async function handleChannelSelectInteraction(interaction) {
  const channelId = interaction.values[0] === 'disable' ? null : interaction.values[0];
  const channel = channelId ? interaction.guild.channels.cache.get(channelId) : null;

  const success = setLogChannel(interaction.guild.id, channelId);

  if (success) {
    const action = channel ? 'configuré' : 'désactivé';
    const details = channel 
      ? `Le canal ${channel.name} (${channel.id}) a été défini comme canal de logs AutoRole via le panneau.`
      : 'Les logs AutoRole ont été désactivés via le panneau.';

    await logConfig(
      interaction.guild,
      interaction.user,
      'Configuration des logs',
      details
    );

    // Mettre à jour le panneau principal
    await updatePanel(interaction);

    const embed = createSuccessEmbed(
      `✅ Logs ${action}`,
      channel 
        ? `Le canal ${channel} a été configuré pour les logs AutoRole.`
        : 'Les logs AutoRole ont été désactivés.'
    );

    await interaction.update({ embeds: [embed], components: [] });
  } else {
    const embed = createErrorEmbed(
      'Erreur',
      'Impossible de configurer le canal de logs.'
    );

    await interaction.update({ embeds: [embed], components: [] });
  }
}

/**
 * Met à jour le panneau principal
 */
async function updatePanel(interaction) {
  try {
    const config = getGuildConfig(interaction.guild.id);
    const stats = getAutoRoleStats(interaction.guild);

    const embed = createPanelEmbed(interaction.guild, config, stats);
    const components = createPanelComponents();

    // Trouver le message original du panneau et le mettre à jour
    const originalMessage = interaction.message;
    if (originalMessage && !originalMessage.ephemeral) {
      try {
        await originalMessage.edit({ embeds: [embed], components });
      } catch (editError) {
        // Si le message ne peut pas être modifié (supprimé, permissions, etc.)
        // On ignore silencieusement l'erreur car ce n'est pas critique
        console.log('Impossible de mettre à jour le panneau principal (message supprimé ou inaccessible)');
      }
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour du panneau:', error);
  }
}

/**
 * Gère l'affichage de la liste des rôles AutoRole
 */
async function handleListInteraction(interaction) {
  try {
    const config = getGuildConfig(interaction.guild.id);
    
    if (!config.roles || config.roles.length === 0) {
      const embed = createInfoEmbed(
        'Liste des rôles AutoRole',
        'Aucun rôle n\'est configuré pour l\'AutoRole sur ce serveur.'
      );
      
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    // Récupérer les rôles du serveur et vérifier lesquels existent encore
    const validRoles = [];
    const invalidRoles = [];

    for (const roleId of config.roles) {
      const role = interaction.guild.roles.cache.get(roleId);
      if (role) {
        validRoles.push(`• ${role.name} (${role.id})`);
      } else {
        invalidRoles.push(`• Rôle supprimé (${roleId})`);
      }
    }

    let description = '';
    
    if (validRoles.length > 0) {
      description += `**Rôles actifs (${validRoles.length}):**\n${validRoles.join('\n')}`;
    }
    
    if (invalidRoles.length > 0) {
      if (description) description += '\n\n';
      description += `**Rôles invalides (${invalidRoles.length}):**\n${invalidRoles.join('\n')}`;
    }

    const embed = createInfoEmbed(
      'Liste des rôles AutoRole',
      description
    );

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  } catch (error) {
    console.error('Erreur dans handleListInteraction:', error);
    
    const embed = createErrorEmbed(
      'Erreur',
      'Une erreur s\'est produite lors de l\'affichage de la liste des rôles.'
    );
    
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
}

/**
 * Gère le rafraîchissement du panneau
 */
async function handleRefreshInteraction(interaction) {
  try {
    await updatePanel(interaction);
    
    const embed = createSuccessEmbed(
      'Panneau rafraîchi',
      'Le panneau AutoRole a été mis à jour avec les dernières informations.'
    );
    
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  } catch (error) {
    console.error('Erreur dans handleRefreshInteraction:', error);
    
    const embed = createErrorEmbed(
      'Erreur',
      'Une erreur s\'est produite lors du rafraîchissement du panneau.'
    );
    
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
}

/**
 * Gère la fermeture du panneau
 */
async function handleCloseInteraction(interaction) {
  try {
    const embed = createInfoEmbed(
      'Panneau fermé',
      'Le panneau AutoRole a été fermé. Utilisez `/autorole` pour le rouvrir.'
    );
    
    // Supprimer les composants du message original
    const originalMessage = interaction.message;
    if (originalMessage && !originalMessage.ephemeral) {
      try {
        await originalMessage.edit({ embeds: [embed], components: [] });
      } catch (editError) {
        console.log('Impossible de fermer le panneau (message supprimé ou inaccessible)');
      }
    }
    
    await interaction.reply({ 
      content: '✅ Panneau fermé avec succès.', 
      flags: MessageFlags.Ephemeral 
    });
  } catch (error) {
    console.error('Erreur dans handleCloseInteraction:', error);
    
    const embed = createErrorEmbed(
      'Erreur',
      'Une erreur s\'est produite lors de la fermeture du panneau.'
    );
    
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
}


