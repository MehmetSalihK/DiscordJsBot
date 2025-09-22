import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import rgbManager from '../../../src/utils/rgbManager.js';
import logger from '../../../src/utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('rgbstart')
        .setDescription('Démarre le mode RGB dynamique pour un rôle')
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Le rôle à mettre en mode RGB')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('intervalle')
                .setDescription('Intervalle entre les changements de couleur en millisecondes (min: 1000ms)')
                .setMinValue(1000)
                .setRequired(false)),
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
            const interval = interaction.options.getInteger('intervalle') || 2000;

            // Démarrer le RGB
            const result = await rgbManager.startRGB(interaction.guild, role.id, interval);

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
                
                logger.info(`🎨 [ACTION] RGB démarré pour ${role.name} par ${interaction.user.tag}`);
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
            logger.error('Erreur dans la commande slash rgbstart', error);
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur interne')
                .setDescription('Une erreur est survenue lors de l\'exécution de la commande.')
                .setTimestamp();
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};