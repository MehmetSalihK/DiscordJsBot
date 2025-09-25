import { MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import reactionRoleModals from '../handlers/reactionRoleModals.js';
import reactionRoleSelectButtons from '../handlers/reactionRoleSelectButtons.js';
import rgbManager from '../utils/rgbManager.js';
import logger from '../utils/logger.js';
import { handleManagementButtons, handleSelectMenuInteraction, handleModalSubmit } from '../handlers/autoVoiceHandlers.js';

export default {
    name: 'interactionCreate',
    async execute(interaction, client) {
        try {
            // Gestion des commandes slash
            if (interaction.isChatInputCommand()) {
                const command = client.slashCommands.get(interaction.commandName);
                if (!command) {
                    await interaction.reply({ content: 'Commande introuvable.', flags: MessageFlags.Ephemeral });
                    return;
                }
                await command.execute(interaction, client);
            } 
            // Gestion des boutons
            else if (interaction.isButton()) {
                const id = interaction.customId || '';
                
                // Vérifier d'abord si c'est une interaction ReactionRole Select/Button
                const handled = await reactionRoleSelectButtons.handleInteraction(interaction);
                
                if (!handled) {
                    // Gestion des boutons d'aide, logs, serveur info
                    if (id.startsWith('help_')) {
                        const { handleHelpButton } = await import('../handlers/buttonHandlers.js');
                        return handleHelpButton(interaction, client);
                    }
                    if (id.startsWith('logs_')) {
                        const { handleLogsButton } = await import('../handlers/buttonHandlers.js');
                        return handleLogsButton(interaction, client);
                    }
                    if (id.startsWith('srv_')) {
                        const { handleServerInfoButton } = await import('../handlers/buttonHandlers.js');
                        return handleServerInfoButton(interaction, client);
                    }

                    
                    // Gestion des boutons UserInfo
                    if (id.startsWith('userinfo_')) {
                        const { handleUserInfoButton } = await import('../handlers/buttonHandlers.js');
                        return handleUserInfoButton(interaction, client);
                    }
                    
                    // Gestion des boutons Auto Voice Channel
                    if (id.startsWith('autovoice_')) {
                        return handleManagementButtons(interaction);
                    }
                    
                    // Gestion des boutons Social Panel
                    if (id.startsWith('social_')) {
                        const { handleSocialButtonInteraction } = await import('../handlers/socialInteractions.js');
                        return handleSocialButtonInteraction(interaction);
                    }
                    
                    // Gestion des boutons AutoRole
                    if (id.startsWith('autorole_')) {
                        const { handleAutoRoleInteraction } = await import('../modules/autorole/interactions.js');
                        return handleAutoRoleInteraction(interaction);
                    }
                    
                    // Gestion des boutons de réaction
                    if (id.startsWith('buttonreact_')) {
                        const { handleButtonReactInteraction } = await import('../modules/buttonreact/interactions.js');
                        await handleButtonReactInteraction(interaction);
                        return;
                    }
                    
                    // Gestion des boutons de musique
                    if (id.startsWith('music_') || id.startsWith('queue_') || id.startsWith('search_')) {
                        await client.musicButtonHandler.handleButtonInteraction(interaction);
                        return;
                    }
                    
                    // Gestion des boutons RGB
                    if (id.startsWith('rgb_')) {
                        await handleRGBInteraction(interaction);
                        return;
                    }
                    
                    // Gestion des boutons Reaction Roles
                    if (id.startsWith('rr_')) {
                        const reactionRoleInteractions = await import('../handlers/reactionRoleInteractions.js');
                        return reactionRoleInteractions.default.handleInteraction(interaction);
                    }
                    
                    // Gestion des boutons de modération des liens
                    if (id.startsWith('linkmod_action_')) {
                        const { handleLinkModerationButtons } = await import('../handlers/linkModerationButtons.js');
                        return handleLinkModerationButtons(interaction);
                    }
                    
                    // Gestion des boutons de configuration de modération des liens
                    if (id.startsWith('linkmod_config_') || id.startsWith('linkmod_toggle_') || 
                        id.startsWith('linkmod_change_channel_') || id.startsWith('linkmod_remove_channel_') ||
                        id.startsWith('linkmod_whitelist_') || id.startsWith('linkmod_blacklist_') ||
                        id.startsWith('linkmod_temp_punishments_') || id.startsWith('linkmod_refresh_')) {
                        const { handleLinkModerationConfig } = await import('../handlers/linkModerationConfig.js');
                        return handleLinkModerationConfig(interaction);
                    }
                    
                    // Gestion des boutons XP (classement et configuration)
                    if (id.startsWith('leaderboard_') || id.startsWith('config_')) {
                        const { handleXPButtonInteraction } = await import('../handlers/xpButtonHandler.js');
                        return handleXPButtonInteraction(interaction);
                    }
                    
                    // Gestion des boutons du panneau staff de suspensions (logs)
                    if (id.startsWith('suspension_staff_')) {
                        const { handleSuspensionButtons } = await import('../handlers/suspensionButtons.js');
                        return handleSuspensionButtons(interaction);
                    }
                    
                    // Gestion de l'interface interactive de suspension
                    if (id.startsWith('suspension_')) {
                        const { handleSuspensionInterface } = await import('../handlers/suspensionInterface.js');
                        return handleSuspensionInterface(interaction);
                    }
                    
                    // Anciens boutons (compatibilité)
                    switch (interaction.customId) {
                        case 'help_button':
                            const { handleHelpButton } = await import('../handlers/buttonHandlers.js');
                            await handleHelpButton(interaction);
                            break;
                        case 'logs_button':
                            const { handleLogsButton } = await import('../handlers/buttonHandlers.js');
                            await handleLogsButton(interaction);
                            break;
                        case 'server_info_button':
                            const { handleServerInfoButton } = await import('../handlers/buttonHandlers.js');
                            await handleServerInfoButton(interaction);
                            break;

                    }
                }
            }
            // Gestion des menus de sélection
            else if (interaction.isStringSelectMenu()) {
                // Vérifier d'abord si c'est une interaction ReactionRole Select/Button
                const handled = await reactionRoleSelectButtons.handleInteraction(interaction);
                
                if (!handled) {
                    if (interaction.customId.startsWith('autorole_')) {
                        const { handleAutoRoleInteraction } = await import('../modules/autorole/interactions.js');
                        return handleAutoRoleInteraction(interaction);
                    }
                    
                    // Gestion des menus déroulants Reaction Roles
                    if (interaction.customId.startsWith('rr_')) {
                        const reactionRoleInteractions = await import('../handlers/reactionRoleInteractions.js');
                        return reactionRoleInteractions.default.handleInteraction(interaction);
                    }
                    
                    // Gestion des menus select Social Panel
                    if (interaction.customId.startsWith('social_select_')) {
                        const { handleSocialSelectInteraction } = await import('../handlers/socialInteractions.js');
                        return handleSocialSelectInteraction(interaction);
                    }
                    
                    // Gestion des menus select Auto Voice Channel
                    if (interaction.customId.startsWith('autovoice_') && interaction.customId.includes('_select_')) {
                        return handleSelectMenuInteraction(interaction);
                    }
                }
            }
            // Gestion des modals
            else if (interaction.isModalSubmit()) {

                
                // Gestion des modales AutoRole
                if (interaction.customId.startsWith('autorole_')) {
                    const { handleAutoRoleInteraction } = await import('../modules/autorole/interactions.js');
                    return handleAutoRoleInteraction(interaction);
                }
                
                // Gestion des modales Reaction Roles
                if (interaction.customId.startsWith('rr_') && interaction.customId.endsWith('_modal')) {
                    const reactionRoleModals = await import('../handlers/reactionRoleModals.js');
                    return reactionRoleModals.default.handleModal(interaction);
                }
                
                // Gestion des modals Social Panel
                if (interaction.customId.startsWith('social_modal_')) {
                    const { handleSocialModalInteraction } = await import('../handlers/socialInteractions.js');
                    return handleSocialModalInteraction(interaction);
                }
                
                // Gestion des modals Auto Voice Channel
                if (interaction.customId.startsWith('autovoice_') && interaction.customId.includes('_modal_')) {
                    return handleModalSubmit(interaction);
                }
                
                // Gestion des modals de modération des liens - temp ban
                if (interaction.customId.startsWith('linkmod_tempban_modal_')) {
                    const { handleTempBanModal } = await import('../handlers/linkModerationButtons.js');
                    return handleTempBanModal(interaction);
                }
                
                // Gestion des modals de configuration de modération des liens
                if (interaction.customId.startsWith('linkmod_') && interaction.customId.includes('_modal_')) {
                    const { handleConfigModals } = await import('../handlers/linkModerationConfig.js');
                    return handleConfigModals(interaction);
                }
                

            }
        } catch (error) {
            logger.error('Erreur lors du traitement d\'une interaction:', error);
            const reply = {
                content: '❌ Une erreur est survenue lors de l\'exécution de cette commande.',
                flags: MessageFlags.Ephemeral
            };
            
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply(reply);
            } else {
                await interaction.reply(reply);
            }
        }
    }
};

