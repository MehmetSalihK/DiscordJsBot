import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags, EmbedBuilder } from 'discord.js';
import { setLogChannel, getGuildConfig } from '../../../src/modules/autorole/storage.js';
import { logConfig } from '../../../src/modules/autorole/logger.js';

export default {
  category: 'admin',
  data: new SlashCommandBuilder()
    .setName('setlogs')
    .setDescription('Configurer les canaux de logs pour différents systèmes')
    .addSubcommand(subcommand =>
      subcommand
        .setName('autorole')
        .setDescription('Configurer le canal de logs pour AutoRole')
        .addChannelOption(option =>
          option
            .setName('salon')
            .setDescription('Canal où envoyer les logs AutoRole')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();

      if (subcommand === 'autorole') {
        await handleAutoRoleLogsConfig(interaction);
      }
    } catch (error) {
      console.error('Erreur dans la commande setlogs:', error);
      
      const errorEmbed = createErrorEmbed(
        '❌ Erreur système',
        'Une erreur s\'est produite lors de la configuration des logs.'
      );

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
      } else {
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
      }
    }
  }
};

/**
 * Gère la configuration des logs AutoRole
 */
async function handleAutoRoleLogsConfig(interaction) {
  const channel = interaction.options.getChannel('salon');

  // Vérifier que le canal est valide
  if (!channel || channel.type !== ChannelType.GuildText) {
    const embed = createErrorEmbed(
      '❌ Canal invalide',
      'Veuillez sélectionner un canal textuel valide.'
    );
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }

  // Vérifier les permissions du bot dans le canal
  const botPermissions = channel.permissionsFor(interaction.guild.members.me);
  if (!botPermissions || !botPermissions.has(['SendMessages', 'EmbedLinks'])) {
    const embed = createErrorEmbed(
      '❌ Permissions insuffisantes',
      `Je n'ai pas les permissions nécessaires pour envoyer des messages dans ${channel}.\n\nPermissions requises :\n• Envoyer des messages\n• Intégrer des liens`
    );
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }

  // Configurer le canal de logs
  const success = setLogChannel(interaction.guild.id, channel.id);

  if (success) {
    // Logger la configuration
    await logConfig(
      interaction.guild,
      interaction.user,
      'Configuration des logs',
      `Canal de logs AutoRole défini sur ${channel.name} (${channel.id})`
    );

    const config = getGuildConfig(interaction.guild.id);
    
    const embed = createSuccessEmbed(
      '✅ Canal de logs configuré',
      `Le canal de logs AutoRole a été défini sur ${channel}.\n\n**Configuration actuelle :**\n• **Canal :** ${channel}\n• **Statut AutoRole :** ${config.enabled ? '✅ Activé' : '❌ Désactivé'}\n• **Rôles configurés :** ${config.roles.length}`
    );

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

    // Envoyer un message de test dans le canal de logs
    const testEmbed = createInfoEmbed(
      '🎭 AutoRole - Canal de logs configuré',
      `Ce canal a été configuré pour recevoir les logs AutoRole par ${interaction.user}.\n\nVous recevrez ici les notifications concernant :\n• Attribution automatique des rôles aux nouveaux membres\n• Modifications de la configuration AutoRole\n• Erreurs et avertissements du système`
    );

    try {
      await channel.send({ embeds: [testEmbed] });
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message de test:', error);
    }

  } else {
    const embed = createErrorEmbed(
      '❌ Erreur de configuration',
      'Une erreur s\'est produite lors de la configuration du canal de logs.'
    );
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
}

/**
 * Utilitaires pour créer des embeds
 */
function createSuccessEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

function createErrorEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

function createInfoEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}



