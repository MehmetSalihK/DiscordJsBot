import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { createSuccessEmbed, createErrorEmbed } from '../../../src/utils/embeds.js';
import { sendGuildLog } from '../../../src/utils/logs.js';

export default {
  category: 'admin',
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription("Bannit un utilisateur du serveur.")
    .addUserOption(opt => opt.setName('utilisateur').setDescription('Utilisateur à bannir').setRequired(true))
    .addStringOption(opt => opt.setName('raison').setDescription('Raison du bannissement').setRequired(false)),
  async execute(interaction) {
    try {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.BanMembers)) {
        return interaction.reply({ embeds: [createErrorEmbed('Permission manquante', "Vous n'avez pas la permission de bannir des membres.")], ephemeral: true });
      }
      if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return interaction.reply({ embeds: [createErrorEmbed('Permission manquante', "Je n'ai pas la permission de bannir des membres.")], ephemeral: true });
      }

      const target = interaction.options.getUser('utilisateur', true);
      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!member) return interaction.reply({ embeds: [createErrorEmbed('Introuvable', 'Utilisateur introuvable sur ce serveur.')], ephemeral: true });

      const authorMember = await interaction.guild.members.fetch(interaction.user.id);
      const authorHigherOrEqual = authorMember.roles.highest.comparePositionTo(member.roles.highest) <= 0 && interaction.guild.ownerId !== interaction.user.id;
      if (authorHigherOrEqual) return interaction.reply({ embeds: [createErrorEmbed('Hiérarchie', 'Vous ne pouvez pas bannir un utilisateur avec un rôle supérieur ou égal au vôtre.')], ephemeral: true });

      if (!member.bannable) return interaction.reply({ embeds: [createErrorEmbed('Impossible', "Je ne peux pas bannir cet utilisateur (rôle trop élevé ou permissions insuffisantes).")], ephemeral: true });

      const reason = interaction.options.getString('raison') || 'Aucune raison fournie';
      await member.ban({ reason });
      const emb = createSuccessEmbed('Bannissement', `L’utilisateur **${target.tag}** a été banni avec succès.\nRaison: ${reason}`);
      await interaction.reply({ embeds: [emb] });
      await sendGuildLog(interaction.client, interaction.guildId, emb);
    } catch (error) {
      console.error('[ERREUR] Slash /ban:', error);
      if (interaction.deferred || interaction.replied) return interaction.editReply({ embeds: [createErrorEmbed('Erreur', 'Une erreur est survenue lors de la tentative de bannissement.')] });
      return interaction.reply({ embeds: [createErrorEmbed('Erreur', 'Une erreur est survenue lors de la tentative de bannissement.')], ephemeral: true });
    }
  },
};
