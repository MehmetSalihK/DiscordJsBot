import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { createSuccessEmbed, createErrorEmbed } from '../../../src/utils/embeds.js';
import { sendGuildLog } from '../../../src/utils/logs.js';

export default {
  category: 'admin',
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription("Débannit un utilisateur via son ID.")
    .addStringOption(opt => opt.setName('user_id').setDescription("ID de l'utilisateur à débannir").setRequired(true))
    .addStringOption(opt => opt.setName('raison').setDescription('Raison du débannissement').setRequired(false)),
  async execute(interaction) {
    try {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.BanMembers)) {
        return interaction.reply({ embeds: [createErrorEmbed('Permission manquante', "Vous n'avez pas la permission de débannir des membres.")], flags: 64 // MessageFlags.Ephemeral });
      }
      if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return interaction.reply({ embeds: [createErrorEmbed('Permission manquante', "Je n'ai pas la permission de débannir des membres.")], flags: 64 // MessageFlags.Ephemeral });
      }

      const userId = interaction.options.getString('user_id', true);
      const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

      const bans = await interaction.guild.bans.fetch().catch(() => null);
      if (!bans) return interaction.reply({ embeds: [createErrorEmbed('Erreur', "Impossible de récupérer la liste des bannis.")], flags: 64 // MessageFlags.Ephemeral });
      const banEntry = bans.get(userId);
      if (!banEntry) return interaction.reply({ embeds: [createErrorEmbed('Introuvable', "Cet utilisateur n'est pas banni ou l'ID est invalide.")], flags: 64 // MessageFlags.Ephemeral });

      await interaction.guild.bans.remove(userId, reason);
      const emb = createSuccessEmbed('Débannissement', `L’utilisateur **${banEntry.user.tag}** a été débanni avec succès.\nRaison: ${reason}`);
      await interaction.reply({ embeds: [emb] });
      await sendGuildLog(interaction.client, interaction.guildId, emb);
    } catch (error) {
      console.error('[ERREUR] Slash /unban:', error);
      if (interaction.deferred || interaction.replied) return interaction.editReply({ embeds: [createErrorEmbed('Erreur', "Une erreur est survenue lors de la tentative de débannissement.")] });
      return interaction.reply({ embeds: [createErrorEmbed('Erreur', "Une erreur est survenue lors de la tentative de débannissement.")], flags: 64 // MessageFlags.Ephemeral });
    }
  },
};



