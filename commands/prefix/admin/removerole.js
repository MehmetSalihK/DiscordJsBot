import { PermissionsBitField } from 'discord.js';
import { createSuccessEmbed, createErrorEmbed } from '../../../src/utils/embeds.js';
import { sendGuildLog } from '../../../src/utils/logs.js';

export default {
  name: 'removerole',
  description: "Retire un rôle d'un utilisateur.",
  category: 'admin',
  usage: '!removerole @utilisateur @role',
  async execute(message, args) {
    try {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return message.reply({ embeds: [createErrorEmbed('Permission manquante', "Vous n'avez pas la permission de gérer les rôles.")] });
      }
      if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return message.reply({ embeds: [createErrorEmbed('Permission manquante', "Je n'ai pas la permission de gérer les rôles.")] });
      }

      const member = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
      const role = message.mentions.roles.first() || (args[1] ? message.guild.roles.cache.get(args[1]) : null);
      if (!member || !role) return message.reply({ embeds: [createErrorEmbed('Utilisation', `Utilisation: ${this.usage}`)] });

      const botHighest = message.guild.members.me.roles.highest;
      if (botHighest.comparePositionTo(role) <= 0) return message.reply({ embeds: [createErrorEmbed('Hiérarchie', "Je ne peux pas gérer ce rôle car il est au-dessus ou égal à mon rôle le plus élevé.")] });

      const authorHigherOrEqual = message.member.roles.highest.comparePositionTo(member.roles.highest) <= 0 && message.guild.ownerId !== message.member.id;
      if (authorHigherOrEqual) return message.reply({ embeds: [createErrorEmbed('Hiérarchie', "Vous ne pouvez pas modifier les rôles d'un utilisateur avec un rôle supérieur ou égal au vôtre.")] });

      await member.roles.remove(role, `Retrait de rôle par ${message.author.tag}`);
      const emb = createSuccessEmbed('Retrait de rôle', `Le rôle **${role.name}** a été retiré à **${member.user.tag}** avec succès.`);
      await message.reply({ embeds: [emb] });
      await sendGuildLog(message.client, message.guild.id, emb);
    } catch (error) {
      console.error('[ERREUR] Commande prefix removerole:', error);
      return message.reply({ embeds: [createErrorEmbed('Erreur', "Une erreur est survenue lors du retrait du rôle.")] });
    }
  },
};



