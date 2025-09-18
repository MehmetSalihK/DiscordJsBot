/**
 * Commande slash pour gérer l'AutoRole
 * Permet d'ajouter, supprimer, activer ou désactiver les rôles attribués automatiquement
 */
import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  ComponentType
} from 'discord.js';
import { 
  getGuildAutoRoleConfig, 
  updateGuildAutoRoleConfig,
  deleteGuildAutoRoleConfig
} from '../../../src/store/autoRoleStore.js';
import { 
  createSuccessEmbed, 
  createErrorEmbed, 
  createInfoEmbed 
} from '../../../src/utils/embeds.js';
import { sendAutoRoleLog } from '../../../src/utils/logs.js';
import { autoRoleConfig } from '../../../src/config/autoRoleConfig.js';
import { logger } from '../../../src/utils/logger.js';

export default {
  category: 'admin',
  data: new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('Gérer les rôles attribués automatiquement aux nouveaux membres')
    .addSubcommand(sc => sc
      .setName('panel')
      .setDescription('Ouvrir le panneau de configuration de l\'AutoRole'))
    .addSubcommand(sc => sc
      .setName('add')
      .setDescription('Ajouter un rôle à attribuer automatiquement')
      .addRoleOption(opt => opt
        .setName('rôle')
        .setDescription('Le rôle à ajouter')
        .setRequired(true)))
    .addSubcommand(sc => sc
      .setName('remove')
      .setDescription('Retirer un rôle de l\'attribution automatique')
      .addRoleOption(opt => opt
        .setName('rôle')
        .setDescription('Le rôle à retirer')
        .setRequired(true)))
    .addSubcommand(sc => sc
      .setName('list')
      .setDescription('Afficher la liste des rôles attribués automatiquement'))
    .addSubcommand(sc => sc
      .setName('reset')
      .setDescription('Réinitialiser tous les rôles automatiques'))
    .addSubcommand(sc => sc
      .setName('enable')
      .setDescription('Activer l\'attribution automatique des rôles'))
    .addSubcommand(sc => sc
      .setName('disable')
      .setDescription('Désactiver l\'attribution automatique des rôles'))
    .addSubcommand(sc => sc
      .setName('config')
      .setDescription('Afficher la configuration actuelle de l\'AutoRole'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  /**
   * Exécute la commande AutoRole
   * @param {CommandInteraction} interaction - L'interaction de commande
   */
  async execute(interaction) {
    const { options, guild, member, client } = interaction;
    const subcommand = options.getSubcommand();

    // Vérifier les permissions
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ 
        embeds: [createErrorEmbed(
          autoRoleConfig.errors.missingPermissionsTitle || 'Permission refusée',
          autoRoleConfig.errors.missingPermissions || 'Vous devez être administrateur pour utiliser cette commande.'
        )],
        ephemeral: true 
      });
    }

    // Vérifier que le bot est prêt
    if (!client.isReady()) {
      return interaction.reply({
        embeds: [createErrorEmbed(
          'Bot non prêt',
          'Le bot est en cours de démarrage. Veuillez réessayer dans quelques instants.'
        )],
        ephemeral: true
      });
    }

    try {
      logger.info(`Commande AutoRole exécutée: ${subcommand} par ${member.user.tag} (${member.id}) sur ${guild.name} (${guild.id})`);
      
      // Exécuter la sous-commande appropriée
      const subcommandHandlers = {
        panel: showPanel,
        add: addRole,
        remove: removeRole,
        list: listRoles,
        reset: resetRoles,
        enable: (i) => toggleAutoRole(i, true),
        disable: (i) => toggleAutoRole(i, false),
        config: showConfig
      };
      
      const handler = subcommandHandlers[subcommand];
      if (handler) {
        return await handler(interaction);
      } else {
        throw new Error(`Sous-commande non reconnue: ${subcommand}`);
      }
      
    } catch (error) {
      logger.error(`Erreur dans la commande AutoRole (${subcommand}):`, error);
      
      // Envoyer un message d'erreur plus détaillé en mode développement
      const errorMessage = process.env.NODE_ENV === 'development'
        ? `\`\`\`js\n${error.stack || error.message}\`\`\``
        : 'Une erreur est survenue lors de l\'exécution de la commande.';
      
      // Répondre à l'utilisateur
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          embeds: [createErrorEmbed('❌ Erreur', errorMessage)],
          ephemeral: true
        });
      } else {
        await interaction.reply({
          embeds: [createErrorEmbed('❌ Erreur', errorMessage)],
          ephemeral: true
        });
      }
      
      // Envoyer un log d'erreur
      try {
        const errorEmbed = createErrorEmbed(
          `❌ Erreur dans la commande AutoRole (${subcommand})`,
          `**Serveur:** ${guild.name} (${guild.id})\n**Utilisateur:** ${member.user.tag} (${member.id})\n**Erreur:** \`\`\`${error.message}\`\`\``
        )
        .setTimestamp();
        
        await sendAutoRoleLog(client, guild.id, errorEmbed);
      } catch (logError) {
        logger.error('Échec de l\'envoi du log d\'erreur:', logError);
      }
    }
  }
};

