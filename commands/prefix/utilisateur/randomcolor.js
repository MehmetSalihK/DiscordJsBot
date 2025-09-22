import { EmbedBuilder, Colors } from 'discord.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { sendGuildLog } from '../../../src/utils/logs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  name: 'randomcolor',
  description: 'Attribue un rôle de couleur aléatoire à l\'utilisateur',
  category: 'utilisateur',
  async execute(message, args, client) {
    try {
      // Charger les rôles de couleur depuis le fichier JSON
      const rolesPath = join(__dirname, '../../../data/roles_boutons.json');
      const rolesData = JSON.parse(readFileSync(rolesPath, 'utf8'));
      const colorRoles = rolesData.couleur;

      if (!colorRoles || colorRoles.length === 0) {
        return message.reply('❌ Aucun rôle de couleur n\'est configuré.');
      }

      const guild = message.guild;
      const member = message.member;

      // Vérifier les rôles de couleur existants et les filtrer s'ils existent sur le serveur
      const validColorRoles = [];
      const existingColorRoleIds = [];

      for (const colorRole of colorRoles) {
        const role = guild.roles.cache.get(colorRole.roleId);
        if (role) {
          validColorRoles.push({ ...colorRole, role });
          existingColorRoleIds.push(colorRole.roleId);
        } else {
          console.warn(`[RandomColor] Rôle de couleur non trouvé: ${colorRole.name} (${colorRole.roleId})`);
        }
      }

      if (validColorRoles.length === 0) {
        return message.reply('❌ Aucun rôle de couleur valide n\'a été trouvé sur ce serveur.');
      }

      // Retirer les anciens rôles de couleur de l'utilisateur
      const userColorRoles = member.roles.cache.filter(role => 
        existingColorRoleIds.includes(role.id)
      );

      if (userColorRoles.size > 0) {
        await member.roles.remove(userColorRoles);
        console.log(`[RandomColor] Rôles de couleur retirés de ${member.user.tag}: ${userColorRoles.map(r => r.name).join(', ')}`);
      }

      // Choisir un rôle de couleur aléatoire
      const randomColorRole = validColorRoles[Math.floor(Math.random() * validColorRoles.length)];
      
      // Attribuer le nouveau rôle
      await member.roles.add(randomColorRole.role);

      // Log en console
      console.log(`[RandomColor] Rôle "${randomColorRole.name}" attribué à ${member.user.tag} (${member.user.id})`);

      // Créer l'embed de confirmation
      const confirmEmbed = new EmbedBuilder()
        .setColor(randomColorRole.color || Colors.Blurple)
        .setTitle('🎨 Nouvelle couleur attribuée !')
        .setDescription(`Une nouvelle couleur t'a été attribuée : **${randomColorRole.name}**`)
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: `Demandé par ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

      await message.reply({ embeds: [confirmEmbed] });

      // Envoyer un log si activé
      const logEmbed = new EmbedBuilder()
        .setColor(randomColorRole.color || Colors.Blurple)
        .setTitle('🎨 Rôle de couleur attribué')
        .setDescription(`**Utilisateur :** ${member.user.tag} (${member.user.id})\n**Rôle attribué :** ${randomColorRole.name}\n**Canal :** ${message.channel}`)
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

      await sendGuildLog(client, guild.id, logEmbed);

    } catch (error) {
      console.error('[RandomColor] Erreur lors de l\'exécution de la commande:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setColor(Colors.Red)
        .setTitle('❌ Erreur')
        .setDescription('Une erreur est survenue lors de l\'attribution de la couleur. Veuillez réessayer.')
        .setTimestamp();

      await message.reply({ embeds: [errorEmbed] }).catch(() => {
        message.reply('❌ Une erreur est survenue lors de l\'attribution de la couleur.');
      });
    }
  },
};