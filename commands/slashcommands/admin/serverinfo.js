import { SlashCommandBuilder } from 'discord.js';
import { Colors, ChannelType, EmbedBuilder } from 'discord.js';
import { createErrorEmbed } from '../../../src/utils/embeds.js';
import { buildServerInfoInitial } from '../../../src/handlers/buttonHandlers.js';

export default {
  category: 'admin',
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Affiche les informations détaillées du serveur.'),
  async execute(interaction) {
    try {
      const g = interaction.guild;
      // Charger tous les membres pour des comptages corrects (humains, bots, statuts)
      await g.members.fetch();
      const created = `<t:${Math.floor(g.createdTimestamp / 1000)}:F>`;
      const ownerId = g.ownerId;
      const rolesCount = g.roles.cache.size;
      const channels = g.channels.cache;
      const textCount = channels.filter(c => c.type === ChannelType.GuildText).size;
      const voiceCount = channels.filter(c => c.type === ChannelType.GuildVoice).size;
      const bots = g.members.cache.filter(m => m.user.bot).size;
      const humans = g.members.cache.filter(m => !m.user.bot).size;
      const presences = g.members.cache.map(m => m.presence?.status).filter(Boolean);
      const online = presences.filter(s => s === 'online').length;
      const idle = presences.filter(s => s === 'idle').length;
      const dnd = presences.filter(s => s === 'dnd').length;
      const offline = g.memberCount - (online + idle + dnd);
      const boostLevel = g.premiumTier || 0;
      const boosts = g.premiumSubscriptionCount || 0;

      const init = await buildServerInfoInitial(g);
      return interaction.reply({ embeds: [init.embed], components: init.components });
    } catch (error) {
      console.error('[ERREUR] Slash /serverinfo:', error);
      if (interaction.deferred || interaction.replied) return interaction.editReply({ embeds: [createErrorEmbed('Erreur', "Une erreur est survenue lors de la récupération des informations du serveur.")] });
      return interaction.reply({ embeds: [createErrorEmbed('Erreur', "Une erreur est survenue lors de la récupération des informations du serveur.")], flags: 64 // MessageFlags.Ephemeral });
    }
  },
};