// Fonctions de gestion RGB
async function handleRGBInteraction(interaction) {
    try {
        // Vérifier les permissions
        if (!interaction.member.permissions.has('ManageRoles')) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur')
                .setDescription('Vous devez avoir la permission `Gérer les rôles` pour utiliser ces boutons.')
                .setTimestamp();
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const customId = interaction.customId;

        // Bouton de rafraîchissement du panel
        if (customId === 'rgb_refresh_panel') {
            await handleRefreshPanel(interaction);
            return;
        }

        // Boutons de gestion des rôles RGB
        if (customId.startsWith('rgb_manage_')) {
            const roleId = customId.replace('rgb_manage_', '');
            await handleRoleManagement(interaction, roleId);
            return;
        }

        // Boutons d'actions spécifiques
        if (customId.startsWith('rgb_action_')) {
            const parts = customId.split('_');
            const action = parts[2];
            const subAction = parts[3];
            const roleId = parts[parts.length - 1];
            
            if (action === 'speed' && subAction) {
                await handleRoleAction(interaction, `${action}_${subAction}`, roleId);
            } else if (action === 'color' && subAction) {
                await handleRoleAction(interaction, `${action}_${subAction}`, roleId);
            } else {
                await handleRoleAction(interaction, action, roleId);
            }
            return;
        }

        // Boutons de gestion globaux
        if (customId.startsWith('rgb_')) {
            await handleGlobalRGBAction(interaction, customId);
            return;
        }

    } catch (error) {
        logger.error('Erreur dans handleRGBInteraction:', error);
    }
}

