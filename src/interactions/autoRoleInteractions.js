import { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ComponentType
} from 'discord.js';
import { 
  getGuildAutoRoleConfig, 
  addAutoRole, 
  removeAutoRole, 
  setAutoRoleActive, 
  setAutoRoleLogChannel, 
  resetAutoRoleConfig 
} from '../store/autoRoleStore.js';
import { sendAutoRoleConfigLog } from '../utils/autoRoleLogs.js';

/**
 * Gestionnaire principal des interactions AutoRole
 * @param {Interaction} interaction - L'interaction Discord
 */
export async function handleAutoRoleInteraction(interaction) {
  if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) {
    return;
  }

  const customId = interaction.customId;
  
  // Vérifier si l'interaction a déjà été traitée
  if (interaction.replied || interaction.deferred) {
    console.warn('Interaction déjà traitée:', interaction.id);
    return;
  }

  try {
    // Vérifier les permissions
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({
        embeds: [createErrorEmbed('❌ Permission refusée', 'Vous devez être administrateur pour utiliser cette fonctionnalité.')],
        flags: 1 << 6 // EPHEMERAL
      });
    }

    // Différer la réponse immédiatement pour éviter l'expiration
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true }).catch(console.error);
    }

    // Router vers le bon gestionnaire
    if (customId.startsWith('autorole_')) {
      await handleAutoRoleButtons(interaction);
    } else if (customId.startsWith('autorole_select_')) {
      await handleAutoRoleSelects(interaction);
    } else if (customId.startsWith('autorole_modal_')) {
      await handleAutoRoleModals(interaction);
    }

  } catch (error) {
    console.error('Erreur dans les interactions AutoRole:', error);
    
    const errorEmbed = createErrorEmbed(
      '❌ Erreur système',
      'Une erreur inattendue s\'est produite lors du traitement de votre interaction.'
    );

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ 
          embeds: [errorEmbed],
          flags: 1 << 6 // EPHEMERAL
        });
      }
    } catch (replyError) {
      console.error('Erreur lors de l\'envoi du message d\'erreur:', replyError);
    }
  }
}

/**
 * Gestionnaire des interactions de boutons AutoRole
 * @param {ButtonInteraction} interaction - L'interaction de bouton
 */
async function handleAutoRoleButtons(interaction) {
  const customId = interaction.customId;
  
  // Vérifier si l'interaction a déjà été traitée
  if (interaction.replied || interaction.deferred) {
    console.warn('Interaction déjà traitée dans handleAutoRoleButtons:', interaction.id);
    return;
  }

  try {
    // Définir un gestionnaire pour le timeout
    const timeout = setTimeout(async () => {
      if (!interaction.replied && !interaction.deferred) {
        try {
          await interaction.editReply({
            embeds: [createErrorEmbed('⏱️ Délai dépassé', 'Le temps de traitement de la requête a expiré.')]
          });
        } catch (error) {
          console.error('Erreur lors de l\'envoi du message de timeout:', error);
        }
      }
    }, 5000);

    switch (customId) {
      case 'autorole_toggle':
        await handleToggleButton(interaction);
        break;
      case 'autorole_add':
        await handleAddButton(interaction);
        break;
      case 'autorole_remove':
        await handleRemoveButton(interaction);
        break;
      case 'autorole_logs':
        await handleLogsButton(interaction);
        break;
      case 'autorole_reset':
        await handleResetButton(interaction);
        break;
      case 'autorole_reset_confirm':
        await handleResetConfirm(interaction);
        break;
      case 'autorole_reset_cancel':
        await handleResetCancel(interaction);
        break;
      default:
        await interaction.editReply({
          embeds: [createErrorEmbed('❌ Erreur', 'Interaction de bouton non reconnue.')]
        });
    }

    // Nettoyer le timeout
    clearTimeout(timeout);
    
  } catch (error) {
    console.error('Erreur dans handleAutoRoleButtons:', error);
    
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.editReply({
          embeds: [createErrorEmbed('❌ Erreur', 'Une erreur est survenue lors du traitement de votre demande.')]
        });
      } catch (replyError) {
        console.error('Erreur lors de l\'envoi du message d\'erreur:', replyError);
      }
    }
  }
}