/**
 * Affiche le panneau de configuration de l'AutoRole
 * @param {CommandInteraction} interaction - L'interaction de commande
 */
async function showPanel(interaction) {
  const { guild, client } = interaction;
  
  // Charger la configuration
  const config = await getGuildAutoRoleConfig(guild.id);
  
  // Vérifier les permissions du bot
  const botMember = await guild.members.fetchMe();
  const hasManageRoles = botMember.permissions.has('ManageRoles');
  
  // Préparer la liste des rôles
  let rolesList = autoRoleConfig.messages.noRoles || '*Aucun rôle configuré*';
  let rolesCount = 0;
  const validRoles = [];
  
  if (config.roles?.length > 0) {
    const rolesText = [];
    
    // Vérifier chaque rôle pour s'assurer qu'il existe toujours
    for (const roleId of config.roles) {
      try {
        const role = guild.roles.cache.get(roleId);
        if (role) {
          // Vérifier si le bot peut gérer ce rôle
          const canManageRole = role.comparePositionTo(botMember.roles.highest) < 0;
          const statusEmoji = canManageRole ? '✅' : '⚠️';
          
          rolesText.push(`${statusEmoji} ${role} (${role.id})`);
          validRoles.push(role);
          rolesCount++;
        }
      } catch (error) {
        logger.error('Erreur lors de la récupération d\'un rôle:', error);
      }
    }
    
    // Mettre à jour la configuration si des rôles invalides ont été trouvés
    if (validRoles.length !== config.roles.length) {
      const validRoleIds = validRoles.map(r => r.id);
      await updateGuildAutoRoleConfig(guild.id, { roles: validRoleIds });
    }
    
    // Mettre à jour la liste des rôles si des rôles valides ont été trouvés
    if (rolesText.length > 0) {
      rolesList = rolesText.join('\n');
    }
  }
  
  // Créer l'embed avec la configuration
  const statusText = config.active 
    ? autoRoleConfig.messages.statusEnabled || '🟢 **Activé**\nLes nouveaux membres recevront automatiquement les rôles configurés.'
    : autoRoleConfig.messages.statusDisabled || '🔴 **Désactivé**\nAucun rôle ne sera attribué automatiquement.';
  
  const embed = new EmbedBuilder()
    .setTitle(autoRoleConfig.messages.panelTitle || '⚙️ Configuration AutoRole')
    .setDescription(autoRoleConfig.messages.panelDescription || 'Gérez les rôles attribués automatiquement aux nouveaux membres.')
    .addFields(
      { 
        name: '📊 Statut', 
        value: statusText,
        inline: false 
      },
      { 
        name: '🏷️ Rôles configurés', 
        value: `${rolesCount} rôle(s)`, 
        inline: true 
      },
      { 
        name: '📋 Liste des rôles', 
        value: rolesList,
        inline: false 
      }
    )
    .setColor(config.active ? 0x4CAF50 : 0x9E9E9E)
    .setFooter({ 
      text: `ID: ${guild.id} • ${guild.name}`,
      iconURL: guild.iconURL({ dynamic: true })
    })
    .setTimestamp();
    
  // Avertissement si le bot n'a pas la permission de gérer les rôles
  if (!hasManageRoles) {
    embed.addFields({
      name: '⚠️ Attention',
      value: 'Le bot n\'a pas la permission de gérer les rôles. Veuillez vérifier les permissions du bot.',
      inline: false
    });
  }

  // Créer les boutons à partir de la configuration
  const addButton = new ButtonBuilder()
    .setCustomId('autorole_add')
    .setLabel(autoRoleConfig.buttons.add.label || 'Ajouter un rôle')
    .setStyle(ButtonStyle[autoRoleConfig.buttons.add.style] || ButtonStyle.Primary)
    .setEmoji(autoRoleConfig.buttons.add.emoji || '➕')
    .setDisabled(!hasManageRoles);

  const removeButton = new ButtonBuilder()
    .setCustomId('autorole_remove')
    .setLabel(autoRoleConfig.buttons.remove.label || 'Retirer un rôle')
    .setStyle(ButtonStyle[autoRoleConfig.buttons.remove.style] || ButtonStyle.Danger)
    .setEmoji(autoRoleConfig.buttons.remove.emoji || '➖')
    .setDisabled(validRoles.length === 0 || !hasManageRoles);

  const toggleState = config.active ? 'enabled' : 'disabled';
  const toggleButton = new ButtonBuilder()
    .setCustomId('autorole_toggle')
    .setLabel(autoRoleConfig.buttons.toggle[toggleState]?.label || (config.active ? 'Désactiver' : 'Activer'))
    .setStyle(ButtonStyle[autoRoleConfig.buttons.toggle[toggleState]?.style] || (config.active ? ButtonStyle.Danger : ButtonStyle.Success))
    .setEmoji(autoRoleConfig.buttons.toggle[toggleState]?.emoji || (config.active ? '❌' : '✅'))
    .setDisabled(!hasManageRoles && validRoles.length > 0);

  const resetButton = new ButtonBuilder()
    .setCustomId('autorole_reset')
    .setLabel(autoRoleConfig.buttons.reset?.label || 'Réinitialiser')
    .setStyle(ButtonStyle[autoRoleConfig.buttons.reset?.style] || ButtonStyle.Secondary)
    .setEmoji(autoRoleConfig.buttons.reset?.emoji || '🔄')
    .setDisabled(validRoles.length === 0 || !hasManageRoles);

  // Créer une rangée de boutons
  const row = new ActionRowBuilder().addComponents(
    addButton, 
    removeButton, 
    toggleButton, 
    resetButton
  );

  // Répondre avec le panneau
  try {
    if (interaction.replied || interaction.deferred) {
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
  } catch (error) {
    logger.error('Erreur lors de l\'envoi du panneau AutoRole:', error);
    
    // Si l'interaction a déjà été répondue, on ne peut pas répondre à nouveau
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [createErrorEmbed(
          'Erreur',
          'Une erreur est survenue lors de l\'affichage du panneau de configuration.'
        )],
        ephemeral: true
      });
    }
  }
}

