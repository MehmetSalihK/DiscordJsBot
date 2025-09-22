import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { createSuccessEmbed, createErrorEmbed } from '../../../src/utils/embeds.js';
import { sendGuildLog } from '../../../src/utils/logs.js';

export default {
  category: 'moderateur',
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Envoie un avertissement à un utilisateur.')
    .addUserOption(opt => opt.setName('utilisateur').setDescription('Utilisateur à avertir').setRequired(true))
    .addStringOption(opt => opt.setName('raison').setDescription("Raison de l'avertissement").setRequired(false)),
  async execute(interaction) {
    try {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ModerateMembers)) {
        return interaction.reply({ embeds: [createErrorEmbed('Permission manquante', "Vous n'avez pas la permission d'avertir des membres.")], flags: 64 }); // MessageFlags.Ephemeral
      }
      const user = interaction.options.getUser('utilisateur', true);
      const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

      await user.send(`Vous avez reçu un avertissement sur ${interaction.guild.name}: ${reason}`).catch(() => {});
      const emb = createSuccessEmbed('Avertissement', `Avertissement envoyé à **${user.tag}**.\nRaison: ${reason}`);
      await interaction.reply({ embeds: [emb] });
      await sendGuildLog(interaction.client, interaction.guildId, emb);
    } catch (error) {
      console.error('[ERREUR] Slash /warn:', error);
      if (interaction.deferred || interaction.replied) return interaction.editReply({ embeds: [createErrorEmbed('Erreur', "Une erreur est survenue lors de l'envoi de l'avertissement.")] });
      return interaction.reply({ embeds: [createErrorEmbed('Erreur', "Une erreur est survenue lors de l'envoi de l'avertissement.")], flags: 64 }); // MessageFlags.Ephemeral
    }
  },
};




