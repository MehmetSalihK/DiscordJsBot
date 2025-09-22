import { EmbedBuilder } from 'discord.js';
import rgbManager from '../../../src/utils/rgbManager.js';
import logger from '../../../src/utils/logger.js';

export default {
    name: 'pausergb',
    description: 'Met en pause le mode RGB dynamique pour un rôle',
    category: 'utilisateur',
    usage: '!pausergb @role',
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
                    .setDescription('Usage: `!pauseRGB @role`\n\nExemple: `!pauseRGB @MonRole`')
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

            // Mettre en pause le RGB
            const result = await rgbManager.pauseRGB(roleId);

            if (result.success) {
                const embed = new EmbedBuilder()
                    .setColor('#ff9900')
                    .setTitle('⏸️ RGB Mis en Pause')
                    .setDescription(`Le mode RGB a été mis en pause pour le rôle ${role}`)
                    .addFields(
                        { name: 'Statut', value: 'En pause', inline: true }
                    )
                    .setTimestamp();
                
                logger.info(`⏸️ [ACTION] RGB mis en pause pour ${role.name} par ${message.author.tag}`);
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
            logger.error('Erreur dans la commande pauseRGB', error);
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur interne')
                .setDescription('Une erreur est survenue lors de l\'exécution de la commande.')
                .setTimestamp();
            return message.reply({ embeds: [embed] });
        }
    }
};