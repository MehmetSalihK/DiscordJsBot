import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { 
  getGuildAutoRoleConfig, 
  updateGuildAutoRoleConfig, 
  addAutoRole, 
  removeAutoRole, 
  setAutoRoleActive, 
  setAutoRoleLogChannel, 
  resetAutoRoleConfig 
} from '../../../src/store/autoRoleStore.js';

export default {
  data: new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('🎭 Gestion du système AutoRole pour l\'attribution automatique de rôles')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('config')
        .setDescription('📋 Affiche la configuration AutoRole actuelle')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('🔄 Active ou désactive le système AutoRole')
        .addBooleanOption(option =>
          option
            .setName('actif')
            .setDescription('Activer (true) ou désactiver (false) l\'AutoRole')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('➕ Ajoute un rôle à la liste AutoRole')
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('Le rôle à ajouter à l\'AutoRole')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('➖ Supprime un rôle de la liste AutoRole')
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('Le rôle à supprimer de l\'AutoRole')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('logs')
        .setDescription('📝 Configure le canal de logs AutoRole')
        .addChannelOption(option =>
          option
            .setName('canal')
            .setDescription('Le canal où envoyer les logs AutoRole (laisser vide pour désactiver)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('🗑️ Réinitialise complètement la configuration AutoRole')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('panel')
        .setDescription('🎛️ Affiche le panneau de gestion interactif AutoRole')
    ),

  async execute(interaction) {
    const { guild, options } = interaction;
    const subcommand = options.getSubcommand();

    // Vérifier les permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        embeds: [createErrorEmbed('❌ Permission refusée', 'Vous devez être administrateur pour utiliser cette commande.')],
        ephemeral: true
      });
    }

    try {
      switch (subcommand) {
        case 'config':
          await handleConfig(interaction);
          break;
        case 'toggle':
          await handleToggle(interaction);
          break;
        case 'add':
          await handleAdd(interaction);
          break;
        case 'remove':
          await handleRemove(interaction);
          break;
        case 'logs':
          await handleLogs(interaction);
          break;
        case 'reset':
          await handleReset(interaction);
          break;
        case 'panel':
          await handlePanel(interaction);
          break;
        default:
          await interaction.reply({
            embeds: [createErrorEmbed('❌ Erreur', 'Sous-commande non reconnue.')],
            ephemeral: true
          });
      }
    } catch (error) {
      console.error('Erreur dans la commande autorole:', error);
      
      const errorEmbed = createErrorEmbed(
        '❌ Erreur système',
        'Une erreur inattendue s\'est produite lors de l\'exécution de la commande.'
      );

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  }
};

/**
 * Gère la sous-commande config
 */
async function handleConfig(interaction) {
  const config = getGuildAutoRoleConfig(interaction.guild.id);
  
  const embed = new EmbedBuilder()
    .setColor(config.active ? 0x00FF00 : 0xFF6B6B)
    .setTitle('🎭 Configuration AutoRole')
    .setDescription(`Configuration actuelle du système AutoRole pour **${interaction.guild.name}**`)
    .addFields(
      {
        name: '🔄 État',
        value: config.active ? '✅ **Activé**' : '❌ **Désactivé**',
        inline: true
      },
      {
        name: '🎯 Rôles configurés',
        value: config.roles.length > 0 
          ? `**${config.roles.length}** rôle(s)\n${config.roles.map(roleId => `<@&${roleId}>`).join('\n')}`
          : '❌ Aucun rôle configuré',
        inline: true
      },
      {
        name: '📝 Canal de logs',
        value: config.logChannelId ? `<#${config.logChannelId}>` : '❌ Non configuré',
        inline: true
      }
    )
    .setFooter({ text: `Serveur: ${interaction.guild.name}`, iconURL: interaction.guild.iconURL() })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

/**
 * Gère la sous-commande toggle
 */
async function handleToggle(interaction) {
  const active = interaction.options.getBoolean('actif');
  
  setAutoRoleActive(interaction.guild.id, active);
  
  const embed = createSuccessEmbed(
    '🔄 AutoRole mis à jour',
    `Le système AutoRole a été **${active ? 'activé' : 'désactivé'}** avec succès.`
  );

  await interaction.reply({ embeds: [embed] });
}

/**
 * Gère la sous-commande add
 */
async function handleAdd(interaction) {
  const role = interaction.options.getRole('role');
  
  // Vérifications de sécurité
  if (role.managed) {
    return interaction.reply({
      embeds: [createErrorEmbed('❌ Erreur', 'Ce rôle est géré par une intégration et ne peut pas être ajouté.')],
      ephemeral: true
    });
  }

  if (role.position >= interaction.guild.members.me.roles.highest.position) {
    return interaction.reply({
      embeds: [createErrorEmbed('❌ Erreur', 'Ce rôle est plus élevé que mon rôle le plus haut. Je ne peux pas l\'attribuer.')],
      ephemeral: true
    });
  }

  const success = addAutoRole(interaction.guild.id, role.id);
  
  if (success) {
    const embed = createSuccessEmbed(
      '➕ Rôle ajouté',
      `Le rôle ${role} a été ajouté à la liste AutoRole avec succès.`
    );
    await interaction.reply({ embeds: [embed] });
  } else {
    const embed = createWarningEmbed(
      '⚠️ Rôle déjà présent',
      `Le rôle ${role} est déjà dans la liste AutoRole.`
    );
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

/**
 * Gère la sous-commande remove
 */
async function handleRemove(interaction) {
  const role = interaction.options.getRole('role');
  
  const success = removeAutoRole(interaction.guild.id, role.id);
  
  if (success) {
    const embed = createSuccessEmbed(
      '➖ Rôle supprimé',
      `Le rôle ${role} a été supprimé de la liste AutoRole avec succès.`
    );
    await interaction.reply({ embeds: [embed] });
  } else {
    const embed = createWarningEmbed(
      '⚠️ Rôle non trouvé',
      `Le rôle ${role} n'était pas dans la liste AutoRole.`
    );
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

/**
 * Gère la sous-commande logs
 */
async function handleLogs(interaction) {
  const channel = interaction.options.getChannel('canal');
  
  if (channel) {
    if (!channel.isTextBased()) {
      return interaction.reply({
        embeds: [createErrorEmbed('❌ Erreur', 'Le canal doit être un canal textuel.')],
        ephemeral: true
      });
    }

    setAutoRoleLogChannel(interaction.guild.id, channel.id);
    
    const embed = createSuccessEmbed(
      '📝 Canal de logs configuré',
      `Le canal ${channel} a été défini comme canal de logs AutoRole.`
    );
    await interaction.reply({ embeds: [embed] });
  } else {
    setAutoRoleLogChannel(interaction.guild.id, null);
    
    const embed = createSuccessEmbed(
      '📝 Logs désactivés',
      'Les logs AutoRole ont été désactivés.'
    );
    await interaction.reply({ embeds: [embed] });
  }
}

/**
 * Gère la sous-commande reset
 */
async function handleReset(interaction) {
  const embed = new EmbedBuilder()
    .setColor(0xFF6B6B)
    .setTitle('🗑️ Confirmation de réinitialisation')
    .setDescription('⚠️ **Attention !** Cette action va supprimer toute la configuration AutoRole.\n\n**Cela inclut :**\n• Désactivation de l\'AutoRole\n• Suppression de tous les rôles configurés\n• Suppression du canal de logs\n\n**Cette action est irréversible !**')
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
 * Gère la sous-commande panel
 */
async function handlePanel(interaction) {
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

  await interaction.reply({ embeds: [embed], components: [row1, row2] });
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