async function handleRefreshPanel(interaction) {
    try {
        const config = await rgbManager.loadConfig();
        
        if (config.length === 0) {
            const embed = new EmbedBuilder()
                .setColor('#ff9900')
                .setTitle('🎨 Panel RGB')
                .setDescription('Aucun rôle RGB actif pour le moment.')
                .setTimestamp();
            return interaction.update({ embeds: [embed], components: [] });
        }

        // Créer l'embed mis à jour
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
                const button = new ButtonBuilder()
                    .setCustomId(`rgb_manage_${roleConfig.roleId}`)
                    .setLabel(role.name.length > 20 ? role.name.substring(0, 17) + '...' : role.name)
                    .setStyle(roleConfig.status === 'active' ? ButtonStyle.Success : 
                            roleConfig.status === 'paused' ? ButtonStyle.Secondary : ButtonStyle.Danger)
                    .setEmoji('🎨');

                currentRow.addComponents(button);
                buttonCount++;

                if (buttonCount === 5 || roleConfig === config[config.length - 1]) {
                    rows.push(currentRow);
                    currentRow = new ActionRowBuilder();
                    buttonCount = 0;
                }
            }
        }

        logger.info(`🔄 [ACTION] Panel RGB rafraîchi par ${interaction.user.tag}`);
        await interaction.update({ embeds: [embed], components: rows });

    } catch (error) {
        logger.error('Erreur lors du rafraîchissement du panel:', error);
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Erreur')
            .setDescription('Erreur lors du rafraîchissement du panel.')
            .setTimestamp();
        await interaction.update({ embeds: [embed], components: [] });
    }
}

