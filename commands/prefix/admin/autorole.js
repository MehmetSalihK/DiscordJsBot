import { PermissionsBitField, EmbedBuilder } from 'discord.js';
import { getGuildConfig } from '../../../src/modules/autorole/storage.js';
import { getAutoRoleStats } from '../../../src/modules/autorole/core.js';
import { createPanelEmbed, createPanelComponents } from '../../../src/modules/autorole/interactions.js';

export default {
  name: 'autorole',
  description: 'Affiche le panneau de contrôle AutoRole interactif',
  category: 'admin',
  usage: '!autorole',
  async execute(message, args, client) {
    try {
      // Vérification des permissions
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const errorEmbed = createErrorEmbed(
          'Permission manquante',
          'Vous devez avoir la permission Administrateur pour utiliser cette commande.'
        );
        return message.reply({ embeds: [errorEmbed] });
      }

      await handlePanel(message);
    } catch (error) {
      console.error('Erreur dans la commande prefix autorole:', error);
      
      const errorEmbed = createErrorEmbed(
        'Erreur système',
        'Une erreur inattendue s\'est produite lors de l\'exécution de la commande.'
      );

      try {
        await message.reply({ embeds: [errorEmbed] });
      } catch (replyError) {
        console.error('Erreur lors de la réponse au message:', replyError);
      }
    }
  }
};

/**
 * Gère l'affichage du panneau de contrôle
 */
async function handlePanel(message) {
  try {
    const config = getGuildConfig(message.guild.id);
    const stats = getAutoRoleStats(message.guild);

    const embed = createPanelEmbed(message.guild, config, stats);
    const components = createPanelComponents();

    await message.reply({
      embeds: [embed],
      components
    });
  } catch (error) {
    console.error('Erreur dans handlePanel (prefix):', error);
    
    const errorEmbed = createErrorEmbed(
      'Erreur système',
      'Une erreur s\'est produite lors de l\'affichage du panneau.'
    );

    await message.reply({ embeds: [errorEmbed] });
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



