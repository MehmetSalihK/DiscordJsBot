import { EmbedBuilder } from 'discord.js';
import rgbManager from '../../../src/utils/rgbManager.js';

export default {
    name: 'rgbstatus',
    description: 'Affiche le statut des rôles RGB actifs',
    category: 'utilisateur',
    usage: '!rgbstatus',
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

            // Charger la configuration
            const config = await rgbManager.loadConfig();
            
            // Obtenir les rôles actifs en mémoire
            const activeInMemory = Array.from(rgbManager.activeIntervals.keys());
            
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🎨 Statut RGB')
                .setTimestamp();

            let description = '';
            
            if (config.length === 0) {
                description += '📄 **Configuration JSON:** Aucun rôle configuré\n';
            } else {
                description += '📄 **Configuration JSON:**\n';
                for (const roleConfig of config) {
                    const role = message.guild.roles.cache.get(roleConfig.roleId);
                    const roleName = role ? role.name : `ID: ${roleConfig.roleId}`;
                    description += `• ${roleName} - ${roleConfig.status}\n`;
                }
            }
            
            description += '\n';
            
            if (activeInMemory.length === 0) {
                description += '💾 **Actifs en mémoire:** Aucun rôle actif\n';
            } else {
                description += '💾 **Actifs en mémoire:**\n';
                for (const roleId of activeInMemory) {
                    const role = message.guild.roles.cache.get(roleId);
                    const roleName = role ? role.name : `ID: ${roleId}`;
                    description += `• ${roleName}\n`;
                }
            }

            embed.setDescription(description);
            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Erreur dans rgbstatus:', error);
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur interne')
                .setDescription('Une erreur est survenue lors de l\'exécution de la commande.')
                .setTimestamp();
            return message.reply({ embeds: [embed] });
        }
    }
};