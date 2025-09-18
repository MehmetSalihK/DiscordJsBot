import { PermissionsBitField } from 'discord.js';
import { createSuccessEmbed, createErrorEmbed } from '../../../src/utils/embeds.js';
import { sendGuildLog } from '../../../src/utils/logs.js';

export default {
  name: 'clear',
  description: 'Supprime un nombre de messages dans le salon actuel (max 100).',
  category: 'moderateur',
  usage: '!clear <nombre 1-100>',
  async execute(message, args) {
    try {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return message.reply({ embeds: [createErrorEmbed('Permission manquante', "Vous n'avez pas la permission de gérer les messages.")] });
      }
      if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return message.reply({ embeds: [createErrorEmbed('Permission manquante', "Je n'ai pas la permission de gérer les messages.")] });
      }

      const count = parseInt(args[0], 10);
      if (isNaN(count) || count < 1 || count > 100) return message.reply({ embeds: [createErrorEmbed('Utilisation', `Utilisation: ${this.usage}`)] });

      // Supprimer les messages
      const deletedMessages = await message.channel.bulkDelete(count, true);
      const actualCount = deletedMessages.size;
      
      // Utiliser channel.send au lieu de message.reply car le message original pourrait avoir été supprimé
      const emb = createSuccessEmbed('Nettoyage', `**${actualCount}** message(s) supprimé(s) dans <#${message.channel.id}>.`);
      const sent = await message.channel.send({ embeds: [emb] });
      setTimeout(() => sent.delete().catch(() => {}), 4000);
      await sendGuildLog(message.client, message.guild.id, emb);
    } catch (error) {
      console.error('[ERREUR] Commande prefix clear:', error);
      return message.reply({ embeds: [createErrorEmbed('Erreur', 'Une erreur est survenue lors de la suppression des messages.')] });
    }
  },
};
