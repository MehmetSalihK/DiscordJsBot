import { SlashCommandBuilder } from 'discord.js';

export default {
  category: 'utilisateur',
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription("Affiche l'avatar de l'utilisateur spécifié (ou le vôtre).")
    .addUserOption(opt => opt.setName('utilisateur').setDescription('Utilisateur dont afficher l\'avatar').setRequired(false)),
  async execute(interaction) {
    try {
      const user = interaction.options.getUser('utilisateur') || interaction.user;
      const url = user.displayAvatarURL({ extension: 'png', size: 1024, forceStatic: false });
      return interaction.reply(`Avatar de ${user.tag}: ${url}`);
    } catch (error) {
      console.error('[ERREUR] Slash /avatar:', error);
      if (interaction.deferred || interaction.replied) return interaction.editReply("Une erreur est survenue lors de la récupération de l'avatar.");
      return interaction.reply({ content: "Une erreur est survenue lors de la récupération de l'avatar.", flags: 64 // MessageFlags.Ephemeral });
    }
  },
};



