import { PermissionsBitField } from 'discord.js';

export default {
  name: 'unmute',
  description: 'Retire le timeout d’un utilisateur.',
  category: 'moderateur',
  usage: '!unmute @utilisateur [raison]',
  async execute(message, args) {
    try {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return message.reply("Vous n'avez pas la permission de retirer un timeout.");
      }
      if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return message.reply("Je n'ai pas la permission de retirer un timeout.");
      }

      const target = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
      const reason = args.slice(1).join(' ') || 'Aucune raison fournie';
      if (!target) return message.reply(`Utilisation: ${this.usage}`);

      await target.timeout(null, reason); // retire le timeout
      return message.reply(`Le timeout de ${target.user.tag} a été retiré avec succès. Raison: ${reason}`);
    } catch (error) {
      console.error('[ERREUR] Commande prefix unmute:', error);
      return message.reply("Une erreur est survenue lors de la tentative de retrait du timeout.");
    }
  },
};
