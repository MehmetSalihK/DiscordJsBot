import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { createSuccessEmbed, createErrorEmbed } from '../../../src/utils/embeds.js';
import { sendGuildLog } from '../../../src/utils/logs.js';

export default {
  category: 'admin',
  data: new SlashCommandBuilder()
    .setName('setrole')
    .setDescription('Assigne un rôle à un utilisateur.')
    .addUserOption(opt => opt.setName('utilisateur').setDescription('Utilisateur à qui attribuer le rôle').setRequired(true))
    .addRoleOption(opt => opt.setName('role').setDescription('Rôle à attribuer').setRequired(true)),
  async execute(interaction) {
    try {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageRoles)) {
        return interaction.reply({ embeds: [createErrorEmbed('Permission manquante', "Vous n'avez pas la permission de gérer les rôles.")], ephemeral: true });
      }
      if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return interaction.reply({ embeds: [createErrorEmbed('Permission manquante', "Je n'ai pas la permission de gérer les rôles.")], ephemeral: true });
      }

      const user = interaction.options.getUser('utilisateur', true);
      const role = interaction.options.getRole('role', true);
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ embeds: [createErrorEmbed('Introuvable', 'Utilisateur introuvable sur ce serveur.')], ephemeral: true });

      // Vérifier position du rôle cible vs rôle du bot
      const botHighest = interaction.guild.members.me.roles.highest;
      if (botHighest.comparePositionTo(role) <= 0) {
        return interaction.reply({ embeds: [createErrorEmbed('Hiérarchie', "Je ne peux pas gérer ce rôle car il est au-dessus ou égal à mon rôle le plus élevé.")], ephemeral: true });
      }

      // Vérifier hiérarchie auteur vs membre cible
      const authorMember = await interaction.guild.members.fetch(interaction.user.id);
      const authorHigherOrEqual = authorMember.roles.highest.comparePositionTo(member.roles.highest) <= 0 && interaction.guild.ownerId !== interaction.user.id;
      if (authorHigherOrEqual) return interaction.reply({ embeds: [createErrorEmbed('Hiérarchie', "Vous ne pouvez pas modifier les rôles d'un utilisateur avec un rôle supérieur ou égal au vôtre.")], ephemeral: true });

      await member.roles.add(role, `Ajout de rôle via /setrole par ${interaction.user.tag}`);
      const emb = createSuccessEmbed('Attribution de rôle', `Le rôle **${role.name}** a été attribué à **${user.tag}** avec succès.`);
      await interaction.reply({ embeds: [emb] });
      await sendGuildLog(interaction.client, interaction.guildId, emb);
    } catch (error) {
      console.error('[ERREUR] Slash /setrole:', error);
      if (interaction.deferred || interaction.replied) return interaction.editReply({ embeds: [createErrorEmbed('Erreur', "Une erreur est survenue lors de l'attribution du rôle.")] });
      return interaction.reply({ embeds: [createErrorEmbed('Erreur', "Une erreur est survenue lors de l'attribution du rôle.")], ephemeral: true });
    }
  },
};