async function handleRoleInfo(interaction, roleId) {
    try {
        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur')
                .setDescription('Rôle introuvable.')
                .setTimestamp();
            return interaction.update({ embeds: [embed], components: [] });
        }

        const config = await rgbManager.loadConfig();
        const roleConfig = config.find(r => r.roleId === roleId);

        if (!roleConfig) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur')
                .setDescription('Configuration du rôle introuvable.')
                .setTimestamp();
            return interaction.update({ embeds: [embed], components: [] });
        }

        const statusEmoji = roleConfig.status === 'active' ? '🟢' : 
                          roleConfig.status === 'paused' ? '🟡' : '🔴';

        const embed = new EmbedBuilder()
            .setColor(roleConfig.currentColor)
            .setTitle(`ℹ️ Informations - ${role.name}`)
            .setDescription(`Informations détaillées sur le rôle RGB`)
            .addFields(
                { name: 'Statut', value: `${statusEmoji} ${roleConfig.status}`, inline: true },
                { name: 'Intervalle', value: `${roleConfig.interval}ms`, inline: true },
                { name: 'Couleur actuelle', value: `#${roleConfig.currentColor.toString(16).padStart(6, '0')}`, inline: true },
                { name: 'ID du rôle', value: roleId, inline: true },
                { name: 'Membres avec ce rôle', value: `${role.members.size}`, inline: true },
                { name: 'Position', value: `${role.position}`, inline: true },
                { name: 'Créé le', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:F>`, inline: false },
                { name: 'Dernière mise à jour', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: false }
            )
            .setTimestamp();

        const backRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`rgb_manage_${roleId}`)
                    .setLabel('Retour à la gestion')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔙')
            );

        await interaction.update({ embeds: [embed], components: [backRow] });

    } catch (error) {
        logger.error('Erreur lors de l\'affichage des informations du rôle:', error);
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Erreur')
            .setDescription('Erreur lors de l\'affichage des informations.')
            .setTimestamp();
        await interaction.update({ embeds: [embed], components: [] });
    }
}

async function handleGlobalRGBAction(interaction, customId) {
    try {
        // Vérifier les permissions
        if (!interaction.member.permissions.has('ManageRoles')) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur')
                .setDescription('Vous devez avoir la permission `Gérer les rôles` pour utiliser ces boutons.')
                .setTimestamp();
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        let result;
        let actionText = '';
        let emoji = '';

        switch (customId) {
            case 'rgb_add_role':
                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('➕ Ajouter un rôle RGB')
                    .setDescription('Pour ajouter un rôle RGB, utilisez la commande :\n`!rgb start @role` ou `/rgb start role:@role`')
                    .setTimestamp();
                return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

            case 'rgb_stop_all':
                result = await rgbManager.stopAllRGB();
                actionText = 'Tous les rôles RGB ont été arrêtés';
                emoji = '⏹️';
                break;

            case 'rgb_pause_all':
                result = await rgbManager.pauseAllRGB();
                actionText = 'Tous les rôles RGB ont été suspendus';
                emoji = '⏸️';
                break;

            case 'rgb_resume_all':
                result = await rgbManager.resumeAllRGB(interaction.guild);
                actionText = 'Tous les rôles RGB ont été repris';
                emoji = '▶️';
                break;

            case 'rgb_refresh_panel':
                await handleRefreshPanel(interaction);
                return;

            default:
                throw new Error(`Action globale inconnue: ${customId}`);
        }

        if (result && result.success) {
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle(`${emoji} Action Réussie`)
                .setDescription(actionText)
                .setTimestamp();
            
            logger.info(`${emoji} [ACTION] ${actionText} par ${interaction.user.tag}`);
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            
            // Rafraîchir le panel après l'action
            setTimeout(async () => {
                try {
                    await handleRefreshPanel(interaction);
                } catch (error) {
                    logger.error('Erreur lors du rafraîchissement automatique:', error);
                }
            }, 1000);
        } else {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur')
                .setDescription(result?.message || 'Erreur lors de l\'exécution de l\'action.')
                .setTimestamp();
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

    } catch (error) {
        logger.error('Erreur dans handleGlobalRGBAction:', error);
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Erreur')
            .setDescription('Erreur lors de l\'exécution de l\'action globale.')
            .setTimestamp();
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
}

async function handleRoleManagement(interaction, roleId) {
    try {
        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur')
                .setDescription('Rôle introuvable.')
                .setTimestamp();
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const config = await rgbManager.loadConfig();
        const roleConfig = config.find(r => r.roleId === roleId);

        if (!roleConfig) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur')
                .setDescription('Configuration du rôle introuvable.')
                .setTimestamp();
            return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        // Créer l'embed de gestion
        const statusEmoji = roleConfig.status === 'active' ? '🟢' : 
                          roleConfig.status === 'paused' ? '🟡' : '🔴';

        const embed = new EmbedBuilder()
            .setColor(roleConfig.currentColor)
            .setTitle(`🎨 Gestion RGB - ${role.name}`)
            .setDescription(`Gérez le mode RGB pour ce rôle`)
            .addFields(
                { name: 'Statut', value: `${statusEmoji} ${roleConfig.status}`, inline: true },
                { name: 'Intervalle', value: `${roleConfig.interval}ms`, inline: true },
                { name: 'Couleur actuelle', value: `#${roleConfig.currentColor.toString(16).padStart(6, '0')}`, inline: true }
            )
            .setTimestamp();

        // Créer les boutons d'action
        const row1 = new ActionRowBuilder();
        const row2 = new ActionRowBuilder();
        const row3 = new ActionRowBuilder();

        // Première ligne : Actions principales
        if (roleConfig.status === 'active') {
            row1.addComponents(
                new ButtonBuilder()
                    .setCustomId(`rgb_action_pause_${roleId}`)
                    .setLabel('Pause')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⏸️')
            );
        } else if (roleConfig.status === 'paused') {
            row1.addComponents(
                new ButtonBuilder()
                    .setCustomId(`rgb_action_resume_${roleId}`)
                    .setLabel('Reprendre')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('▶️')
            );
        } else {
            row1.addComponents(
                new ButtonBuilder()
                    .setCustomId(`rgb_action_start_${roleId}`)
                    .setLabel('Démarrer')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('▶️')
            );
        }

        row1.addComponents(
            new ButtonBuilder()
                .setCustomId(`rgb_action_stop_${roleId}`)
                .setLabel('Arrêter')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('⏹️'),
            new ButtonBuilder()
                .setCustomId(`rgb_action_restart_${roleId}`)
                .setLabel('Redémarrer')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔄'),
            new ButtonBuilder()
                .setCustomId(`rgb_action_delete_${roleId}`)
                .setLabel('Supprimer')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗑️')
        );

        // Deuxième ligne : Paramètres
        row2.addComponents(
            new ButtonBuilder()
                .setCustomId(`rgb_action_speed_slow_${roleId}`)
                .setLabel('Ralentir')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🐌'),
            new ButtonBuilder()
                .setCustomId(`rgb_action_speed_fast_${roleId}`)
                .setLabel('Accélérer')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⚡'),
            new ButtonBuilder()
                .setCustomId(`rgb_action_color_random_${roleId}`)
                .setLabel('Couleur Aléatoire')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🎲'),
            new ButtonBuilder()
                .setCustomId(`rgb_action_info_${roleId}`)
                .setLabel('Informations')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('ℹ️')
        );

        // Troisième ligne : Navigation
        row3.addComponents(
            new ButtonBuilder()
                .setCustomId(`rgb_action_back_${roleId}`)
                .setLabel('Retour au Panel')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔙')
        );

        await interaction.reply({ embeds: [embed], components: [row1, row2, row3], flags: MessageFlags.Ephemeral });

    } catch (error) {
        logger.error('Erreur lors de la gestion du rôle:', error);
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Erreur')
            .setDescription('Erreur lors de la gestion du rôle.')
            .setTimestamp();
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
}

