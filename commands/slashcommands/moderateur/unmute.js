import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { createSuccessEmbed, createErrorEmbed } from '../../../src/utils/embeds.js';
import { sendGuildLog } from '../../../src/utils/logs.js';

export default {
  category: 'moderateur',
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Retire le timeout d’un utilisateur.')
    .addUserOption(opt => opt.setName('utilisateur').setDescription('Utilisateur à rétablir').setRequired(true))
    .addStringOption(opt => opt.setName('raison').setDescription('Raison du retrait du timeout').setRequired(false)),
  async execute(interaction) {
    try {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ModerateMembers)) {
        return interaction.reply({ embeds: [createErrorEmbed('Permission manquante', "Vous n'avez pas la permission de retirer un timeout.")], flags: 64 // MessageFlags.Ephemeral });
      }
      if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return interaction.reply({ embeds: [createErrorEmbed('Permission manquante', "Je n'ai pas la permission de retirer un timeout.")], flags: 64 // MessageFlags.Ephemeral });
      }

      const user = interaction.options.getUser('utilisateur', true);
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ embeds: [createErrorEmbed('Introuvable', 'Utilisateur introuvable sur ce serveur.')], flags: 64 // MessageFlags.Ephemeral });
      const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

      await member.timeout(null, reason);
      const emb = createSuccessEmbed('Retrait du timeout', `Le timeout de **${user.tag}** a été retiré avec succès.\nRaison: ${reason}`);
      await interaction.reply({ embeds: [emb] });
      await sendGuildLog(interaction.client, interaction.guildId, emb);
    } catch (error) {
      console.error('[ERREUR] Slash /unmute:', error);
      if (interaction.deferred || interaction.replied) return interaction.editReply({ embeds: [createErrorEmbed('Erreur', "Une erreur est survenue lors de la tentative de retrait du timeout.")] });
      return interaction.reply({ embeds: [createErrorEmbed('Erreur', "Une erreur est survenue lors de la tentative de retrait du timeout.")], flags: 64 // MessageFlags.Ephemeral });
    }
  },
};



