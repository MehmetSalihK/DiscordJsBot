import { EmbedBuilder } from 'discord.js';
import rgbManager from '../../../src/utils/rgbManager.js';
import logger from '../../../src/utils/logger.js';

export default {
    name: 'pauseallrgb',
    description: 'Met en pause tous les rôles RGB actifs',
    category: 'utilisateur',
    usage: '!pauseallrgb',
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

            // Obtenir les rôles actifs
            const activeRoles = rgbManager.getActiveRoles();
            
            if (activeRoles.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#ff9900')
                    .setTitle('⚠️ Aucun rôle actif')
                    .setDescription('Aucun rôle RGB n\'est actuellement actif.')
                    .setTimestamp();
                return message.reply({ embeds: [embed] });
            }

            let successCount = 0;
            let failCount = 0;
            const results = [];

            // Mettre en pause chaque rôle actif
            for (const roleId of activeRoles) {
                const role = message.guild.roles.cache.get(roleId);
                const roleName = role ? role.name : `ID: ${roleId}`;
                
                const result = await rgbManager.pauseRGB(roleId);
                if (result.success) {
                    successCount++;
                    results.push(`✅ ${roleName}`);
                } else {
                    failCount++;
                    results.push(`❌ ${roleName}: ${result.message}`);
                }
            }

            const embed = new EmbedBuilder()
                .setColor(failCount === 0 ? '#00ff00' : '#ff9900')
                .setTitle('⏸️ Pause de tous les rôles RGB')
                .setDescription(`**Résultats:**\n${results.join('\n')}`)
                .addFields(
                    { name: 'Succès', value: successCount.toString(), inline: true },
                    { name: 'Échecs', value: failCount.toString(), inline: true }
                )
                .setTimestamp();

            logger.info(`⏸️ [ACTION] Pause de tous les rôles RGB par ${message.author.tag} - ${successCount} succès, ${failCount} échecs`);
            return message.reply({ embeds: [embed] });

        } catch (error) {
            logger.error('Erreur dans la commande pauseallrgb', error);
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur interne')
                .setDescription('Une erreur est survenue lors de l\'exécution de la commande.')
                .setTimestamp();
            return message.reply({ embeds: [embed] });
        }
    }
};