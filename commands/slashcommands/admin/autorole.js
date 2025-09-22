import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, EmbedBuilder } from 'discord.js';
import { getGuildConfig } from '../../../src/modules/autorole/storage.js';
import { getAutoRoleStats } from '../../../src/modules/autorole/core.js';
import { createPanelEmbed, createPanelComponents } from '../../../src/modules/autorole/interactions.js';

export default {
  category: 'admin',
  data: new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('Affiche le panneau de contrôle AutoRole interactif')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      await handlePanel(interaction);
    } catch (error) {
      console.error('Erreur dans la commande autorole:', error);
      
      const errorEmbed = createErrorEmbed(
        'Erreur système',
        'Une erreur inattendue s\'est produite lors de l\'exécution de la commande.'
      );

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }
      } catch (replyError) {
        console.error('Erreur lors de la réponse à l\'interaction:', replyError);
      }
    }
  }
};

/**
 * Gère l'affichage du panneau de contrôle
 */
async function handlePanel(interaction) {
  try {
    const config = getGuildConfig(interaction.guild.id);
    const stats = getAutoRoleStats(interaction.guild);

    const embed = createPanelEmbed(interaction.guild, config, stats);
    const components = createPanelComponents();

    await interaction.reply({
      embeds: [embed],
      components,
      flags: MessageFlags.Ephemeral
    });
  } catch (error) {
    console.error('Erreur dans handlePanel:', error);
    
    const errorEmbed = createErrorEmbed(
      'Erreur système',
      'Une erreur s\'est produite lors de l\'affichage du panneau.'
    );

    // Vérifier si l'interaction n'a pas déjà été traitée
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        embeds: [errorEmbed],
        flags: MessageFlags.Ephemeral
      });
    } else {
      await interaction.followUp({
        embeds: [errorEmbed],
        flags: MessageFlags.Ephemeral
      });
    }
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



