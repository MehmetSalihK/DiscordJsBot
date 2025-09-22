import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { createSuccessEmbed, createErrorEmbed } from '../../../src/utils/embeds.js';
import { sendGuildLog } from '../../../src/utils/logs.js';

export default {
  category: 'moderateur',
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Met un utilisateur en timeout pendant X minutes.')
    .addUserOption(opt => opt.setName('utilisateur').setDescription('Utilisateur à mute (timeout)').setRequired(true))
    .addIntegerOption(opt => opt.setName('minutes').setDescription('Durée en minutes').setRequired(true).setMinValue(1))
    .addStringOption(opt => opt.setName('raison').setDescription('Raison du mute').setRequired(false)),
  async execute(interaction) {
    try {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ModerateMembers)) {
        return interaction.reply({ embeds: [createErrorEmbed('Permission manquante', "Vous n'avez pas la permission de mettre en sourdine (timeout) des membres.")], flags: 64 // MessageFlags.Ephemeral });
      }
      if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return interaction.reply({ embeds: [createErrorEmbed('Permission manquante', "Je n'ai pas la permission de mettre en sourdine (timeout) des membres.")], flags: 64 // MessageFlags.Ephemeral });
      }

      const target = interaction.options.getUser('utilisateur', true);
      const minutes = interaction.options.getInteger('minutes', true);
      const reason = interaction.options.getString('raison') || 'Aucune raison fournie';
      const ms = minutes * 60 * 1000;

      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!member) return interaction.reply({ embeds: [createErrorEmbed('Introuvable', 'Utilisateur introuvable sur ce serveur.')], flags: 64 // MessageFlags.Ephemeral });

      const authorMember = await interaction.guild.members.fetch(interaction.user.id);
      const authorHigherOrEqual = authorMember.roles.highest.comparePositionTo(member.roles.highest) <= 0 && interaction.guild.ownerId !== interaction.user.id;
      if (authorHigherOrEqual) return interaction.reply({ embeds: [createErrorEmbed('Hiérarchie', "Vous ne pouvez pas appliquer un timeout à un utilisateur avec un rôle supérieur ou égal au vôtre.")], flags: 64 // MessageFlags.Ephemeral });

      await member.timeout(ms, reason);
      const emb = createSuccessEmbed('Timeout', `L’utilisateur **${target.tag}** a été mis en sourdine pendant **${minutes}** minute(s).\nRaison: ${reason}`);
      await interaction.reply({ embeds: [emb] });
      await sendGuildLog(interaction.client, interaction.guildId, emb);
    } catch (error) {
      console.error('[ERREUR] Slash /mute:', error);
      if (interaction.deferred || interaction.replied) return interaction.editReply({ embeds: [createErrorEmbed('Erreur', "Une erreur est survenue lors de la tentative de mute (timeout).")] });
      return interaction.reply({ embeds: [createErrorEmbed('Erreur', "Une erreur est survenue lors de la tentative de mute (timeout).")], flags: 64 // MessageFlags.Ephemeral });
    }
  },
};



