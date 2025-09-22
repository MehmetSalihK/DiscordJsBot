import { PermissionsBitField } from 'discord.js';
import { createSuccessEmbed, createErrorEmbed } from '../../../src/utils/embeds.js';
import { sendGuildLog } from '../../../src/utils/logs.js';

export default {
  name: 'kick',
  description: 'Expulse un utilisateur du serveur.',
  category: 'moderateur',
  usage: '!kick @utilisateur [raison]',
  async execute(message, args) {
    try {
      if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return message.reply({ embeds: [createErrorEmbed('Permission manquante', "Vous n'avez pas la permission d'expulser des membres.")] });
      }
      if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return message.reply({ embeds: [createErrorEmbed('Permission manquante', "Je n'ai pas la permission d'expulser des membres.")] });
      }

      const target = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
      if (!target) return message.reply({ embeds: [createErrorEmbed('Utilisation', `Utilisation: ${this.usage}`)] });

      if (target.id === message.author.id) return message.reply({ embeds: [createErrorEmbed('Action invalide', "Vous ne pouvez pas vous expulser vous-même.")] });
      if (!target.kickable) return message.reply({ embeds: [createErrorEmbed('Impossible', "Je ne peux pas expulser cet utilisateur (rôle trop élevé ou permissions insuffisantes). ")] });

      const authorHigherOrEqual = message.member.roles.highest.comparePositionTo(target.roles.highest) <= 0 && message.guild.ownerId !== message.member.id;
      if (authorHigherOrEqual) return message.reply({ embeds: [createErrorEmbed('Hiérarchie', "Vous ne pouvez pas expulser un utilisateur avec un rôle supérieur ou égal au vôtre.")] });

      const reason = args.slice(1).join(' ') || 'Aucune raison fournie';
      await target.kick(reason);
      const emb = createSuccessEmbed('Expulsion', `L’utilisateur **${target.user.tag}** a été expulsé avec succès.\nRaison: ${reason}`);
      await message.reply({ embeds: [emb] });
      await sendGuildLog(message.client, message.guild.id, emb);
    } catch (error) {
      console.error('[ERREUR] Commande prefix kick:', error);
      return message.reply({ embeds: [createErrorEmbed('Erreur', "Une erreur est survenue lors de la tentative d'expulsion.")] });
    }
  },
};



