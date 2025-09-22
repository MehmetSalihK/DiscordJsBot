import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import rgbManager from '../../../src/utils/rgbManager.js';
import logger from '../../../src/utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('pausergb')
        .setDescription('Met en pause le mode RGB dynamique pour un rôle')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Le rôle à mettre en pause')
                .setRequired(true)),
    category: 'utilisateur',
    async execute(interaction) {
        try {
            // Vérifier les permissions
            if (!interaction.member.permissions.has('ManageRoles')) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription('Vous devez avoir la permission `Gérer les rôles` pour utiliser cette commande.')
                    .setTimestamp();
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const role = interaction.options.getRole('role');

            // Mettre en pause le RGB
            const result = await rgbManager.pauseRGB(role.id);

            if (result.success) {
                const embed = new EmbedBuilder()
                    .setColor('#ff9900')
                    .setTitle('⏸️ RGB Mis en Pause')
                    .setDescription(`Le mode RGB a été mis en pause pour le rôle ${role}`)
                    .addFields(
                        { name: 'Statut', value: 'En pause', inline: true }
                    )
                    .setTimestamp();
                
                logger.info(`⏸️ [ACTION] RGB mis en pause pour ${role.name} par ${interaction.user.tag}`);
                return interaction.reply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription(result.message)
                    .setTimestamp();
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

        } catch (error) {
            logger.error('Erreur dans la commande slash pausergb', error);
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur interne')
                .setDescription('Une erreur est survenue lors de l\'exécution de la commande.')
                .setTimestamp();
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};