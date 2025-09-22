import { EmbedBuilder } from 'discord.js';
import reactionRoleStore from '../store/reactionRoleStore.js';
import reactionRoleLogger from '../utils/reactionRoleLogger.js';

/**
 * Gestionnaire de modals pour le système ReactionRole
 */
export default {
    /**
     * Vérifie si le modal concerne le système ReactionRole
     */
    isReactionRoleModal(interaction) {
        return interaction.customId?.startsWith('rr_') && interaction.customId?.endsWith('_modal');
    },

    /**
     * Gère les soumissions de modals ReactionRole
     */
    async handleModal(interaction) {
        if (!this.isReactionRoleModal(interaction)) return false;

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

            switch (customId) {
                case 'rr_add_modal':
                    await this.handleAddModal(interaction);
                    break;
                case 'rr_remove_modal':
                    await this.handleRemoveModal(interaction);
                    break;
                case 'rr_logs_modal':
                    await this.handleLogsModal(interaction);
                    break;
                case 'rr_create_select_modal':
                    await this.handleCreateSelectModal(interaction);
                    break;
                case 'rr_create_buttons_modal':
                    await this.handleCreateButtonsModal(interaction);
                    break;
                default:
                    if (customId.startsWith('rr_edit_modal:')) {
                        await this.handleEditModal(interaction);
                    } else {
                        await interaction.reply({
                            content: '❌ Modal non reconnu.',
                            ephemeral: true
                        });
                    }
            }

            return true;
        } catch (error) {
            console.error('Erreur dans handleModal:', error);
            
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
    },

    /**
     * Gère le modal d'ajout de réaction
     */
    async handleAddModal(interaction) {
        const messageId = interaction.fields.getTextInputValue('message_id');
        const emoji = interaction.fields.getTextInputValue('emoji');
        const roleId = interaction.fields.getTextInputValue('role_id');
        const optionsText = interaction.fields.getTextInputValue('options') || '';

        // Parser les options
        const options = this.parseOptions(optionsText);
        const exclusive = options.exclusive ?? false;
        const removeOnUnreact = options.removeOnUnreact ?? true;

        // Vérifier que le rôle existe
        const role = interaction.guild.roles.cache.get(roleId);
        if (!role) {
            return interaction.reply({
                content: '❌ Rôle introuvable avec cet ID.',
                flags: 64
            });
        }

        // Vérifier que le message existe
        let message;
        try {
            // Chercher dans tous les canaux textuels
            const channels = interaction.guild.channels.cache.filter(c => c.isTextBased());
            for (const channel of channels.values()) {
                try {
                    message = await channel.messages.fetch(messageId);
                    break;
                } catch (error) {
                    // Continue à chercher dans les autres canaux
                }
            }
            
            if (!message) {
                throw new Error('Message non trouvé');
            }
        } catch (error) {
            return interaction.reply({
                content: '❌ Message introuvable dans ce serveur.',
                flags: 64
            });
        }

        // Ajouter la réaction role
        await reactionRoleStore.addReactionRole(
            interaction.guild.id,
            messageId,
            message.channel.id,
            emoji,
            roleId,
            exclusive,
            removeOnUnreact
        );

        // Ajouter la réaction au message
        try {
            await message.react(emoji);
        } catch (error) {
            console.warn('Impossible d\'ajouter la réaction au message:', error);
        }

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ ReactionRole Ajouté')
            .setDescription('La configuration a été ajoutée avec succès !')
            .addFields(
                { name: '📝 Message', value: `[Aller au message](${message.url})`, inline: true },
                { name: '😀 Emoji', value: emoji, inline: true },
                { name: '🎭 Rôle', value: `${role}`, inline: true },
                { name: '⚙️ Mode Exclusif', value: exclusive ? '✅ Activé' : '❌ Désactivé', inline: true },
                { name: '🔄 Retrait Auto', value: removeOnUnreact ? '✅ Activé' : '❌ Désactivé', inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: 64 });
        await reactionRoleLogger.logReactionAdded(interaction.guild, interaction.user, role, message, emoji);
    },

    /**
     * Gère le modal de suppression de réaction
     */
    async handleRemoveModal(interaction) {
        const messageId = interaction.fields.getTextInputValue('message_id');
        const emoji = interaction.fields.getTextInputValue('emoji');

        const success = await reactionRoleStore.removeReactionRole(interaction.guild.id, messageId, emoji);

        if (!success) {
            return interaction.reply({
                content: '❌ Aucune configuration trouvée pour ce message et cet emoji.',
                flags: 64
            });
        }

        // Supprimer la réaction du message si possible
        try {
            const channels = interaction.guild.channels.cache.filter(c => c.isTextBased());
            for (const channel of channels.values()) {
                try {
                    const message = await channel.messages.fetch(messageId);
                    const reaction = message.reactions.cache.find(r => r.emoji.name === emoji || r.emoji.toString() === emoji);
                    if (reaction) {
                        await reaction.users.remove(interaction.client.user);
                    }
                    break;
                } catch (error) {
                    // Continue à chercher dans les autres canaux
                }
            }
        } catch (error) {
            console.warn('Impossible de supprimer la réaction du message:', error);
        }

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('✅ ReactionRole Supprimé')
            .setDescription('La configuration a été supprimée avec succès !')
            .addFields(
                { name: '📝 Message ID', value: messageId, inline: true },
                { name: '😀 Emoji', value: emoji, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: 64 });
        
        // Log de l'action
        try {
            const channels = interaction.guild.channels.cache.filter(c => c.isTextBased());
            for (const channel of channels.values()) {
                try {
                    const message = await channel.messages.fetch(messageId);
                    await reactionRoleLogger.logReactionRemoved(interaction.guild, interaction.user, null, message, emoji);
                    break;
                } catch (error) {
                    // Continue à chercher dans les autres canaux
                }
            }
        } catch (error) {
            console.error('Erreur lors du logging:', error);
        }
    },

    /**
     * Gère le modal de configuration des logs
     */
    async handleLogsModal(interaction) {
        const channelId = interaction.fields.getTextInputValue('channel_id').trim();

        let channel = null;
        if (channelId) {
            channel = interaction.guild.channels.cache.get(channelId);
            if (!channel || !channel.isTextBased()) {
                return interaction.reply({
                    content: '❌ Canal introuvable ou non textuel.',
                    flags: 64
                });
            }
        }

        await reactionRoleStore.setLogsChannel(interaction.guild.id, channel?.id || null);

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📍 Canal de Logs Configuré')
            .setDescription(channel ? `Les logs seront envoyés dans ${channel}` : 'Les logs ont été désactivés')
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: 64 });
        await reactionRoleLogger.logLogsConfigured(interaction.guild, interaction.user, channel);
    },

    /**
     * Gère le modal d'édition de réaction
     */
    async handleEditModal(interaction) {
        const [, messageId, emoji] = interaction.customId.split(':');
        
        const newRoleId = interaction.fields.getTextInputValue('role_id');
        const optionsText = interaction.fields.getTextInputValue('options') || '';

        // Parser les options
        const options = this.parseOptions(optionsText);

        // Vérifier que le rôle existe
        const role = interaction.guild.roles.cache.get(newRoleId);
        if (!role) {
            return interaction.reply({
                content: '❌ Rôle introuvable avec cet ID.',
                flags: 64
            });
        }

        // Mettre à jour la configuration
        const success = await reactionRoleStore.updateReactionRole(
            interaction.guild.id,
            messageId,
            emoji,
            {
                roleId: newRoleId,
                exclusive: options.exclusive,
                removeOnUnreact: options.removeOnUnreact
            }
        );

        if (!success) {
            return interaction.reply({
                content: '❌ Configuration introuvable.',
                flags: 64
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ ReactionRole Modifié')
            .setDescription('La configuration a été mise à jour avec succès !')
            .addFields(
                { name: '📝 Message ID', value: messageId, inline: true },
                { name: '😀 Emoji', value: emoji, inline: true },
                { name: '🎭 Nouveau Rôle', value: `${role}`, inline: true },
                { name: '⚙️ Mode Exclusif', value: options.exclusive ? '✅ Activé' : '❌ Désactivé', inline: true },
                { name: '🔄 Retrait Auto', value: options.removeOnUnreact ? '✅ Activé' : '❌ Désactivé', inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: 64 });
        await reactionRoleLogger.logReactionUpdated(interaction.guild, interaction.user, role, messageId, emoji);
    },

    /**
     * Parse les options depuis une chaîne de texte
     */
    parseOptions(optionsText) {
        const options = {};
        
        if (!optionsText) return options;

        const pairs = optionsText.split(',');
        for (const pair of pairs) {
            const [key, value] = pair.split('=').map(s => s.trim());
            if (key && value !== undefined) {
                if (value.toLowerCase() === 'true') {
                    options[key] = true;
                } else if (value.toLowerCase() === 'false') {
                    options[key] = false;
                } else {
                    options[key] = value;
                }
            }
        }

        return options;
    },

    /**
     * Gère le modal de création de Select Menu
     */
    async handleCreateSelectModal(interaction) {
        const title = interaction.fields.getTextInputValue('select_title');
        const rolesInput = interaction.fields.getTextInputValue('select_roles');
        const maxValues = parseInt(interaction.fields.getTextInputValue('select_max_values') || '1');

        try {
            const roleIds = rolesInput.split(',').map(id => id.trim()).filter(id => id);
            
            if (roleIds.length === 0) {
                return await interaction.reply({
                    content: '❌ Aucun rôle valide fourni.',
                    ephemeral: true
                });
            }

            if (roleIds.length > 25) {
                return await interaction.reply({
                    content: '❌ Maximum 25 rôles autorisés dans un Select Menu.',
                    ephemeral: true
                });
            }

            // Vérifier que les rôles existent
            const validRoles = [];
            const invalidRoles = [];

            for (const roleId of roleIds) {
                const role = interaction.guild.roles.cache.get(roleId);
                if (role) {
                    validRoles.push(role);
                } else {
                    invalidRoles.push(roleId);
                }
            }

            if (validRoles.length === 0) {
                return await interaction.reply({
                    content: '❌ Aucun rôle valide trouvé.',
                    ephemeral: true
                });
            }

            // Créer le Select Menu
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('rr_select_role_assign')
                .setPlaceholder(title)
                .setMinValues(1)
                .setMaxValues(Math.min(maxValues, validRoles.length))
                .addOptions(
                    validRoles.map(role => ({
                        label: role.name,
                        value: role.id,
                        description: `Position: ${role.position}`,
                        emoji: '🎭'
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setTitle('🎭 ' + title)
                .setDescription('Utilisez le menu déroulant ci-dessous pour sélectionner vos rôles.')
                .setColor(0x0099ff)
                .setTimestamp();

            if (invalidRoles.length > 0) {
                embed.addFields({
                    name: '⚠️ Rôles ignorés (introuvables)',
                    value: invalidRoles.join(', '),
                    inline: false
                });
            }

            await interaction.reply({ embeds: [embed], components: [row] });

            // Log l'action
            await reactionRoleLogger.logAction(interaction.guild.id, 'create_select', {
                userId: interaction.user.id,
                title,
                rolesCount: validRoles.length,
                maxValues
            });

        } catch (error) {
            console.error('Erreur lors de la création du Select Menu:', error);
            await interaction.reply({
                content: '❌ Erreur lors de la création du Select Menu.',
                ephemeral: true
            });
        }
    },

    /**
     * Gère le modal de création de Buttons
     */
    async handleCreateButtonsModal(interaction) {
        const title = interaction.fields.getTextInputValue('buttons_title');
        const buttonsConfigInput = interaction.fields.getTextInputValue('buttons_config');

        try {
            const buttonsConfig = JSON.parse(buttonsConfigInput);
            
            if (!Array.isArray(buttonsConfig)) {
                return await interaction.reply({
                    content: '❌ La configuration des boutons doit être un tableau JSON.',
                    ephemeral: true
                });
            }

            if (buttonsConfig.length === 0 || buttonsConfig.length > 25) {
                return await interaction.reply({
                    content: '❌ Vous devez fournir entre 1 et 25 boutons.',
                    ephemeral: true
                });
            }

            // Créer les boutons
            const buttons = [];
            const validRoles = [];
            const errors = [];

            for (const buttonConfig of buttonsConfig) {
                try {
                    const { label, roleId, style = 'Primary', emoji } = buttonConfig;
                    
                    if (!label || !roleId) {
                        errors.push('Bouton ignoré: label et roleId requis');
                        continue;
                    }

                    const role = interaction.guild.roles.cache.get(roleId);
                    if (!role) {
                        errors.push(`Rôle ${roleId} introuvable`);
                        continue;
                    }

                    const buttonStyle = ButtonStyle[style] || ButtonStyle.Primary;
                    
                    const button = new ButtonBuilder()
                        .setCustomId(`rr_role_toggle_${roleId}`)
                        .setLabel(label)
                        .setStyle(buttonStyle);

                    if (emoji) {
                        button.setEmoji(emoji);
                    }

                    buttons.push(button);
                    validRoles.push(role);

                } catch (error) {
                    errors.push(`Erreur bouton: ${error.message}`);
                }
            }

            if (buttons.length === 0) {
                return await interaction.reply({
                    content: '❌ Aucun bouton valide créé.',
                    ephemeral: true
                });
            }

            // Organiser les boutons en lignes (max 5 par ligne)
            const rows = [];
            for (let i = 0; i < buttons.length; i += 5) {
                const row = new ActionRowBuilder()
                    .addComponents(buttons.slice(i, i + 5));
                rows.push(row);
            }

            const embed = new EmbedBuilder()
                .setTitle('🔘 ' + title)
                .setDescription('Cliquez sur les boutons ci-dessous pour obtenir ou retirer les rôles correspondants.')
                .setColor(0x0099ff)
                .addFields({
                    name: '🎭 Rôles disponibles',
                    value: validRoles.map(role => role.toString()).join('\n'),
                    inline: false
                })
                .setTimestamp();

            if (errors.length > 0) {
                embed.addFields({
                    name: '⚠️ Erreurs',
                    value: errors.slice(0, 10).join('\n'),
                    inline: false
                });
            }

            await interaction.reply({ embeds: [embed], components: rows });

            // Log l'action
            await reactionRoleLogger.logAction(interaction.guild.id, 'create_buttons', {
                userId: interaction.user.id,
                title,
                buttonsCount: buttons.length,
                rolesCount: validRoles.length,
                errors: errors.length
            });

        } catch (error) {
            console.error('Erreur lors de la création des boutons:', error);
            await interaction.reply({
                content: '❌ Erreur lors de la création des boutons: JSON invalide.',
                ephemeral: true
            });
        }
    }
};