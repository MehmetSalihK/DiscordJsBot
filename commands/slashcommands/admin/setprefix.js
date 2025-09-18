import { SlashCommandBuilder, PermissionsBitField } from 'discord.js';
import { setPrefix, getPrefix } from '../../../src/store/prefixStore.js';
import { config } from '../../../src/config.js';

export default {
  category: 'admin',
  data: new SlashCommandBuilder()
    .setName('setprefix')
    .setDescription('Change le préfixe du bot pour ce serveur.')
    .addStringOption(opt => opt.setName('prefixe').setDescription('Nouveau préfixe').setRequired(true)),
  async execute(interaction) {
    try {
      if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)) {
        return interaction.reply({ content: "Vous n'avez pas la permission de modifier le préfixe (Manage Guild requis).", ephemeral: true });
      }
      const newPrefix = interaction.options.getString('prefixe', true);
      setPrefix(interaction.guild.id, newPrefix);
      const effective = getPrefix(interaction.guild.id, config.prefix);
      return interaction.reply({ content: `Le préfixe a été mis à jour: \`${effective}\``, ephemeral: true });
    } catch (error) {
      console.error('[ERREUR] Slash /setprefix:', error);
      if (interaction.deferred || interaction.replied) return interaction.editReply("Une erreur est survenue lors de la mise à jour du préfixe.");
      return interaction.reply({ content: "Une erreur est survenue lors de la mise à jour du préfixe.", ephemeral: true });
    }
  },
};
