import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import reactionRoleStore from '../store/reactionRoleStore.js';
import reactionRoleLogger from '../utils/reactionRoleLogger.js';

/**
 * Gestionnaire pour les Select Menus et Buttons du système ReactionRole
 */
class ReactionRoleSelectButtons {
    /**
     * Vérifie si l'interaction concerne les Select Menus/Buttons ReactionRole
     */
    isReactionRoleSelectButton(interaction) {
        if (!interaction.customId) return false;
        
        return interaction.customId.startsWith('rr_select_') || 
               interaction.customId.startsWith('rr_button_') ||
               interaction.customId.startsWith('rr_menu_');
    }

    /**
     * Gère les interactions Select Menu et Button
     */
    async handleInteraction(interaction) {
        if (!this.isReactionRoleSelectButton(interaction)) return false;

        try {
            // Vérifier les permissions
            if (!interaction.member.permissions.has('Administrator')) {
                await interaction.reply({
                    content: '❌ Vous devez être administrateur pour utiliser cette fonctionnalité.',
                    ephemeral: true
                });
                return true;
            }

            const customId = interaction.customId;

            if (customId.startsWith('rr_select_')) {
                await this.handleSelectMenu(interaction);
            } else if (customId.startsWith('rr_button_') || customId.startsWith('rr_menu_')) {
                await this.handleButton(interaction);
            }

            return true;
        } catch (error) {
            console.error('Erreur dans handleInteraction:', error);
            
            const errorMessage = {
                content: '❌ Une erreur est survenue lors du traitement de votre demande.',
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
            
            return true;
        }
    }

    /**
     * Gère les Select Menus
     */
    async handleSelectMenu(interaction) {
        const customId = interaction.customId;
        const values = interaction.values;

        switch (customId) {
            case 'rr_select_role_assign':
                await this.handleRoleAssignSelect(interaction, values);
                break;
            case 'rr_select_role_remove':
                await this.handleRoleRemoveSelect(interaction, values);
                break;
            case 'rr_select_message_manage':
                await this.handleMessageManageSelect(interaction, values);
                break;
            default:
                await interaction.reply({
                    content: '❌ Action de menu non reconnue.',
                    ephemeral: true
                });
        }
    }

    /**
     * Gère les Buttons
     */
    async handleButton(interaction) {
        const customId = interaction.customId;

        // Gestion des boutons de toggle de rôles individuels
        if (customId.startsWith('rr_role_toggle_')) {
            await this.handleRoleToggleButton(interaction);
            return;
        }

        // Gestion des boutons de gestion en masse
        if (customId.startsWith('rr_bulk_')) {
            await this.handleBulkActionButton(interaction);
            return;
        }

        switch (customId) {
            case 'rr_button_create_select':
                await this.handleCreateSelectButton(interaction);
                break;
            case 'rr_button_create_buttons':
                await this.handleCreateButtonsButton(interaction);
                break;
            case 'rr_menu_role_assign':
                await this.handleRoleAssignMenu(interaction);
                break;
            case 'rr_menu_role_remove':
                await this.handleRoleRemoveMenu(interaction);
                break;
            case 'rr_menu_message_manage':
                await this.handleMessageManageMenu(interaction);
                break;
            default:
                await interaction.reply({
                    content: '❌ Action de bouton non reconnue.',
                    ephemeral: true
                });
        }
    }

    /**
     * Gère la sélection de rôles à assigner
     */
    async handleRoleAssignSelect(interaction, values) {
        const roleIds = values;
        const member = interaction.member;

        try {
            const rolesToAdd = [];
            const errors = [];

            for (const roleId of roleIds) {
                const role = interaction.guild.roles.cache.get(roleId);
                if (!role) {
                    errors.push(`Rôle ${roleId} introuvable`);
                    continue;
                }

                if (member.roles.cache.has(roleId)) {
                    errors.push(`Vous avez déjà le rôle ${role.name}`);
                    continue;
                }

                rolesToAdd.push(role);
            }

            if (rolesToAdd.length > 0) {
                await member.roles.add(rolesToAdd);
            }

            const embed = new EmbedBuilder()
                .setTitle('✅ Rôles mis à jour')
                .setColor(0x00ff00)
                .setTimestamp();

            if (rolesToAdd.length > 0) {
                embed.addFields({
                    name: '✅ Rôles ajoutés',
                    value: rolesToAdd.map(r => r.toString()).join('\n'),
                    inline: false
                });
            }

            if (errors.length > 0) {
                embed.addFields({
                    name: '⚠️ Erreurs',
                    value: errors.join('\n'),
                    inline: false
                });
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });

            // Log l'action
            await reactionRoleLogger.logAction(interaction.guild.id, 'select_assign', {
                userId: interaction.user.id,
                rolesAdded: rolesToAdd.map(r => r.id),
                errors: errors.length
            });

        } catch (error) {
            console.error('Erreur lors de l\'assignation des rôles:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue lors de l\'assignation des rôles.',
                ephemeral: true
            });
        }
    }

    /**
     * Gère la sélection de rôles à retirer
     */
    async handleRoleRemoveSelect(interaction, values) {
        const roleIds = values;
        const member = interaction.member;

        try {
            const rolesToRemove = [];
            const errors = [];

            for (const roleId of roleIds) {
                const role = interaction.guild.roles.cache.get(roleId);
                if (!role) {
                    errors.push(`Rôle ${roleId} introuvable`);
                    continue;
                }

                if (!member.roles.cache.has(roleId)) {
                    errors.push(`Vous n'avez pas le rôle ${role.name}`);
                    continue;
                }

                rolesToRemove.push(role);
            }

            if (rolesToRemove.length > 0) {
                await member.roles.remove(rolesToRemove);
            }

            const embed = new EmbedBuilder()
                .setTitle('✅ Rôles mis à jour')
                .setColor(0x00ff00)
                .setTimestamp();

            if (rolesToRemove.length > 0) {
                embed.addFields({
                    name: '🗑️ Rôles retirés',
                    value: rolesToRemove.map(r => r.toString()).join('\n'),
                    inline: false
                });
            }

            if (errors.length > 0) {
                embed.addFields({
                    name: '⚠️ Erreurs',
                    value: errors.join('\n'),
                    inline: false
                });
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });

            // Log l'action
            await reactionRoleLogger.logAction(interaction.guild.id, 'select_remove', {
                userId: interaction.user.id,
                rolesRemoved: rolesToRemove.map(r => r.id),
                errors: errors.length
            });

        } catch (error) {
            console.error('Erreur lors du retrait des rôles:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue lors du retrait des rôles.',
                ephemeral: true
            });
        }
    }

    /**
     * Gère la sélection de messages à gérer
     */
    async handleMessageManageSelect(interaction, values) {
        const messageIds = values;

        try {
            const embed = new EmbedBuilder()
                .setTitle('📨 Gestion des messages sélectionnés')
                .setDescription(`Messages sélectionnés: ${messageIds.length}`)
                .setColor(0x0099ff)
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`rr_bulk_toggle_${messageIds.join(',')}`)
                        .setLabel('Toggle Tous')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔄'),
                    new ButtonBuilder()
                        .setCustomId(`rr_bulk_reset_${messageIds.join(',')}`)
                        .setLabel('Reset Tous')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🗑️'),
                    new ButtonBuilder()
                        .setCustomId(`rr_bulk_repair_${messageIds.join(',')}`)
                        .setLabel('Réparer Tous')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔧')
                );

            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

        } catch (error) {
            console.error('Erreur lors de la gestion des messages:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue lors de la gestion des messages.',
                ephemeral: true
            });
        }
    }

    /**
     * Gère la création d'un Select Menu
     */
    async handleCreateSelectButton(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('rr_create_select_modal')
            .setTitle('Créer un Select Menu');

        const titleInput = new TextInputBuilder()
            .setCustomId('select_title')
            .setLabel('Titre du Select Menu')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Choisissez vos rôles')
            .setRequired(true);

        const rolesInput = new TextInputBuilder()
            .setCustomId('select_roles')
            .setLabel('Rôles (ID séparés par des virgules)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('123456789,987654321,456789123')
            .setRequired(true);

        const maxValuesInput = new TextInputBuilder()
            .setCustomId('select_max_values')
            .setLabel('Nombre maximum de sélections')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1')
            .setValue('1')
            .setRequired(false);

        const row1 = new ActionRowBuilder().addComponents(titleInput);
        const row2 = new ActionRowBuilder().addComponents(rolesInput);
        const row3 = new ActionRowBuilder().addComponents(maxValuesInput);

        modal.addComponents(row1, row2, row3);

        await interaction.showModal(modal);
    }

    /**
     * Gère la création de Buttons
     */
    async handleCreateButtonsButton(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('rr_create_buttons_modal')
            .setTitle('Créer des Buttons');

        const titleInput = new TextInputBuilder()
            .setCustomId('buttons_title')
            .setLabel('Titre du message')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Choisissez vos rôles')
            .setRequired(true);

        const buttonsInput = new TextInputBuilder()
            .setCustomId('buttons_config')
            .setLabel('Configuration des boutons (JSON)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('[{"label":"Rôle 1","roleId":"123456789","style":"Primary","emoji":"🎭"}]')
            .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(titleInput);
        const row2 = new ActionRowBuilder().addComponents(buttonsInput);

        modal.addComponents(row1, row2);

        await interaction.showModal(modal);
    }

    /**
     * Affiche le menu d'assignation de rôles
     */
    async handleRoleAssignMenu(interaction) {
        try {
            const roles = interaction.guild.roles.cache
                .filter(role => !role.managed && role.id !== interaction.guild.id)
                .sort((a, b) => b.position - a.position)
                .first(25);

            if (roles.length === 0) {
                return await interaction.reply({
                    content: '❌ Aucun rôle disponible pour l\'assignation.',
                    ephemeral: true
                });
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('rr_select_role_assign')
                .setPlaceholder('Sélectionnez les rôles à obtenir')
                .setMinValues(1)
                .setMaxValues(Math.min(roles.length, 10))
                .addOptions(
                    roles.map(role => ({
                        label: role.name,
                        value: role.id,
                        description: `Position: ${role.position}`,
                        emoji: '🎭'
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setTitle('🎭 Assignation de rôles')
                .setDescription('Sélectionnez les rôles que vous souhaitez obtenir.')
                .setColor(0x00ff00)
                .setTimestamp();

            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

        } catch (error) {
            console.error('Erreur lors de l\'affichage du menu d\'assignation:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue lors de l\'affichage du menu.',
                ephemeral: true
            });
        }
    }

    /**
     * Affiche le menu de retrait de rôles
     */
    async handleRoleRemoveMenu(interaction) {
        try {
            const userRoles = interaction.member.roles.cache
                .filter(role => role.id !== interaction.guild.id)
                .sort((a, b) => b.position - a.position)
                .first(25);

            if (userRoles.size === 0) {
                return await interaction.reply({
                    content: '❌ Vous n\'avez aucun rôle à retirer.',
                    ephemeral: true
                });
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('rr_select_role_remove')
                .setPlaceholder('Sélectionnez les rôles à retirer')
                .setMinValues(1)
                .setMaxValues(Math.min(userRoles.size, 10))
                .addOptions(
                    userRoles.map(role => ({
                        label: role.name,
                        value: role.id,
                        description: `Position: ${role.position}`,
                        emoji: '🗑️'
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setTitle('🗑️ Retrait de rôles')
                .setDescription('Sélectionnez les rôles que vous souhaitez retirer.')
                .setColor(0xff0000)
                .setTimestamp();

            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

        } catch (error) {
            console.error('Erreur lors de l\'affichage du menu de retrait:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue lors de l\'affichage du menu.',
                ephemeral: true
            });
        }
    }

    /**
     * Affiche le menu de gestion des messages
     */
    async handleMessageManageMenu(interaction) {
        try {
            const reactionRoles = await reactionRoleStore.getReactionRoles(interaction.guild.id);
            
            if (reactionRoles.length === 0) {
                return await interaction.reply({
                    content: '❌ Aucun message avec des rôles de réaction configuré.',
                    ephemeral: true
                });
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('rr_select_message_manage')
                .setPlaceholder('Sélectionnez les messages à gérer')
                .setMinValues(1)
                .setMaxValues(Math.min(reactionRoles.length, 10))
                .addOptions(
                    reactionRoles.slice(0, 25).map(rule => ({
                        label: `Message ${rule.messageId.slice(-8)}`,
                        value: rule.messageId,
                        description: `Canal: #${interaction.guild.channels.cache.get(rule.channelId)?.name || 'inconnu'} - ${rule.reactions.length} réactions`,
                        emoji: '📨'
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setTitle('📨 Gestion des messages')
                .setDescription('Sélectionnez les messages que vous souhaitez gérer.')
                .setColor(0x0099ff)
                .setTimestamp();

            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

        } catch (error) {
            console.error('Erreur lors de l\'affichage du menu de gestion:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue lors de l\'affichage du menu.',
                ephemeral: true
            });
        }
    }

    /**
     * Gère les boutons de toggle de rôles individuels
     */
    async handleRoleToggleButton(interaction) {
        const roleId = interaction.customId.replace('rr_role_toggle_', '');
        const member = interaction.member;

        try {
            const role = interaction.guild.roles.cache.get(roleId);
            if (!role) {
                return await interaction.reply({
                    content: '❌ Rôle introuvable.',
                    ephemeral: true
                });
            }

            const hasRole = member.roles.cache.has(roleId);
            let action, actionText, color;

            if (hasRole) {
                await member.roles.remove(role);
                action = 'remove';
                actionText = 'retiré';
                color = 0xff0000;
            } else {
                await member.roles.add(role);
                action = 'add';
                actionText = 'ajouté';
                color = 0x00ff00;
            }

            const embed = new EmbedBuilder()
                .setTitle(`✅ Rôle ${actionText}`)
                .setDescription(`Le rôle ${role.toString()} a été ${actionText}.`)
                .setColor(color)
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });

            // Log l'action
            await reactionRoleLogger.logAction(interaction.guild.id, `button_${action}`, {
                userId: interaction.user.id,
                roleId: role.id,
                roleName: role.name
            });

        } catch (error) {
            console.error('Erreur lors du toggle du rôle:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue lors de la modification du rôle.',
                ephemeral: true
            });
        }
    }

    /**
     * Gère les actions en masse sur les messages
     */
    async handleBulkActionButton(interaction) {
        const customId = interaction.customId;
        const [, action, messageIds] = customId.split('_', 3);
        const messageIdList = messageIds.split(',');

        try {
            let successCount = 0;
            let errorCount = 0;
            const errors = [];

            for (const messageId of messageIdList) {
                try {
                    switch (action) {
                        case 'toggle':
                            await reactionRoleStore.toggleReactionRole(interaction.guild.id, messageId);
                            break;
                        case 'reset':
                            await reactionRoleStore.resetReactionRoleMessage(interaction.guild.id, messageId);
                            break;
                        case 'repair':
                            await reactionRoleStore.repairReactionRole(interaction.guild.id, messageId);
                            break;
                    }
                    successCount++;
                } catch (error) {
                    errorCount++;
                    errors.push(`Message ${messageId.slice(-8)}: ${error.message}`);
                }
            }

            const embed = new EmbedBuilder()
                .setTitle(`📨 Action en masse: ${action}`)
                .setColor(successCount > 0 ? 0x00ff00 : 0xff0000)
                .addFields(
                    { name: '✅ Succès', value: successCount.toString(), inline: true },
                    { name: '❌ Erreurs', value: errorCount.toString(), inline: true },
                    { name: '📊 Total', value: messageIdList.length.toString(), inline: true }
                )
                .setTimestamp();

            if (errors.length > 0 && errors.length <= 10) {
                embed.addFields({
                    name: '⚠️ Détails des erreurs',
                    value: errors.slice(0, 10).join('\n'),
                    inline: false
                });
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });

            // Log l'action
            await reactionRoleLogger.logAction(interaction.guild.id, `bulk_${action}`, {
                userId: interaction.user.id,
                messagesCount: messageIdList.length,
                successCount,
                errorCount
            });

        } catch (error) {
            console.error('Erreur lors de l\'action en masse:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue lors de l\'action en masse.',
                ephemeral: true
            });
        }
    }
}

export default new ReactionRoleSelectButtons();