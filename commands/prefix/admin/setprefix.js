import { PermissionsBitField, EmbedBuilder } from 'discord.js';
import { setPrefix, getPrefix } from '../../../src/store/configStore.js';
import { config } from '../../../src/config.js';

export default {
  name: 'setprefix',
  description: 'Change le préfixe du bot pour ce serveur.',
  category: 'admin',
  usage: '!setprefix <nouveau_prefixe>',
  async execute(message, args) {
    try {
      // Vérifier les permissions d'administrateur
      if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply({ 
          content: '❌ Tu n\'as pas la permission d\'utiliser cette commande.',
          allowedMentions: { repliedUser: false }
        });
      }

      const oldPrefix = getPrefix(message.guild.id, config.prefix);
      const newPrefix = args[0];
      
      // Vérifier si un préfixe a été fourni
      if (!newPrefix) {
        return message.reply(`❌ Utilisation: ${this.usage}`);
      }

      // Mettre à jour le préfixe
      setPrefix(message.guild.id, newPrefix);
      
      // Créer un embed de confirmation
      const embed = new EmbedBuilder()
        .setColor('#4CAF50')
        .setTitle('✅ Préfixe mis à jour avec succès !')
        .addFields(
          { name: 'Ancien préfixe', value: `\`${oldPrefix}\``, inline: true },
          { name: 'Nouveau préfixe', value: `\`${newPrefix}\``, inline: true },
        )
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('[ERREUR] Commande prefix setprefix:', error);
      return message.reply({ 
        content: '❌ Une erreur est survenue lors de la mise à jour du préfixe.',
        allowedMentions: { repliedUser: false }
      });
    }
  },
};



