import { PermissionsBitField } from 'discord.js';
import { createSuccessEmbed, createErrorEmbed } from '../../../src/utils/embeds.js';
import { sendGuildLog } from '../../../src/utils/logs.js';

export default {
  name: 'setrole',
  description: "Assigne un rôle à un utilisateur.",
  category: 'admin',
  usage: '!setrole @utilisateur @role',
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

      // Vérifier positions des rôles (le bot doit être au-dessus du rôle à attribuer)
      const botHighest = message.guild.members.me.roles.highest;
      if (botHighest.comparePositionTo(role) <= 0) return message.reply({ embeds: [createErrorEmbed('Hiérarchie', "Je ne peux pas gérer ce rôle car il est au-dessus ou égal à mon rôle le plus élevé.")] });

      // Vérifier hiérarchie auteur vs membre cible
      const authorHigherOrEqual = message.member.roles.highest.comparePositionTo(member.roles.highest) <= 0 && message.guild.ownerId !== message.member.id;
      if (authorHigherOrEqual) return message.reply({ embeds: [createErrorEmbed('Hiérarchie', "Vous ne pouvez pas modifier les rôles d'un utilisateur avec un rôle supérieur ou égal au vôtre.")] });

      await member.roles.add(role, `Ajout de rôle par ${message.author.tag}`);
      const emb = createSuccessEmbed('Attribution de rôle', `Le rôle **${role.name}** a été attribué à **${member.user.tag}** avec succès.`);
      await message.reply({ embeds: [emb] });
      await sendGuildLog(message.client, message.guild.id, emb);
    } catch (error) {
      console.error('[ERREUR] Commande prefix setrole:', error);
      return message.reply({ embeds: [createErrorEmbed('Erreur', "Une erreur est survenue lors de l'attribution du rôle.")] });
    }
  },
};



