import { EmbedBuilder } from 'discord.js';
import rgbManager from '../../../src/utils/rgbManager.js';
import logger from '../../../src/utils/logger.js';

export default {
    name: 'resumergb',
    description: 'Reprend le mode RGB dynamique pour un rôle mis en pause',
    category: 'utilisateur',
    usage: '!resumergb @role',
    async execute(message, args) {
        try {
            // Vérifier les permissions
            if (!message.member.permissions.has('ManageRoles')) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription('Vous devez avoir la permission `Gérer les rôles` pour utiliser cette commande.')
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }

            // Vérifier les arguments
            if (args.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#ff9900')
                    .setTitle('⚠️ Usage incorrect')
                    .setDescription('Usage: `!resumeRGB @role`\n\nExemple: `!resumeRGB @MonRole`')
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }

            // Extraire le rôle mentionné
            const roleId = args[0].replace(/[<@&>]/g, '');
            const role = message.guild.roles.cache.get(roleId);

            if (!role) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription('Rôle non trouvé. Assurez-vous de mentionner un rôle valide.')
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }

            // Reprendre le RGB
            const result = await rgbManager.resumeRGB(message.guild, roleId);

            if (result.success) {
                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('▶️ RGB Repris')
                    .setDescription(`Le mode RGB a été repris pour le rôle ${role}`)
                    .addFields(
                        { name: 'Statut', value: 'Actif', inline: true }
                    )
                    .setTimestamp();
                
                logger.info(`▶️ [ACTION] RGB repris pour ${role.name} par ${message.author.tag}`);
                return message.reply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription(result.message)
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }

        } catch (error) {
            logger.error('Erreur dans la commande resumeRGB', error);
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur interne')
                .setDescription('Une erreur est survenue lors de l\'exécution de la commande.')
                .setTimestamp();
            return message.reply({ embeds: [embed] });
        }
    }
};