/**
 * Gestionnaire des menus de sélection AutoRole
 * @param {StringSelectMenuInteraction} interaction - L'interaction de menu
 */
async function handleAutoRoleSelects(interaction) {
  const customId = interaction.customId;

  switch (customId) {
    case 'autorole_select_remove':
      await handleRemoveSelect(interaction);
      break;
    case 'autorole_select_logs':
      await handleLogsSelect(interaction);
      break;
    default:
      await interaction.reply({
        embeds: [createErrorEmbed('❌ Erreur', 'Menu de sélection non reconnu.')],
        ephemeral: true
      });
  }
}

/**
 * Gestionnaire des modales AutoRole
 * @param {ModalSubmitInteraction} interaction - L'interaction de modale
 */
async function handleAutoRoleModals(interaction) {
  const customId = interaction.customId;

  switch (customId) {
    case 'autorole_modal_add':
      await handleAddModal(interaction);
      break;
    default:
      await interaction.reply({
        embeds: [createErrorEmbed('❌ Erreur', 'Modale non reconnue.')],
        ephemeral: true
      });
  }
}

/**
 * Gère le bouton de basculement (activer/désactiver)
 */
async function handleToggleButton(interaction) {
  await interaction.deferUpdate();
  
  const config = getGuildAutoRoleConfig(interaction.guild.id);
  const newState = !config.active;
  
  setAutoRoleActive(interaction.guild.id, newState);
  
  // Log de configuration
  await sendAutoRoleConfigLog(
    interaction.guild,
    interaction.user,
    newState ? 'Activation' : 'Désactivation',
    `Le système AutoRole a été ${newState ? 'activé' : 'désactivé'}.`
  );
  
  // Mettre à jour le panneau
  await updatePanel(interaction);
  
  // Envoyer un message de confirmation
  await interaction.followUp({
    embeds: [createSuccessEmbed(
      `🔄 AutoRole ${newState ? 'activé' : 'désactivé'}`,
      `Le système AutoRole a été **${newState ? 'activé' : 'désactivé'}** avec succès.`
    )],
    ephemeral: true
  });
}

/**
 * Gère le bouton d'ajout de rôle
 */
