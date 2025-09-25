import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits
} from 'discord.js';
import reactionRoleStore from '../store/reactionRoleStore.js';
import reactionRoleLogger from '../utils/reactionRoleLogger.js';

/**
 * Gestionnaire d'interactions pour le système ReactionRole
 */
export default {
    /**
     * Vérifie si l'interaction concerne le système ReactionRole
     */
    isReactionRoleInteraction(interaction) {
        return interaction.customId?.startsWith('rr_');
    },

    /**
     * Gère les interactions ReactionRole
     */
    async handleInteraction(interaction) {
        // Vérifier les permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ Vous devez être administrateur pour utiliser cette fonctionnalité.',
                flags: 64
            });
        }

        const customId = interaction.customId;

        try {
            if (customId.startsWith('rr_confirm_')) {
                await this.handleConfirmation(interaction);
            } else if (customId.startsWith('rr_cancel_')) {
                await this.handleCancellation(interaction);
            } else if (customId === 'rr_add_reaction') {
                await this.handleAddReaction(interaction);
            } else if (customId === 'rr_remove_reaction') {
                await this.handleRemoveReaction(interaction);
            } else if (customId === 'rr_list_reactions') {
                await this.handleListReactions(interaction);
            } else if (customId === 'rr_toggle_system') {
                await this.handleToggleSystem(interaction);
            } else if (customId === 'rr_config_logs') {
                await this.handleConfigLogs(interaction);
            } else if (customId === 'rr_toggle_logs') {
                await this.handleToggleLogs(interaction);
            } else if (customId === 'rr_reset_config') {
                await this.handleResetConfig(interaction);
            } else if (customId === 'rr_manage_existing') {
                await this.handleManageExisting(interaction);
            }
        } catch (error) {
            // console.error('Erreur dans reactionRoleInteractions:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Une erreur s\'est produite lors du traitement de l\'interaction.',
                    flags: 64
                });
            }
            
            await reactionRoleLogger.logError(interaction.guild, interaction.user, error, `Interaction: ${customId}`);
        }
    },

    /**
     * Gère les confirmations
     */
    async handleConfirmation(interaction) {
        const customId = interaction.customId;

        if (customId === 'rr_confirm_reset') {
            await reactionRoleStore.resetGuildConfig(interaction.guild.id);
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Configuration Réinitialisée')
                .setDescription('Toute la configuration ReactionRole a été supprimée.')
                .setTimestamp();

            await interaction.update({ embeds: [embed], components: [] });
            await reactionRoleLogger.logConfigReset(interaction.guild, interaction.user);
        } else if (customId.startsWith('rr_confirm_import:')) {
            const configData = customId.split(':')[1];
            const jsonText = Buffer.from(configData, 'base64').toString('utf8');
            const config = JSON.parse(jsonText);

            await reactionRoleStore.importGuildConfig(interaction.guild.id, config);
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Configuration Importée')
                .setDescription('La configuration a été importée avec succès !')
                .addFields(
                    { name: '📊 Importé', value: `**Messages:** ${config.messages?.length || 0}\n**Réactions:** ${config.messages?.reduce((acc, msg) => acc + (msg.entries?.length || 0), 0) || 0}`, inline: true }
                )
                .setTimestamp();

            await interaction.update({ embeds: [embed], components: [] });
            await reactionRoleLogger.logConfigImported(interaction.guild, interaction.user);
        }
    },

    /**
     * Gère les annulations
     */
    async handleCancellation(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x999999)
            .setTitle('❌ Action Annulée')
            .setDescription('L\'action a été annulée.')
            .setTimestamp();

        await interaction.update({ embeds: [embed], components: [] });
    },

    /**
     * Gère l'ajout de réaction via modal
     */
    async handleAddReaction(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('rr_add_modal')
            .setTitle('Ajouter un ReactionRole');

        const messageIdInput = new TextInputBuilder()
            .setCustomId('message_id')
            .setLabel('ID du Message')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('123456789012345678');

        const emojiInput = new TextInputBuilder()
            .setCustomId('emoji')
            .setLabel('Emoji')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('😀 ou :custom_emoji:');

        const roleIdInput = new TextInputBuilder()
            .setCustomId('role_id')
            .setLabel('ID du Rôle')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('123456789012345678');

        const optionsInput = new TextInputBuilder()
            .setCustomId('options')
            .setLabel('Options (optionnel)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setPlaceholder('exclusive=true,removeOnUnreact=false');

        const firstActionRow = new ActionRowBuilder().addComponents(messageIdInput);
        const secondActionRow = new ActionRowBuilder().addComponents(emojiInput);
        const thirdActionRow = new ActionRowBuilder().addComponents(roleIdInput);
        const fourthActionRow = new ActionRowBuilder().addComponents(optionsInput);

        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow);

        await interaction.showModal(modal);
    },

    /**
     * Gère la suppression de réaction via modal
     */
    async handleRemoveReaction(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('rr_remove_modal')
            .setTitle('Supprimer un ReactionRole');

        const messageIdInput = new TextInputBuilder()
            .setCustomId('message_id')
            .setLabel('ID du Message')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('123456789012345678');

        const emojiInput = new TextInputBuilder()
            .setCustomId('emoji')
            .setLabel('Emoji')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('😀 ou :custom_emoji:');

        const firstActionRow = new ActionRowBuilder().addComponents(messageIdInput);
        const secondActionRow = new ActionRowBuilder().addComponents(emojiInput);

        modal.addComponents(firstActionRow, secondActionRow);

        await interaction.showModal(modal);
    },

    /**
     * Affiche la liste des réactions
     */
    async handleListReactions(interaction) {
        const reactionRoles = await reactionRoleStore.getAllReactionRoles(interaction.guild.id);

        if (reactionRoles.length === 0) {
            return interaction.reply({
                content: '📋 Aucune configuration ReactionRole trouvée.',
                flags: 64
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📋 Liste des ReactionRoles')
            .setDescription(`${reactionRoles.length} configuration(s) trouvée(s)`)
            .setTimestamp();

        let description = '';
        for (const rr of reactionRoles.slice(0, 10)) {
            const status = rr.globalEnabled && rr.messageEnabled && rr.reactionEnabled ? '✅' : '❌';
            const role = interaction.guild.roles.cache.get(rr.roleId);
            const roleName = role ? role.name : 'Rôle supprimé';
            const channel = interaction.guild.channels.cache.get(rr.channelId);
            const channelName = channel ? channel.name : 'Canal supprimé';
            
            const exclusiveIcon = rr.exclusive ? '🔒' : '';
            const removeOnUnreactIcon = rr.removeOnUnreact ? '🔄' : '';
            
            description += `${status} **${rr.emoji}** → **${roleName}** ${exclusiveIcon}${removeOnUnreactIcon}\n`;
            description += `   📝 Message: \`${rr.messageId}\` | 📍 #${channelName}\n\n`;
        }

        if (reactionRoles.length > 10) {
            description += `... et ${reactionRoles.length - 10} autre(s)`;
        }

        embed.setDescription(description);

        await interaction.reply({ embeds: [embed], flags: 64 });
    },

    /**
     * Active/désactive le système
     */
    async handleToggleSystem(interaction) {
        const enabled = await reactionRoleStore.toggleGuildEnabled(interaction.guild.id);

        const embed = new EmbedBuilder()
            .setColor(enabled ? 0x00FF00 : 0xFF0000)
            .setTitle(`⚙️ Système ${enabled ? 'Activé' : 'Désactivé'}`)
            .setDescription(`Le système ReactionRole a été ${enabled ? 'activé' : 'désactivé'} pour ce serveur.`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: 64 });
        await reactionRoleLogger.logSystemToggled(interaction.guild, interaction.user, enabled);
    },

    /**
     * Configure les logs via modal
     */
    async handleConfigLogs(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('rr_logs_modal')
            .setTitle('Configurer les Logs');

        const channelIdInput = new TextInputBuilder()
            .setCustomId('channel_id')
            .setLabel('ID du Canal de Logs')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setPlaceholder('123456789012345678 (laisser vide pour désactiver)');

        const firstActionRow = new ActionRowBuilder().addComponents(channelIdInput);
        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);
    },

    /**
     * Active/désactive les logs
     */
    async handleToggleLogs(interaction) {
        const enabled = await reactionRoleStore.toggleLogs(interaction.guild.id);

        const embed = new EmbedBuilder()
            .setColor(enabled ? 0x00FF00 : 0xFF0000)
            .setTitle(`📝 Logs ${enabled ? 'Activés' : 'Désactivés'}`)
            .setDescription(`Les logs ReactionRole ont été ${enabled ? 'activés' : 'désactivés'}.`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: 64 });
        await reactionRoleLogger.logLogsToggled(interaction.guild, interaction.user, enabled);
    },

    /**
     * Demande confirmation pour reset
     */
    async handleResetConfig(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0xFF6600)
            .setTitle('⚠️ Confirmation de Reset')
            .setDescription('Êtes-vous sûr de vouloir supprimer **TOUTE** la configuration ReactionRole ?\n\n**Cette action est irréversible !**')
            .setTimestamp();

        const confirmButton = new ButtonBuilder()
            .setCustomId('rr_confirm_reset')
            .setLabel('✅ Confirmer')
            .setStyle(ButtonStyle.Danger);

        const cancelButton = new ButtonBuilder()
            .setCustomId('rr_cancel_reset')
            .setLabel('❌ Annuler')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        await interaction.reply({
            embeds: [embed],
            components: [row],
            flags: 64
        });
    },

    /**
     * Gère la sélection d'une réaction existante
     */
    async handleManageExisting(interaction) {
        const selectedValue = interaction.values[0];
        const [messageId, emoji] = selectedValue.split(':');

        const reactionRole = await reactionRoleStore.getReactionRole(interaction.guild.id, messageId, emoji);
        
        if (!reactionRole) {
            return interaction.reply({
                content: '❌ Configuration introuvable.',
                flags: 64
            });
        }

        const role = interaction.guild.roles.cache.get(reactionRole.roleId);
        const channel = interaction.guild.channels.cache.get(reactionRole.channelId);

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('🔧 Gestion de ReactionRole')
            .setDescription('Gérez cette configuration ReactionRole')
            .addFields(
                { name: '😀 Emoji', value: emoji, inline: true },
                { name: '🎭 Rôle', value: role ? role.toString() : 'Rôle supprimé', inline: true },
                { name: '📍 Canal', value: channel ? channel.toString() : 'Canal supprimé', inline: true },
                { name: '⚙️ Mode Exclusif', value: reactionRole.exclusive ? '✅ Activé' : '❌ Désactivé', inline: true },
                { name: '🔄 Retrait Auto', value: reactionRole.removeOnUnreact ? '✅ Activé' : '❌ Désactivé', inline: true },
                { name: '📝 Message ID', value: messageId, inline: true }
            )
            .setTimestamp();

        const toggleButton = new ButtonBuilder()
            .setCustomId(`rr_toggle_reaction:${messageId}:${emoji}`)
            .setLabel(reactionRole.reactionEnabled ? '🚫 Désactiver' : '✅ Activer')
            .setStyle(reactionRole.reactionEnabled ? ButtonStyle.Danger : ButtonStyle.Success);

        const deleteButton = new ButtonBuilder()
            .setCustomId(`rr_delete_reaction:${messageId}:${emoji}`)
            .setLabel('🗑️ Supprimer')
            .setStyle(ButtonStyle.Danger);

        const editButton = new ButtonBuilder()
            .setCustomId(`rr_edit_reaction:${messageId}:${emoji}`)
            .setLabel('✏️ Modifier')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(toggleButton, editButton, deleteButton);

        await interaction.reply({
            embeds: [embed],
            components: [row],
            flags: 64
        });
    }
};