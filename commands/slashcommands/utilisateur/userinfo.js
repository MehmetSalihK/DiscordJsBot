import { SlashCommandBuilder } from 'discord.js';

export default {
  category: 'utilisateur',
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription("Affiche des informations sur l'utilisateur.")
    .addUserOption(opt => opt.setName('utilisateur').setDescription('Utilisateur dont afficher les informations').setRequired(false)),
  async execute(interaction) {
    try {
      const user = interaction.options.getUser('utilisateur') || interaction.user;
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      const created = `<t:${Math.floor(user.createdTimestamp/1000)}:F>`;
      const joined = member ? `<t:${Math.floor(member.joinedTimestamp/1000)}:F>` : 'Inconnu';
      const roles = member ? member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => r.name).join(', ') || 'Aucun' : 'Inconnu';
      const lines = [
        `Tag: ${user.tag}`,
        `ID: ${user.id}`,
        `Compte créé: ${created}`,
        `A rejoint: ${joined}`,
        `Rôles: ${roles}`,
      ];
      return interaction.reply({ content: `Informations de l'utilisateur:\n${lines.join('\n')}`, flags: 64 // MessageFlags.Ephemeral });
    } catch (error) {
      console.error('[ERREUR] Slash /userinfo:', error);
      if (interaction.deferred || interaction.replied) return interaction.editReply("Une erreur est survenue lors de la récupération des informations utilisateur.");
      return interaction.reply({ content: "Une erreur est survenue lors de la récupération des informations utilisateur.", flags: 64 // MessageFlags.Ephemeral });
    }
  },
};