async function handleRoleAction(interaction, action, roleId) {
    try {
        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur')
                .setDescription('Rôle introuvable.')
                .setTimestamp();
            return interaction.update({ embeds: [embed], components: [] });
        }

        let result;
        let actionText = '';
        let emoji = '';

        switch (action) {
            case 'pause':
                result = await rgbManager.pauseRGB(roleId);
                actionText = 'mis en pause';
                emoji = '⏸️';
                break;
            case 'resume':
                result = await rgbManager.resumeRGB(interaction.guild, roleId);
                actionText = 'repris';
                emoji = '▶️';
                break;
            case 'start':
                result = await rgbManager.startRGB(interaction.guild, roleId);
                actionText = 'démarré';
                emoji = '▶️';
                break;
            case 'stop':
                result = await rgbManager.stopRGB(roleId);
                actionText = 'arrêté';
                emoji = '⏹️';
                break;
            case 'restart':
                await rgbManager.stopRGB(roleId);
                result = await rgbManager.startRGB(interaction.guild, roleId);
                actionText = 'redémarré';
                emoji = '🔄';
                break;
            case 'delete':
                result = await rgbManager.removeRole(roleId);
                actionText = 'supprimé';
                emoji = '🗑️';
                break;
            case 'speed_slow':
                result = await rgbManager.changeSpeed(roleId, 'slow');
                actionText = 'ralenti';
                emoji = '🐌';
                break;
            case 'speed_fast':
                result = await rgbManager.changeSpeed(roleId, 'fast');
                actionText = 'accéléré';
                emoji = '⚡';
                break;
            case 'color_random':
                result = await rgbManager.randomizeColor(roleId);
                actionText = 'couleur randomisée';
                emoji = '🎲';
                break;
            case 'info':
                await handleRoleInfo(interaction, roleId);
                return;
            case 'back':
                // Retour au panel principal
                await handleRefreshPanel(interaction);
                return;
            default:
                throw new Error(`Action inconnue: ${action}`);
        }

        if (result.success) {
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle(`${emoji} Action Réussie`)
                .setDescription(`Le mode RGB a été ${actionText} pour le rôle ${role}`)
                .setTimestamp();
            
            logger.info(`${emoji} [ACTION] RGB ${actionText} pour ${role.name} par ${interaction.user.tag}`);
            await interaction.update({ embeds: [embed], components: [] });
        } else {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Erreur')
                .setDescription(result.message)
                .setTimestamp();
            await interaction.update({ embeds: [embed], components: [] });
        }

    } catch (error) {
        logger.error('Erreur lors de l\'action sur le rôle:', error);
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Erreur')
            .setDescription('Erreur lors de l\'exécution de l\'action.')
            .setTimestamp();
        await interaction.update({ embeds: [embed], components: [] });
    }
}