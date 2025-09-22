import { PermissionsBitField } from 'discord.js';
import { createSuccessEmbed, createErrorEmbed } from '../../../src/utils/embeds.js';
import { sendGuildLog } from '../../../src/utils/logs.js';

export default {
  name: 'mute',
  description: 'Réduit au silence (timeout) un utilisateur pendant X minutes.',
  category: 'moderateur',
  usage: '!mute @utilisateur <minutes> [raison]',
  async execute(message, args) {
    try {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return message.reply({ embeds: [createErrorEmbed('Permission manquante', "Vous n'avez pas la permission de mettre en sourdine (timeout) des membres.")] });
      }
      if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return message.reply({ embeds: [createErrorEmbed('Permission manquante', "Je n'ai pas la permission de mettre en sourdine (timeout) des membres.")] });
      }

      const target = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
      const minutes = parseInt(args[1], 10);
      if (!target || isNaN(minutes) || minutes <= 0) return message.reply({ embeds: [createErrorEmbed('Utilisation', `Utilisation: ${this.usage}`)] });

      const reason = args.slice(2).join(' ') || 'Aucune raison fournie';
      const ms = minutes * 60 * 1000;

      const authorHigherOrEqual = message.member.roles.highest.comparePositionTo(target.roles.highest) <= 0 && message.guild.ownerId !== message.member.id;
      if (authorHigherOrEqual) return message.reply({ embeds: [createErrorEmbed('Hiérarchie', "Vous ne pouvez pas appliquer un timeout à un utilisateur avec un rôle supérieur ou égal au vôtre.")] });

      await target.timeout(ms, reason);
      const emb = createSuccessEmbed('Timeout', `L’utilisateur **${target.user.tag}** a été mis en sourdine pendant **${minutes}** minute(s).\nRaison: ${reason}`);
      await message.reply({ embeds: [emb] });
      await sendGuildLog(message.client, message.guild.id, emb);
    } catch (error) {
      console.error('[ERREUR] Commande prefix mute:', error);
      return message.reply({ embeds: [createErrorEmbed('Erreur', "Une erreur est survenue lors de la tentative de mute (timeout).")] });
    }
  },
};



