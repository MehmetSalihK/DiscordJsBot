import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import rgbManager from '../../../src/utils/rgbManager.js';
import logger from '../../../src/utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('rgbpanel')
        .setDescription('Affiche le panel de gestion des rôles RGB'),
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

            const config = await rgbManager.loadConfig();
            
            if (config.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor('#ff9900')
                    .setTitle('🎨 Panel RGB')
                    .setDescription('Aucun rôle RGB actif pour le moment.')
                    .setTimestamp();
                return interaction.reply({ embeds: [embed] });
            }

            // Créer l'embed principal
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('🎨 Panel de Gestion RGB')
                .setDescription('Gérez vos rôles RGB avec les boutons ci-dessous')
                .setTimestamp();

            // Ajouter les champs pour chaque rôle
            for (const roleConfig of config) {
                const role = interaction.guild.roles.cache.get(roleConfig.roleId);
                if (role) {
                    const statusEmoji = roleConfig.status === 'active' ? '🟢' : 
                                      roleConfig.status === 'paused' ? '🟡' : '🔴';
                    
                    embed.addFields({
                        name: `${statusEmoji} ${role.name}`,
                        value: `**Statut:** ${roleConfig.status}\n**Intervalle:** ${roleConfig.interval}ms\n**Couleur actuelle:** #${roleConfig.currentColor.toString(16).padStart(6, '0')}`,
                        inline: true
                    });
                }
            }

            // Créer les boutons de gestion globaux (première ligne)
            const rows = [];
            const globalRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('rgb_add_role')
                        .setLabel('Ajouter Rôle')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('➕'),
                    new ButtonBuilder()
                        .setCustomId('rgb_stop_all')
                        .setLabel('Tout Arrêter')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('⏹️'),
                    new ButtonBuilder()
                        .setCustomId('rgb_pause_all')
                        .setLabel('Tout Suspendre')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('⏸️'),
                    new ButtonBuilder()
                        .setCustomId('rgb_resume_all')
                        .setLabel('Tout Reprendre')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('▶️'),
                    new ButtonBuilder()
                        .setCustomId('rgb_refresh_panel')
                        .setLabel('Rafraîchir')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔄')
                );
            rows.push(globalRow);

            // Créer les boutons pour chaque rôle (max 5 par ligne)
            let currentRow = new ActionRowBuilder();
            let buttonCount = 0;

            for (const roleConfig of config) {
                const role = interaction.guild.roles.cache.get(roleConfig.roleId);
                if (role) {
                    // Bouton principal pour ce rôle
                    const button = new ButtonBuilder()
                        .setCustomId(`rgb_manage_${roleConfig.roleId}`)
                        .setLabel(role.name.length > 20 ? role.name.substring(0, 17) + '...' : role.name)
                        .setStyle(roleConfig.status === 'active' ? ButtonStyle.Success : 
                                roleConfig.status === 'paused' ? ButtonStyle.Secondary : ButtonStyle.Danger)
                        .setEmoji('🎨');

                    currentRow.addComponents(button);
                    buttonCount++;

                    // Si on a 5 boutons ou si c'est le dernier, on ajoute la ligne
                    if (buttonCount === 5 || roleConfig === config[config.length - 1]) {
                        rows.push(currentRow);
                        currentRow = new ActionRowBuilder();
                        buttonCount = 0;
                    }
                }
            }

            logger.info(`ℹ️ [INFO] Panel RGB affiché par ${interaction.user.tag}`);
            return interaction.reply({ embeds: [embed], components: rows });

        } catch (error) {
            logger.error('Erreur dans la commande slash rgbpanel', error);
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur interne')
                .setDescription('Une erreur est survenue lors de l\'affichage du panel.')
                .setTimestamp();
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};