async function handleAddButton(interaction) {
  const roles = interaction.guild.roles.cache
    .filter(role => 
      !role.managed && 
      role.id !== interaction.guild.id && 
      role.position < interaction.guild.members.me.roles.highest.position
    )
    .sort((a, b) => b.position - a.position)
    .first(25);

  if (roles.length === 0) {
    return interaction.reply({
      embeds: [createErrorEmbed('❌ Aucun rôle disponible', 'Aucun rôle ne peut être ajouté à l\'AutoRole.')],
      ephemeral: true
    });
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('autorole_select_add')
    .setPlaceholder('Sélectionnez un rôle à ajouter')
    .addOptions(
      roles.map(role => ({
        label: role.name,
        value: role.id,
        description: `Position: ${role.position} • Membres: ${role.members.size}`,
        emoji: '🎭'
      }))
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

  // Vérifier si l'interaction a déjà été traitée
  if (interaction.replied || interaction.deferred) {
    await interaction.editReply({
      embeds: [createInfoEmbed('➕ Ajouter un rôle', 'Sélectionnez le rôle à ajouter à l\'AutoRole :')],
      components: [row]
    });
  } else {
    await interaction.reply({
      embeds: [createInfoEmbed('➕ Ajouter un rôle', 'Sélectionnez le rôle à ajouter à l\'AutoRole :')],
      components: [row],
      ephemeral: true
    });
  }

  // Créer un collecteur pour le menu de sélection
  const filter = i => i.customId === 'autorole_select_add' && i.user.id === interaction.user.id;
  const collector = interaction.channel.createMessageComponentCollector({ 
    filter, 
    time: 30000,
    max: 1 // Ne traiter qu'une seule sélection
  });

  collector.on('collect', async i => {
    try {
      await i.deferUpdate(); // Différer la réponse immédiatement
      
      const roleId = i.values[0];
      const role = interaction.guild.roles.cache.get(roleId);
      
      if (!role) {
        return interaction.editReply({
          embeds: [createErrorEmbed('❌ Erreur', 'Le rôle sélectionné est introuvable.')],
          components: []
        });
      }

      const success = addAutoRole(interaction.guild.id, roleId);
      
      if (success) {
        // Log de configuration
        await sendAutoRoleConfigLog(
          interaction.guild,
          interaction.user,
          'Ajout',
          `Le rôle ${role.name} (${role.id}) a été ajouté à l'AutoRole.`
        );
        
        await interaction.editReply({
          embeds: [createSuccessEmbed('✅ Rôle ajouté', `Le rôle ${role} a été ajouté à l'AutoRole avec succès.`)],
          components: []
        });
        
        // Mettre à jour le panneau principal si il existe
        await updatePanel(interaction);
      } else {
        await interaction.editReply({
          embeds: [createWarningEmbed('⚠️ Rôle déjà présent', `Le rôle ${role} est déjà dans la liste AutoRole.`)],
          components: []
        });
      }
    } catch (error) {
      console.error('Erreur lors du traitement de la sélection du rôle:', error);
      
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.editReply({
            embeds: [createErrorEmbed('❌ Erreur', 'Une erreur est survenue lors du traitement de votre sélection.')],
            components: []
          });
        }
      } catch (replyError) {
        console.error('Erreur lors de l\'envoi du message d\'erreur:', replyError);
      }
    }
  });

  collector.on('end', async (collected, reason) => {
    if (reason === 'time') {
      try {
        if (!interaction.replied) {
          await interaction.editReply({
            embeds: [createErrorEmbed('⏱️ Délai expiré', 'Aucun rôle n\'a été sélectionné.')],
            components: []
          });
        }
      } catch (error) {
        console.error('Erreur lors de la mise à jour du message expiré:', error);
      }
    }
  });
}

/**
 * Gère le bouton de suppression de rôle
 */
async function handleRemoveButton(interaction) {
  const config = getGuildAutoRoleConfig(interaction.guild.id);
  
  if (config.roles.length === 0) {
    return interaction.reply({
      embeds: [createErrorEmbed('❌ Aucun rôle configuré', 'Aucun rôle n\'est configuré dans l\'AutoRole.')],
      ephemeral: true
    });
  }

  const roleOptions = config.roles
    .map(roleId => {
      const role = interaction.guild.roles.cache.get(roleId);
      return role ? {
        label: role.name,
        value: role.id,
        description: `Position: ${role.position} • Membres: ${role.members.size}`,
        emoji: '🗑️'
      } : null;
    })
    .filter(option => option !== null)
    .slice(0, 25);

  if (roleOptions.length === 0) {
    return interaction.reply({
      embeds: [createErrorEmbed('❌ Aucun rôle valide', 'Aucun rôle valide n\'est configuré dans l\'AutoRole.')],
      ephemeral: true
    });
  }

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('autorole_select_remove')
    .setPlaceholder('Sélectionnez un rôle à supprimer')
    .addOptions(roleOptions);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.reply({
    embeds: [createInfoEmbed('➖ Supprimer un rôle', 'Sélectionnez le rôle à supprimer de l\'AutoRole :')],
    components: [row],
    ephemeral: true
  });
}

/**
 * Gère le menu de sélection pour supprimer un rôle
 */
