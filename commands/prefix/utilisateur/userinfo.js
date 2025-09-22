export default {
  name: 'userinfo',
  description: "Affiche des informations sur l'utilisateur.",
  category: 'utilisateur',
  usage: '!userinfo [@utilisateur]'
  ,async execute(message) {
    try {
      const { EmbedBuilder, Colors } = await import('discord.js');
      const user = message.mentions.users.first() || message.author;
      const member = await message.guild.members.fetch(user.id).catch(() => null);
      const created = `<t:${Math.floor(user.createdTimestamp/1000)}:F>`;
      const joined = member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp/1000)}:F>` : 'Inconnu';
      const roles = member ? member.roles.cache.filter(r => r.id !== message.guild.id).map(r => `<@&${r.id}>`).join(', ') || 'Aucun' : 'Inconnu';

      const embed = new EmbedBuilder()
        .setColor(Colors.Blurple)
        .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
        .setTitle('👤 Informations utilisateur')
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: '🪪 ID', value: user.id, inline: true },
          { name: '📅 Compte créé', value: created, inline: true },
          { name: '📥 A rejoint', value: joined, inline: true },
          { name: '📜 Rôles', value: roles, inline: false },
        )
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('[ERREUR] Commande prefix userinfo:', error);
      const { createErrorEmbed } = await import('../../../src/utils/embeds.js');
      return message.reply({ embeds: [createErrorEmbed('Erreur', "Une erreur est survenue lors de la récupération des informations utilisateur.")] });
    }
  },
};



