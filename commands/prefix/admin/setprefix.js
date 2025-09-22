import { PermissionsBitField } from 'discord.js';
import { setPrefix, getPrefix } from '../../../src/store/configStore.js';
import { config } from '../../../src/config.js';

export default {
  name: 'setprefix',
  description: 'Change le préfixe du bot pour ce serveur.',
  category: 'admin',
  usage: '!setprefix <nouveau_prefixe>',
  async execute(message, args) {
    try {
      if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return message.reply("Vous n'avez pas la permission de modifier le préfixe (Manage Guild requis).");
      }
      const newPrefix = args[0];
      if (!newPrefix) return message.reply(`Utilisation: ${this.usage}`);
      setPrefix(message.guild.id, newPrefix);
      const effective = getPrefix(message.guild.id, config.prefix);
      return message.reply(`Le préfixe a été mis à jour: \`${effective}\``);
    } catch (error) {
      console.error('[ERREUR] Commande prefix setprefix:', error);
      return message.reply("Une erreur est survenue lors de la mise à jour du préfixe.");
    }
  },
};