async function handleRemoveSelect(interaction) {
  const roleId = interaction.values[0];
  const role = interaction.guild.roles.cache.get(roleId);
  
  if (!role) {
    return interaction.update({
      embeds: [createErrorEmbed('❌ Erreur', 'Le rôle sélectionné est introuvable.')],
      components: []
    });
  }

  const success = removeAutoRole(interaction.guild.id, roleId);
  
  if (success) {
    // Log de configuration
    await sendAutoRoleConfigLog(
      interaction.guild,
      interaction.user,
      'Suppression',
      `Le rôle ${role.name} (${role.id}) a été supprimé de l'AutoRole.`
    );
    
    await interaction.update({
      embeds: [createSuccessEmbed('✅ Rôle supprimé', `Le rôle ${role} a été supprimé de l'AutoRole avec succès.`)],
      components: []
    });
    
    // Mettre à jour le panneau principal si il existe
    await updatePanel(interaction);
  } else {
    await interaction.update({
      embeds: [createWarningEmbed('⚠️ Rôle non trouvé', `Le rôle ${role} n'était pas dans la liste AutoRole.`)],
      components: []
    });
  }
}

/**
 * Gère le bouton de configuration des logs
 */
async function handleLogsButton(interaction) {
  const channels = interaction.guild.channels.cache
    .filter(channel => channel.isTextBased() && channel.permissionsFor(interaction.guild.members.me).has('SendMessages'))
    .sort((a, b) => a.name.localeCompare(b.name))
    .first(25);

  const options = [
    {
      label: 'Désactiver les logs',
      value: 'disable',
      description: 'Désactiver complètement les logs AutoRole',
      emoji: '❌'
    },
    ...channels.map(channel => ({
      label: channel.name,
      value: channel.id,
      description: `Type: ${channel.type} • Catégorie: ${channel.parent?.name || 'Aucune'}`,
      emoji: '📝'
    }))
  ];

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('autorole_select_logs')
    .setPlaceholder('Sélectionnez un canal de logs')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  await interaction.reply({
    embeds: [createInfoEmbed('📝 Configurer les logs', 'Sélectionnez le canal où envoyer les logs AutoRole :')],
    components: [row],
    ephemeral: true
  });
}

/**
 * Gère le menu de sélection pour les logs
 */
async function handleLogsSelect(interaction) {
  const value = interaction.values[0];
  
  if (value === 'disable') {
    setAutoRoleLogChannel(interaction.guild.id, null);
    
    // Log de configuration
    await sendAutoRoleConfigLog(
      interaction.guild,
      interaction.user,
      'Configuration des logs',
      'Les logs AutoRole ont été désactivés.'
    );
    
    await interaction.update({
      embeds: [createSuccessEmbed('✅ Logs désactivés', 'Les logs AutoRole ont été désactivés.')],
      components: []
    });
  } else {
    const channel = interaction.guild.channels.cache.get(value);
    
    if (!channel) {
      return interaction.update({
        embeds: [createErrorEmbed('❌ Erreur', 'Le canal sélectionné est introuvable.')],
        components: []
      });
    }

    setAutoRoleLogChannel(interaction.guild.id, channel.id);
    
    // Log de configuration
    await sendAutoRoleConfigLog(
      interaction.guild,
      interaction.user,
      'Configuration des logs',
      `Le canal ${channel.name} (${channel.id}) a été défini comme canal de logs AutoRole.`
    );
    
    await interaction.update({
      embeds: [createSuccessEmbed('✅ Canal de logs configuré', `Le canal ${channel} a été défini comme canal de logs AutoRole.`)],
      components: []
    });
  }
  
  // Mettre à jour le panneau principal si il existe
  await updatePanel(interaction);
}

/**
 * Gère le bouton de réinitialisation
 */
