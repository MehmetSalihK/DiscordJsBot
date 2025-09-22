import { PermissionsBitField } from 'discord.js';
import { createSuccessEmbed, createErrorEmbed } from '../../../src/utils/embeds.js';
import { sendGuildLog } from '../../../src/utils/logs.js';

export default {
  name: 'ban',
  description: 'Bannit un utilisateur du serveur.',
  category: 'admin',
  usage: '!ban @utilisateur [raison]',
  async execute(message, args) {
    try {
      if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        const emb = createErrorEmbed('Permission manquante', "Vous n'avez pas la permission de bannir des membres.");
        return message.reply({ embeds: [emb] });
      }
      if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        const emb = createErrorEmbed('Permission manquante', "Je n'ai pas la permission de bannir des membres.");
        return message.reply({ embeds: [emb] });
      }

      const target = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
      if (!target) {
        const emb = createErrorEmbed('Utilisation', `Utilisation: ${this.usage}`);
        return message.reply({ embeds: [emb] });
      }

      if (target.id === message.author.id) return message.reply({ embeds: [createErrorEmbed('Action invalide', 'Vous ne pouvez pas vous bannir vous-même.')] });
      if (!target.bannable) return message.reply({ embeds: [createErrorEmbed('Impossible', "Je ne peux pas bannir cet utilisateur (rôle trop élevé ou permissions insuffisantes).")] });

      // Vérifier la hiérarchie de rôles
      const authorHigherOrEqual = message.member.roles.highest.comparePositionTo(target.roles.highest) <= 0 && message.guild.ownerId !== message.member.id;
      if (authorHigherOrEqual) return message.reply({ embeds: [createErrorEmbed('Hiérarchie', 'Vous ne pouvez pas bannir un utilisateur avec un rôle supérieur ou égal au vôtre.')] });

      const reason = args.slice(1).join(' ') || 'Aucune raison fournie';
      await target.ban({ reason });
      const emb = createSuccessEmbed('Bannissement', `L’utilisateur **${target.user.tag}** a été banni avec succès.\nRaison: ${reason}`);
      await message.reply({ embeds: [emb] });
      await sendGuildLog(message.client, message.guild.id, emb);
    } catch (error) {
      console.error('[ERREUR] Commande prefix ban:', error);
      return message.reply({ embeds: [createErrorEmbed('Erreur', 'Une erreur est survenue lors de la tentative de bannissement.')] });
    }
  },
};



