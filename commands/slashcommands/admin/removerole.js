import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { createSuccessEmbed, createErrorEmbed } from '../../../src/utils/embeds.js';
import { sendGuildLog } from '../../../src/utils/logs.js';

export default {
  category: 'admin',
  data: new SlashCommandBuilder()
    .setName('removerole')
    .setDescription("Retire un rôle d'un utilisateur.")
    .addUserOption(opt => opt.setName('utilisateur').setDescription('Utilisateur à qui retirer le rôle').setRequired(true))
    .addRoleOption(opt => opt.setName('role').setDescription('Rôle à retirer').setRequired(true)),
  async execute(interaction) {
    try {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageRoles)) {
        return interaction.reply({ embeds: [createErrorEmbed('Permission manquante', "Vous n'avez pas la permission de gérer les rôles.")], flags: 64 }); // MessageFlags.Ephemeral
      }
      if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return interaction.reply({ embeds: [createErrorEmbed('Permission manquante', "Je n'ai pas la permission de gérer les rôles.")], flags: 64 }); // MessageFlags.Ephemeral
      }

      const user = interaction.options.getUser('utilisateur', true);
      const role = interaction.options.getRole('role', true);
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ embeds: [createErrorEmbed('Introuvable', 'Utilisateur introuvable sur ce serveur.')], flags: 64 }); // MessageFlags.Ephemeral

      const botHighest = interaction.guild.members.me.roles.highest;
      if (botHighest.comparePositionTo(role) <= 0) {
        return interaction.reply({ embeds: [createErrorEmbed('Hiérarchie', "Je ne peux pas gérer ce rôle car il est au-dessus ou égal à mon rôle le plus élevé.")], flags: 64 }); // MessageFlags.Ephemeral
      }

      const authorMember = await interaction.guild.members.fetch(interaction.user.id);
      const authorHigherOrEqual = authorMember.roles.highest.comparePositionTo(member.roles.highest) <= 0 && interaction.guild.ownerId !== interaction.user.id;
      if (authorHigherOrEqual) return interaction.reply({ embeds: [createErrorEmbed('Hiérarchie', "Vous ne pouvez pas modifier les rôles d'un utilisateur avec un rôle supérieur ou égal au vôtre.")], flags: 64 }); // MessageFlags.Ephemeral

      await member.roles.remove(role, `Retrait de rôle via /removerole par ${interaction.user.tag}`);
      const emb = createSuccessEmbed('Retrait de rôle', `Le rôle **${role.name}** a été retiré à **${user.tag}** avec succès.`);
      await interaction.reply({ embeds: [emb] });
      await sendGuildLog(interaction.client, interaction.guildId, emb);
    } catch (error) {
      console.error('[ERREUR] Slash /removerole:', error);
      if (interaction.deferred || interaction.replied) return interaction.editReply({ embeds: [createErrorEmbed('Erreur', "Une erreur est survenue lors du retrait du rôle.")] });
      return interaction.reply({ embeds: [createErrorEmbed('Erreur', "Une erreur est survenue lors du retrait du rôle.")], flags: 64 }); // MessageFlags.Ephemeral
    }
  },
};




