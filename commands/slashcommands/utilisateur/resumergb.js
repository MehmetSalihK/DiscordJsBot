import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import rgbManager from '../../../src/utils/rgbManager.js';
import logger from '../../../src/utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('resumergb')
        .setDescription('Reprend le mode RGB dynamique pour un rôle')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Le rôle à reprendre')
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

            // Reprendre le RGB
            const result = await rgbManager.resumeRGB(interaction.guild, role.id);

            if (result.success) {
                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('▶️ RGB Repris')
                    .setDescription(`Le mode RGB a été repris pour le rôle ${role}`)
                    .addFields(
                        { name: 'Statut', value: 'Actif', inline: true }
                    )
                    .setTimestamp();
                
                logger.info(`▶️ [ACTION] RGB repris pour ${role.name} par ${interaction.user.tag}`);
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
            logger.error('Erreur dans la commande slash resumergb', error);
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur interne')
                .setDescription('Une erreur est survenue lors de l\'exécution de la commande.')
                .setTimestamp();
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
    }
};
