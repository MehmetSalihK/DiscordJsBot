import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import rgbManager from '../../../src/utils/rgbManager.js';
import logger from '../../../src/utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('stoprgb')
        .setDescription('Arrête complètement le mode RGB dynamique pour un rôle')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Le rôle à arrêter')
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
                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }

            const role = interaction.options.getRole('role');

            // Arrêter le RGB
            const result = await rgbManager.stopRGB(role.id);

            if (result.success) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('⏹️ RGB Arrêté')
                    .setDescription(`Le mode RGB a été arrêté pour le rôle ${role}`)
                    .addFields(
                        { name: 'Statut', value: 'Arrêté', inline: true }
                    )
                    .setTimestamp();
                
                logger.info(`⏹️ [ACTION] RGB arrêté pour ${role.name} par ${interaction.user.tag}`);
                return interaction.reply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Erreur')
                    .setDescription(result.message)
                    .setTimestamp();
                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }

        } catch (error) {
            logger.error('Erreur dans la commande slash stoprgb', error);
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur interne')
                .setDescription('Une erreur est survenue lors de l\'exécution de la commande.')
                .setTimestamp();
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
    }
};