async function handleResetButton(interaction) {
  const config = getGuildAutoRoleConfig(interaction.guild.id);
  
  const embed = new EmbedBuilder()
    .setColor(0xFF6B6B)
    .setTitle('🗑️ Confirmation de réinitialisation')
    .setDescription('⚠️ **Attention !** Cette action va supprimer toute la configuration AutoRole.\n\n**Cela inclut :**\n• Désactivation de l\'AutoRole\n• Suppression de tous les rôles configurés\n• Suppression du canal de logs\n\n**Cette action est irréversible !**')
    .addFields({
      name: '📊 Configuration actuelle',
      value: `**État :** ${config.active ? '✅ Activé' : '❌ Désactivé'}\n**Rôles :** ${config.roles.length}\n**Canal de logs :** ${config.logChannelId ? `<#${config.logChannelId}>` : 'Non configuré'}`,
      inline: false
    })
    .setFooter({ text: 'Cliquez sur "Confirmer" pour procéder à la réinitialisation.' });

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

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

/**
 * Gère la confirmation de réinitialisation
 */
async function handleResetConfirm(interaction) {
  resetAutoRoleConfig(interaction.guild.id);
  
  // Log de configuration
  await sendAutoRoleConfigLog(
    interaction.guild,
    interaction.user,
    'Réinitialisation',
    'La configuration AutoRole a été complètement réinitialisée.'
  );
  
  const embed = createSuccessEmbed(
    '✅ Configuration réinitialisée',
    'La configuration AutoRole a été complètement réinitialisée.'
  );

  await interaction.update({ embeds: [embed], components: [] });
  
  // Mettre à jour le panneau principal si il existe
  await updatePanel(interaction);
}

/**
 * Gère l'annulation de réinitialisation
 */
async function handleResetCancel(interaction) {
  const embed = createInfoEmbed(
    '❌ Opération annulée',
    'La réinitialisation de la configuration AutoRole a été annulée.'
  );

  await interaction.update({ embeds: [embed], components: [] });
}

/**
 * Met à jour le panneau principal AutoRole
 */
async function updatePanel(interaction) {
  try {
    const config = getGuildAutoRoleConfig(interaction.guild.id);
    
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🎛️ Panneau de Gestion AutoRole')
      .setDescription(`**Serveur :** ${interaction.guild.name}\n**État :** ${config.active ? '✅ Activé' : '❌ Désactivé'}\n**Rôles configurés :** ${config.roles.length}`)
      .addFields(
        {
          name: '🎯 Rôles AutoRole',
          value: config.roles.length > 0 
            ? config.roles.map(roleId => `<@&${roleId}>`).join('\n')
            : 'Aucun rôle configuré',
          inline: false
        },
        {
          name: '📝 Canal de logs',
          value: config.logChannelId ? `<#${config.logChannelId}>` : 'Non configuré',
          inline: true
        }
      )
      .setFooter({ text: 'Utilisez les boutons ci-dessous pour gérer l\'AutoRole' })
      .setTimestamp();

    const row1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('autorole_toggle')
          .setLabel(config.active ? 'Désactiver' : 'Activer')
          .setStyle(config.active ? ButtonStyle.Danger : ButtonStyle.Success)
          .setEmoji(config.active ? '❌' : '✅'),
        new ButtonBuilder()
          .setCustomId('autorole_add')
          .setLabel('Ajouter un rôle')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('➕'),
        new ButtonBuilder()
          .setCustomId('autorole_remove')
          .setLabel('Supprimer un rôle')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('➖')
      );

    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('autorole_logs')
          .setLabel('Configurer les logs')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📝'),
        new ButtonBuilder()
          .setCustomId('autorole_reset')
          .setLabel('Réinitialiser')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🗑️')
      );

    // Essayer de mettre à jour le message original du panneau
    const originalMessage = interaction.message;
    if (originalMessage && originalMessage.author.id === interaction.client.user.id) {
      await originalMessage.edit({ embeds: [embed], components: [row1, row2] });
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour du panneau:', error);
  }
}

/**
 * Crée un embed de succès
 */
function createSuccessEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

/**
 * Crée un embed d'erreur
 */
function createErrorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

/**
 * Crée un embed d'avertissement
 */
function createWarningEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0xFFAA00)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

/**
 * Crée un embed d'information
 */
function createInfoEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}