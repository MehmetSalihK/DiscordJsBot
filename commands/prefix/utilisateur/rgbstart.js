import { EmbedBuilder } from 'discord.js';
import rgbManager from '../../../src/utils/rgbManager.js';
import logger from '../../../src/utils/logger.js';

export default {
    name: 'rgbstart',
    description: 'Démarre le mode RGB dynamique pour un rôle',
    category: 'utilisateur',
    usage: '!rgbstart @role [intervalle]',
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
                    .setDescription('Usage: `!rgbstart @role [intervalle]`\n\nExemple: `!rgbstart @MonRole 2000`')
                    .addFields(
                        { name: 'Paramètres', value: '• `@role` - Le rôle à mettre en RGB\n• `[intervalle]` - Intervalle en ms (défaut: 2000ms)', inline: false }
                    )
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

            // Vérifier l'intervalle (optionnel)
            let interval = 2000; // Défaut: 2 secondes
            if (args[1]) {
                const parsedInterval = parseInt(args[1]);
                if (isNaN(parsedInterval) || parsedInterval < 1000) {
                    const embed = new EmbedBuilder()
                        .setColor('#ff9900')
                        .setTitle('⚠️ Intervalle invalide')
                        .setDescription('L\'intervalle doit être un nombre supérieur ou égal à 1000ms (1 seconde).')
                        .setTimestamp();
                    return message.reply({ embeds: [embed] });
                }
                interval = parsedInterval;
            }

            // Démarrer le RGB
            const result = await rgbManager.startRGB(message.guild, roleId, interval);

            if (result.success) {
                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ RGB Démarré')
                    .setDescription(`Le mode RGB a été démarré pour le rôle ${role}`)
                    .addFields(
                        { name: 'Intervalle', value: `${interval}ms`, inline: true },
                        { name: 'Statut', value: 'Actif', inline: true }
                    )
                    .setTimestamp();
                
                logger.info(`🎨 [ACTION] RGB démarré pour ${role.name} par ${message.author.tag}`);
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
            logger.error('Erreur dans la commande rgbstart', error);
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur interne')
                .setDescription('Une erreur est survenue lors de l\'exécution de la commande.')
                .setTimestamp();
            return message.reply({ embeds: [embed] });
        }
    }
};