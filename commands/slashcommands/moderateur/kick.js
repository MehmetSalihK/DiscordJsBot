import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';

export default {
  category: 'moderateur',
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription("Expulse un utilisateur du serveur.")
    .addUserOption(opt => opt.setName('utilisateur').setDescription('Utilisateur à expulser').setRequired(true))
    .addStringOption(opt => opt.setName('raison').setDescription("Raison de l'expulsion").setRequired(false)),
  async execute(interaction) {
    try {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.KickMembers)) {
        return interaction.reply({ content: "Vous n'avez pas la permission d'expulser des membres.", flags: 64 }); // MessageFlags.Ephemeral
      }
      if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.KickMembers)) {
        return interaction.reply({ content: "Je n'ai pas la permission d'expulser des membres.", flags: 64 }); // MessageFlags.Ephemeral
      }

      const target = interaction.options.getUser('utilisateur', true);
      const member = await interaction.guild.members.fetch(target.id).catch(() => null);
      if (!member) return interaction.reply({ content: "Utilisateur introuvable sur ce serveur.", flags: 64 }); // MessageFlags.Ephemeral

      const authorMember = await interaction.guild.members.fetch(interaction.user.id);
      const authorHigherOrEqual = authorMember.roles.highest.comparePositionTo(member.roles.highest) <= 0 && interaction.guild.ownerId !== interaction.user.id;
      if (authorHigherOrEqual) return interaction.reply({ content: "Vous ne pouvez pas expulser un utilisateur avec un rôle supérieur ou égal au vôtre.", flags: 64 }); // MessageFlags.Ephemeral

      if (!member.kickable) return interaction.reply({ content: "Je ne peux pas expulser cet utilisateur (rôle trop élevé ou permissions insuffisantes).", flags: 64 }); // MessageFlags.Ephemeral

      const reason = interaction.options.getString('raison') || 'Aucune raison fournie';
      await member.kick(reason);
      return interaction.reply(`L’utilisateur ${target.tag} a été expulsé avec succès. Raison: ${reason}`);
    } catch (error) {
      console.error('[ERREUR] Slash /kick:', error);
      if (interaction.deferred || interaction.replied) return interaction.editReply("Une erreur est survenue lors de la tentative d'expulsion.");
      return interaction.reply({ content: "Une erreur est survenue lors de la tentative d'expulsion.", flags: 64 }); // MessageFlags.Ephemeral
    }
  },
};