/**
 * Supprime un rôle de la configuration AutoRole
 * @param {CommandInteraction} interaction - L'interaction de commande
 */
async function removeRole(interaction) {
  const { guild, options, member } = interaction;
  const role = options.getRole('rôle');
  
  // Vérifier les permissions
  if (!member.permissions.has('ManageRoles')) {
    return interaction.reply({
      embeds: [createErrorEmbed(
        'Permission refusée',
        'Vous devez avoir la permission de gérer les rôles pour utiliser cette commande.'
      )],
      ephemeral: true
    });
  }

  // Vérifier si le rôle est valide
  if (!role) {
    return interaction.reply({
      embeds: [createErrorEmbed('Erreur', 'Veuillez spécifier un rôle valide à supprimer.')],
      ephemeral: true
    });
  }

  try {
    // Charger la configuration actuelle
    const config = await getGuildAutoRoleConfig(guild.id);
    
    // Vérifier si le rôle est dans la configuration
    if (!config.roles.includes(role.id)) {
      return interaction.reply({
        embeds: [createErrorEmbed(
          'Rôle non trouvé',
          `Le rôle ${role} n'est pas configuré pour l'attribution automatique.`
        )],
        ephemeral: true
      });
    }

    // Supprimer le rôle de la configuration
    const updatedRoles = config.roles.filter(r => r !== role.id);
    await updateGuildAutoRoleConfig(guild.id, { roles: updatedRoles });
    
    // Répondre à l'utilisateur
    const embed = new EmbedBuilder()
      .setTitle('✅ Rôle supprimé')
      .setDescription(`Le rôle ${role} a été retiré de la configuration AutoRole.`)
      .setColor(0x4CAF50);
    
    await interaction.reply({ embeds: [embed] });

    // Envoyer un log
    try {
      const logEmbed = new EmbedBuilder()
        .setTitle('🗑️ Rôle retiré de l\'AutoRole')
        .setDescription(
          `**Rôle:** ${role} (${role.id})\n` +
          `**Supprimé par:** ${member} (${member.id})\n` +
          `**Serveur:** ${guild.name} (${guild.id})`
        )
        .setColor(0xFF5252)
        .setTimestamp();
      
      await sendAutoRoleLog(interaction.client, guild.id, logEmbed);
    } catch (logError) {
      logger.error('Erreur lors de l\'envoi du log de suppression de rôle:', logError);
    }
    
  } catch (error) {
    logger.error('Erreur lors de la suppression du rôle de l\'AutoRole:', error);
    
    // En cas d'erreur, envoyer un message d'erreur
    const errorEmbed = createErrorEmbed(
      '❌ Erreur',
      `Une erreur est survenue lors de la suppression du rôle de l'AutoRole.\n\`\`\`${error.message}\`\`\``
    );
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
  
  // Mettre à jour le panneau si c'était une interaction de bouton
  if (interaction.isButton()) {
    await showPanel(interaction);
  }
}

/**
 * Ajoute un rôle à la liste des rôles attribués automatiquement
 * @param {CommandInteraction} interaction - L'interaction de commande
 */
async function addRole(interaction) {
  try {
    const { guild, user, options } = interaction;
    const role = options.getRole('rôle');
    
    // Vérifier que le rôle est valide
    if (!role) {
      return interaction.reply({
        embeds: [createErrorEmbed(
          'Rôle invalide',
          'Le rôle spécifié est introuvable ou invalide.'
        )],
        ephemeral: true
      });
    }
    
    // Vérifier que l'utilisateur a la permission de gérer les rôles
    if (!interaction.member.permissions.has('ManageRoles')) {
      return interaction.reply({
        embeds: [createErrorEmbed(
          'Permission refusée',
          'Vous devez avoir la permission de gérer les rôles pour utiliser cette commande.'
        )],
        ephemeral: true
      });
    }
    
    // Vérifier que le bot peut gérer ce rôle
    const botMember = await guild.members.fetchMe();
    const highestBotRole = botMember.roles.highest;
    
    if (role.position >= highestBotRole.position) {
      return interaction.reply({
        embeds: [createErrorEmbed(
          'Permission insuffisante',
          `Je ne peux pas gérer le rôle ${role} car il est supérieur ou égal à mon rôle le plus élevé (${highestBotRole}).`
        )],
        ephemeral: true
      });
    }
    
    // Charger la configuration actuelle
    const config = await getGuildAutoRoleConfig(guild.id);
    
    // Vérifier si le rôle est déjà configuré
    if (config.roles.includes(role.id)) {
      return interaction.reply({
        embeds: [createErrorEmbed(
          'Rôle déjà configuré',
          `Le rôle ${role} est déjà configuré pour l'attribution automatique.`
        )],
        ephemeral: true
      });
    }

    // Mettre à jour la configuration
    const updatedConfig = await updateGuildAutoRoleConfig(guild.id, {
      roles: [...config.roles, role.id]
    });

    // Créer l'embed de confirmation
    const embed = new EmbedBuilder()
      .setTitle('✅ Rôle ajouté avec succès')
      .setDescription(`Le rôle ${role} a été ajouté à la liste des rôles attribués automatiquement.`)
      .addFields(
        { name: '👤 Ajouté par', value: `${user}`, inline: true },
        { name: '🏷️ Rôle', value: `${role} (${role.id})`, inline: true },
        { name: '📊 Total des rôles', value: `${updatedConfig.roles.length}`, inline: true },
        { name: '⚙️ Statut', value: updatedConfig.active ? '🟢 Activé' : '🔴 Désactivé', inline: true }
      )
      .setColor(0x4CAF50)
      .setFooter({ 
        text: `ID: ${guild.id} • ${guild.name}`,
        iconURL: guild.iconURL({ dynamic: true })
      })
      .setTimestamp();

    // Répondre à l'utilisateur
    await interaction.reply({ embeds: [embed] });

    // Envoyer un log
    try {
      const logEmbed = new EmbedBuilder()
        .setTitle('📥 Rôle ajouté à l\'AutoRole')
        .setDescription(`**Rôle:** ${role} (${role.id})\n**Ajouté par:** ${user} (${user.id})\n**Serveur:** ${guild.name} (${guild.id})`)
        .setColor(0x4CAF50)
        .setTimestamp();
      
      await sendAutoRoleLog(interaction.client, guild.id, logEmbed);
    } catch (logError) {
      logger.error('Erreur lors de l\'envoi du log d\'ajout de rôle:', logError);
    }
    
  } catch (error) {
    logger.error('Erreur lors de l\'ajout du rôle à l\'AutoRole:', error);
    
    // En cas d'erreur, envoyer un message d'erreur
    const errorEmbed = createErrorEmbed(
      '❌ Erreur',
      `Une erreur est survenue lors de l'ajout du rôle à l'AutoRole.\n\`\`\`${error.message}\`\`\``
    );
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
  
  // Mettre à jour le panneau si c'était une interaction de bouton
  if (interaction.isButton()) {
    await showPanel(interaction);
  }
}

/**
 * Réinitialise la configuration AutoRole d'un serveur
 * @param {CommandInteraction} interaction - L'interaction de commande
 */
async function resetRoles(interaction) {
  const { guild, user } = interaction;
  
  // Vérifier les permissions de l'utilisateur
  if (!interaction.member.permissions.has('ManageRoles')) {
    return interaction.reply({
      embeds: [createErrorEmbed(
        'Permission refusée',
        'Vous devez avoir la permission de gérer les rôles pour utiliser cette commande.'
      )],
      ephemeral: true
    });
  }
  
  // Charger la configuration actuelle
  const config = await getGuildAutoRoleConfig(guild.id);
  const removedRolesCount = config.roles?.length || 0;
  
  // Vérifier s'il y a des rôles à réinitialiser
  if (removedRolesCount === 0) {
    return interaction.reply({
      embeds: [createErrorEmbed(
        'Aucun rôle configuré',
        'Aucun rôle n\'est actuellement configuré pour l\'attribution automatique.'
      )],
      ephemeral: true
    });
  }
  
  try {
    // Créer l'embed de confirmation
    const confirmEmbed = new EmbedBuilder()
      .setTitle('⚠️ Confirmer la réinitialisation')
      .setDescription(
        `Êtes-vous sûr de vouloir réinitialiser la configuration AutoRole ?\n` +
        `**Cela supprimera définitivement ${removedRolesCount} rôle(s) configuré(s).**\n\n` +
        'Cette action est irréversible.'
      )
      .addFields(
        { 
          name: 'Rôles configurés', 
          value: config.roles.length > 0 
            ? config.roles.slice(0, 10).map(id => `• <@&${id}>`).join('\n') + 
              (config.roles.length > 10 ? `\n...et ${config.roles.length - 10} autres` : '')
            : 'Aucun rôle',
          inline: false
        }
      )
      .setColor(0xFFA500)
      .setFooter({ 
        text: `ID: ${guild.id} • ${guild.name}`,
        iconURL: guild.iconURL({ dynamic: true })
      })
      .setTimestamp();
    
    // Créer les boutons de confirmation
    const confirmButton = new ButtonBuilder()
      .setCustomId('confirm_reset')
      .setLabel('Confirmer la réinitialisation')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('⚠️');
    
    const cancelButton = new ButtonBuilder()
      .setCustomId('cancel_reset')
      .setLabel('Annuler')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('❌');
    
    const row = new ActionRowBuilder().addComponents(cancelButton, confirmButton);
    
    // Envoyer le message de confirmation
    const response = await interaction.reply({
      embeds: [confirmEmbed],
      components: [row],
      ephemeral: true,
      fetchReply: true
    });
    
    // Créer un collecteur de boutons
    const filter = i => i.user.id === user.id && i.message.id === response.id;
    const collector = response.createMessageComponentCollector({ 
      filter, 
      componentType: ComponentType.Button,
      time: 30000 // 30 secondes
    });
    
    collector.on('collect', async i => {
      try {
        if (i.customId === 'confirm_reset') {
          // Réinitialiser la configuration
          await deleteGuildAutoRoleConfig(guild.id);
          
          // Créer l'embed de succès
          const successEmbed = new EmbedBuilder()
            .setTitle('✅ Configuration réinitialisée')
            .setDescription(
              'La configuration AutoRole a été réinitialisée avec succès.\n' +
              `**${removedRolesCount} rôle(s)** ont été supprimés de la configuration.`
            )
            .setColor(0x4CAF50)
            .setFooter({ 
              text: `ID: ${guild.id} • ${guild.name}`,
              iconURL: guild.iconURL({ dynamic: true })
            })
            .setTimestamp();
          
          // Mettre à jour le message
          await i.update({ 
            embeds: [successEmbed], 
            components: [] 
          });
          
          // Envoyer un log
          try {
            const logEmbed = new EmbedBuilder()
              .setTitle('🔄 Configuration AutoRole réinitialisée')
              .setDescription(
                `**Effectué par:** ${user} (${user.id})\n` +
                `**Serveur:** ${guild.name} (${guild.id})\n` +
                `**Rôles supprimés:** ${removedRolesCount}`
              )
              .setColor(0xFFA500)
              .setTimestamp();
            
            await sendAutoRoleLog(interaction.client, guild.id, logEmbed);
          } catch (logError) {
            logger.error('Erreur lors de l\'envoi du log de réinitialisation:', logError);
          }
          
        } else if (i.customId === 'cancel_reset') {
          // Créer l'embed d'annulation
          const cancelEmbed = new EmbedBuilder()
            .setTitle('❌ Opération annulée')
            .setDescription('La réinitialisation de la configuration AutoRole a été annulée.')
            .setColor(0x9E9E9E);
          
          // Mettre à jour le message
          await i.update({ 
            embeds: [cancelEmbed], 
            components: [] 
          });
        }
      } catch (error) {
        logger.error('Erreur lors du traitement de la confirmation de réinitialisation:', error);
        
        if (!i.replied && !i.deferred) {
          await i.reply({
            embeds: [createErrorEmbed(
              'Erreur',
              'Une erreur est survenue lors du traitement de votre demande.'
            )],
            ephemeral: true
          });
        } else {
          await i.followUp({
            embeds: [createErrorEmbed(
              'Erreur',
              'Une erreur est survenue lors du traitement de votre demande.'
            )],
            ephemeral: true
          });
        }
      }
    });
    
    collector.on('end', async (collected, reason) => {
      if (reason === 'time') {
        try {
          // Désactiver les boutons
          const disabledRow = new ActionRowBuilder().addComponents(
            cancelButton.setDisabled(true),
            confirmButton.setDisabled(true)
          );
          
          // Mettre à jour le message pour indiquer que le délai est dépassé
          const timeoutEmbed = new EmbedBuilder()
            .setTitle('⏱️ Délai dépassé')
            .setDescription('Le délai de confirmation a expiré. Aucune modification n\'a été effectuée.')
            .setColor(0x9E9E9E);
          
          await interaction.editReply({ 
            embeds: [timeoutEmbed], 
            components: [disabledRow] 
          });
        } catch (error) {
          logger.error('Erreur lors de la gestion de la fin du collecteur:', error);
        }
      }
    });
    
  } catch (error) {
    logger.error('Erreur lors de la réinitialisation de la configuration AutoRole:', error);
    
    // En cas d'erreur, envoyer un message d'erreur
    const errorEmbed = createErrorEmbed(
      '❌ Erreur',
      `Une erreur est survenue lors de la réinitialisation de la configuration AutoRole.\n\`\`\`${error.message}\`\`\``
    );
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
  
  // Mettre à jour le panneau si c'était une interaction de bouton
  if (interaction.isButton()) {
    await showPanel(interaction);
  }
}

/**
 * Active ou désactive l'AutoRole
 * @param {CommandInteraction} interaction - L'interaction de commande
 * @param {boolean} enabled - Si l'AutoRole doit être activé ou désactivé
 */
async function toggleAutoRole(interaction, enabled) {
  const { guild, user } = interaction;
  
  // Vérifier si l'état change réellement
  const config = await getGuildAutoRoleConfig(guild.id);
  if (config.active === enabled) {
    return interaction.reply({
      embeds: [createErrorEmbed(
        'Aucun changement',
        `L'AutoRole est déjà ${enabled ? 'activé' : 'désactiv' + (enabled ? 'é' : 'e')}.`
      )],
      ephemeral: true
    });
  }
  
  // Mettre à jour l'état
  await updateGuildAutoRoleConfig(guild.id, { active: enabled });
  
  // Répondre à l'utilisateur
  await interaction.reply({
    embeds: [createSuccessEmbed(
      enabled ? '✅ AutoRole activé' : '❌ AutoRole désactivé',
      `L'attribution automatique des rôles a été ${enabled ? 'activée' : 'désactivée'}.`
    )],
    ephemeral: true
  });
  
  // Envoyer un log
  try {
    const logEmbed = new EmbedBuilder()
      .setColor(enabled ? 0x4CAF50 : 0xF44336)
      .setTitle(`🔧 AutoRole ${enabled ? 'activé' : 'désactivé'} (Commande)`)
      .setDescription(`**Modérateur:** ${user} (${user.id})\n**Action:** L'AutoRole a été ${enabled ? 'activé' : 'désactiv' + (enabled ? 'é' : 'e')}`)
      .setTimestamp();
      
    await sendAutoRoleLog(interaction.client, guild.id, logEmbed);
  } catch (logError) {
    console.error('Erreur lors de l\'envoi du log de basculement AutoRole (commande):', logError);
  }
  
  // Mettre à jour le panneau si c'était une interaction de bouton
  if (interaction.isButton()) {
    await showPanel(interaction);
  }
}
