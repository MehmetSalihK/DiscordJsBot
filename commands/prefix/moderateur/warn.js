export default {
  name: 'warn',
  description: 'Envoie un avertissement à un utilisateur par message privé et dans le salon.',
  category: 'moderateur',
  usage: '!warn @utilisateur [raison]',
  async execute(message, args) {
    try {
      const { PermissionsBitField } = await import('discord.js');
      if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return message.reply("Vous n'avez pas la permission d'avertir les membres.");
      }
      const member = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
      if (!member) return message.reply(`Utilisation: ${this.usage}`);
      const reason = args.slice(1).join(' ') || 'Aucune raison fournie';
      // Tente d'envoyer en DM
      await member.user.send(`Vous avez reçu un avertissement sur ${message.guild.name}: ${reason}`).catch(() => {});
      return message.reply(`Avertissement envoyé à ${member.user.tag}. Raison: ${reason}`);
    } catch (error) {
      console.error('[ERREUR] Commande prefix warn:', error);
      return message.reply("Une erreur est survenue lors de l'envoi de l'avertissement.");
    }
  },
};



