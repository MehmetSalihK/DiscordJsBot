import { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import reactionRoleStore from '../../../src/store/reactionRoleStore.js';
import reactionRoleLogger from '../../../src/utils/reactionRoleLogger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('reactionrole')
        .setDescription('Système de gestion des rôles de réaction avancé (Administrateurs uniquement)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('panel')
                .setDescription('Afficher le panel de gestion interactif'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Ajouter un rôle de réaction')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('ID du message')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('Emoji à utiliser')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Rôle à attribuer')
                        .setRequired(true))
                .addBooleanOption(option =>
                    option.setName('exclusive')
                        .setDescription('Mode exclusif (retire les autres rôles du message)')
                        .setRequired(false))
                .addBooleanOption(option =>
                    option.setName('remove_on_unreact')
                        .setDescription('Retirer le rôle quand la réaction est supprimée')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Supprimer un rôle de réaction')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('ID du message')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('Emoji à supprimer')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Lister tous les rôles de réaction'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Activer/désactiver le système ReactionRole'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Réinitialiser toute la configuration'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('setlogs')
                .setDescription('Configurer le canal de logs')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Canal pour les logs (laisser vide pour désactiver)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('togglelogs')
                .setDescription('Activer/désactiver les logs'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('export')
                .setDescription('Exporter la configuration en JSON'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('import')
                .setDescription('Importer une configuration depuis JSON')
                .addAttachmentOption(option =>
                    option.setName('file')
                        .setDescription('Fichier JSON de configuration')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('repair')
                .setDescription('Réparer automatiquement les configurations'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cleanup')
                .setDescription('Nettoyer les configurations obsolètes')),

    async execute(interaction) {
        // Vérification des permissions administrateur
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ Vous devez être administrateur pour utiliser cette commande.',
                flags: 64 // MessageFlags.Ephemeral
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'panel':
                    await handlePanel(interaction);
                    break;
                case 'add':
                    await handleAdd(interaction);
                    break;
                case 'remove':
                    await handleRemove(interaction);
                    break;
                case 'list':
                    await handleList(interaction);
                    break;
                case 'toggle':
                    await handleToggle(interaction);
                    break;
                case 'reset':
                    await handleReset(interaction);
                    break;
                case 'setlogs':
                    await handleSetLogs(interaction);
                    break;
                case 'togglelogs':
                    await handleToggleLogs(interaction);
                    break;
                case 'export':
                    await handleExport(interaction);
                    break;
                case 'import':
                    await handleImport(interaction);
                    break;
                case 'repair':
                    await handleRepair(interaction);
                    break;
                case 'cleanup':
                    await handleCleanup(interaction);
                    break;
            }
        } catch (error) {
            console.error('Erreur dans reactionrole:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Une erreur s\'est produite lors de l\'exécution de la commande.',
                    flags: 64
                });
            }
            
            await reactionRoleLogger.logError(interaction.guild, interaction.user, error, `Commande: ${subcommand}`);
        }
    }
};

/**
 * Affiche le panel de gestion interactif
 */
async function handlePanel(interaction) {
    const stats = await reactionRoleStore.getGuildStats(interaction.guild.id);
    
    const embed = new EmbedBuilder()
        .setColor(stats.enabled ? 0x00FF00 : 0xFF0000)
        .setTitle('🎛️ Panel de Gestion ReactionRole')
        .setDescription('Gérez votre système de rôles de réaction avec ce panel interactif')
        .addFields(
            { 
                name: '📊 Statistiques', 
                value: `**Système:** ${stats.enabled ? '✅ Activé' : '❌ Désactivé'}\n**Messages:** ${stats.activeMessages}/${stats.totalMessages}\n**Réactions:** ${stats.activeReactions}/${stats.totalReactions}`, 
                inline: true 
            },
            { 
                name: '📝 Logs', 
                value: `**Statut:** ${stats.logsEnabled ? '✅ Activés' : '❌ Désactivés'}\n**Canal:** ${stats.logsChannel ? `<#${stats.logsChannel}>` : 'Non configuré'}`, 
                inline: true 
            },
            { 
                name: '🔧 Actions Rapides', 
                value: 'Utilisez les boutons ci-dessous pour gérer votre système', 
                inline: false 
            }
        )
        .setThumbnail(interaction.guild.iconURL())
        .setTimestamp()
        .setFooter({ text: 'Panel ReactionRole', iconURL: interaction.client.user.displayAvatarURL() });

    // Boutons principaux
    const mainButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('rr_add_reaction')
                .setLabel('➕ Ajouter')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('rr_remove_reaction')
                .setLabel('➖ Supprimer')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('rr_list_reactions')
                .setLabel('📋 Liste')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('rr_toggle_system')
                .setLabel(stats.enabled ? '🚫 Désactiver' : '✅ Activer')
                .setStyle(stats.enabled ? ButtonStyle.Danger : ButtonStyle.Success)
        );

    // Boutons de configuration
    const configButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('rr_config_logs')
                .setLabel('📝 Config Logs')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('rr_toggle_logs')
                .setLabel(stats.logsEnabled ? '🔇 Désactiver Logs' : '🔊 Activer Logs')
                .setStyle(stats.logsEnabled ? ButtonStyle.Secondary : ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('rr_reset_config')
                .setLabel('🔄 Reset')
                .setStyle(ButtonStyle.Danger)
        );

    // Menu déroulant pour la gestion des réactions existantes
    const reactionRoles = await reactionRoleStore.getAllReactionRoles(interaction.guild.id);
    const components = [mainButtons, configButtons];

    if (reactionRoles.length > 0) {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('rr_manage_existing')
            .setPlaceholder('🔧 Gérer les réactions existantes...')
            .setMinValues(1)
            .setMaxValues(1);

        for (const rr of reactionRoles.slice(0, 25)) { // Discord limite à 25 options
            const status = rr.globalEnabled && rr.messageEnabled && rr.reactionEnabled ? '✅' : '❌';
            const role = interaction.guild.roles.cache.get(rr.roleId);
            const roleName = role ? role.name : 'Rôle supprimé';
            
            selectMenu.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(`${status} ${rr.emoji} → ${roleName}`)
                    .setDescription(`Message: ${rr.messageId} | Canal: #${interaction.guild.channels.cache.get(rr.channelId)?.name || 'inconnu'}`)
                    .setValue(`${rr.messageId}:${rr.emoji}`)
            );
        }

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);
        components.push(selectRow);
    }

    await interaction.reply({
        embeds: [embed],
        components: components,
        flags: 64
    });
}

/**
 * Ajoute un rôle de réaction
 */
async function handleAdd(interaction) {
    const messageId = interaction.options.getString('message_id');
    const emoji = interaction.options.getString('emoji');
    const role = interaction.options.getRole('role');
    const exclusive = interaction.options.getBoolean('exclusive') ?? false;
    const removeOnUnreact = interaction.options.getBoolean('remove_on_unreact') ?? true;

    // Vérifier que le message existe
    let message;
    try {
        message = await interaction.channel.messages.fetch(messageId);
    } catch (error) {
        return interaction.reply({
            content: '❌ Message introuvable dans ce canal.',
            flags: 64
        });
    }

    // Ajouter la réaction role avec les nouvelles options
    await reactionRoleStore.addReactionRole(
        interaction.guild.id,
        messageId,
        interaction.channel.id,
        emoji,
        role.id,
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
    
    // Log de l'action
    try {
        const message = await interaction.channel.messages.fetch(messageId);
        await reactionRoleLogger.logReactionAdded(interaction.guild, interaction.user, role, message, emoji);
    } catch (error) {
        console.error('Erreur lors du logging:', error);
    }
}

/**
 * Supprime un rôle de réaction
 */
async function handleRemove(interaction) {
    const messageId = interaction.options.getString('message_id');
    const emoji = interaction.options.getString('emoji');

    const success = await reactionRoleStore.removeReactionRole(interaction.guild.id, messageId, emoji);

    if (!success) {
        return interaction.reply({
            content: '❌ Aucune configuration trouvée pour ce message et cet emoji.',
            flags: 64
        });
    }

    // Supprimer la réaction du message si possible
    try {
        const message = await interaction.channel.messages.fetch(messageId);
        const reaction = message.reactions.cache.find(r => r.emoji.name === emoji || r.emoji.toString() === emoji);
        if (reaction) {
            await reaction.users.remove(interaction.client.user);
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
        const message = await interaction.channel.messages.fetch(messageId);
        const role = interaction.guild.roles.cache.get(reactionData.roleId);
        await reactionRoleLogger.logReactionRemoved(interaction.guild, interaction.user, role, message, emoji);
    } catch (error) {
        console.error('Erreur lors du logging:', error);
    }
}

/**
 * Liste tous les rôles de réaction
 */
async function handleList(interaction) {
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
    for (const rr of reactionRoles.slice(0, 10)) { // Limiter à 10 pour éviter les embeds trop longs
        const status = rr.globalEnabled && rr.messageEnabled && rr.reactionEnabled ? '✅' : '❌';
        const role = interaction.guild.roles.cache.get(rr.roleId);
        const roleName = role ? role.name : 'Rôle supprimé';
        const channel = interaction.guild.channels.cache.get(rr.channelId);
        const channelName = channel ? channel.name : 'Canal supprimé';
        
        description += `${status} **${rr.emoji}** → **${roleName}**\n`;
        description += `   📝 Message: \`${rr.messageId}\` | 📍 #${channelName}\n\n`;
    }

    if (reactionRoles.length > 10) {
        description += `... et ${reactionRoles.length - 10} autre(s)`;
    }

    embed.setDescription(description);

    await interaction.reply({ embeds: [embed], flags: 64 });
}

/**
 * Active/désactive le système
 */
async function handleToggle(interaction) {
    const enabled = await reactionRoleStore.toggleGuildEnabled(interaction.guild.id);

    const embed = new EmbedBuilder()
        .setColor(enabled ? 0x00FF00 : 0xFF0000)
        .setTitle(`⚙️ Système ${enabled ? 'Activé' : 'Désactivé'}`)
        .setDescription(`Le système ReactionRole a été ${enabled ? 'activé' : 'désactivé'} pour ce serveur.`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: 64 });
    await reactionRoleLogger.logSystemToggled(interaction.guild, interaction.user, enabled);
}

/**
 * Remet à zéro la configuration
 */
async function handleReset(interaction) {
    // Afficher une confirmation
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
}

/**
 * Configure le canal de logs
 */
async function handleSetLogs(interaction) {
    const channel = interaction.options.getChannel('channel');

    await reactionRoleStore.setLogsChannel(interaction.guild.id, channel?.id || null);

    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('📍 Canal de Logs Configuré')
        .setDescription(channel ? `Les logs seront envoyés dans ${channel}` : 'Les logs ont été désactivés')
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: 64 });
    await reactionRoleLogger.logLogsConfigured(interaction.guild, interaction.user, channel);
}

/**
 * Active/désactive les logs
 */
async function handleToggleLogs(interaction) {
    const enabled = await reactionRoleStore.toggleLogs(interaction.guild.id);

    const embed = new EmbedBuilder()
        .setColor(enabled ? 0x00FF00 : 0xFF0000)
        .setTitle(`📝 Logs ${enabled ? 'Activés' : 'Désactivés'}`)
        .setDescription(`Les logs ReactionRole ont été ${enabled ? 'activés' : 'désactivés'}.`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: 64 });
    await reactionRoleLogger.logLogsToggled(interaction.guild, interaction.user, enabled);
}

/**
 * Exporte la configuration en JSON
 */
async function handleExport(interaction) {
    try {
        const config = await reactionRoleStore.exportGuildConfig(interaction.guild.id);
        
        const jsonString = JSON.stringify(config, null, 2);
        const buffer = Buffer.from(jsonString, 'utf8');
        
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📤 Export de Configuration')
            .setDescription('Votre configuration ReactionRole a été exportée avec succès !')
            .addFields(
                { name: '📊 Statistiques', value: `**Messages:** ${config.messages?.length || 0}\n**Réactions:** ${config.messages?.reduce((acc, msg) => acc + (msg.entries?.length || 0), 0) || 0}`, inline: true },
                { name: '⚙️ Paramètres', value: `**Système:** ${config.enabled ? 'Activé' : 'Désactivé'}\n**Logs:** ${config.logsEnabled ? 'Activés' : 'Désactivés'}`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            files: [{
                attachment: buffer,
                name: `reactionrole-config-${interaction.guild.id}-${Date.now()}.json`
            }],
            flags: 64
        });
        
        await reactionRoleLogger.logConfigExported(interaction.guild, interaction.user);
    } catch (error) {
        console.error('Erreur lors de l\'export:', error);
        await interaction.reply({
            content: '❌ Erreur lors de l\'export de la configuration.',
            flags: 64
        });
    }
}

/**
 * Importe une configuration depuis JSON
 */
async function handleImport(interaction) {
    try {
        const attachment = interaction.options.getAttachment('file');
        
        if (!attachment.name.endsWith('.json')) {
            return interaction.reply({
                content: '❌ Le fichier doit être au format JSON.',
                flags: 64
            });
        }

        // Télécharger et parser le fichier
        const response = await fetch(attachment.url);
        const jsonText = await response.text();
        const config = JSON.parse(jsonText);

        // Valider la structure
        if (!config || typeof config !== 'object') {
            return interaction.reply({
                content: '❌ Format de fichier invalide.',
                flags: 64
            });
        }

        // Afficher une confirmation avant l'import
        const embed = new EmbedBuilder()
            .setColor(0xFF6600)
            .setTitle('⚠️ Confirmation d\'Import')
            .setDescription('Êtes-vous sûr de vouloir importer cette configuration ?\n\n**Cela remplacera la configuration actuelle !**')
            .addFields(
                { name: '📊 Configuration à importer', value: `**Messages:** ${config.messages?.length || 0}\n**Réactions:** ${config.messages?.reduce((acc, msg) => acc + (msg.entries?.length || 0), 0) || 0}`, inline: true }
            )
            .setTimestamp();

        const confirmButton = new ButtonBuilder()
            .setCustomId(`rr_confirm_import:${Buffer.from(jsonText).toString('base64')}`)
            .setLabel('✅ Confirmer')
            .setStyle(ButtonStyle.Danger);

        const cancelButton = new ButtonBuilder()
            .setCustomId('rr_cancel_import')
            .setLabel('❌ Annuler')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        await interaction.reply({
            embeds: [embed],
            components: [row],
            flags: 64
        });
    } catch (error) {
        console.error('Erreur lors de l\'import:', error);
        await interaction.reply({
            content: '❌ Erreur lors de la lecture du fichier. Vérifiez que c\'est un JSON valide.',
            flags: 64
        });
    }
}

/**
 * Répare automatiquement les configurations
 */
async function handleRepair(interaction) {
    await interaction.deferReply({ flags: 64 });
    
    try {
        const results = await reactionRoleStore.autoRepair(interaction.guild.id);
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🔧 Réparation Automatique')
            .setDescription('La réparation automatique a été effectuée !')
            .addFields(
                { name: '🗑️ Nettoyage', value: `**Messages supprimés:** ${results.deletedMessages}\n**Réactions supprimées:** ${results.deletedReactions}`, inline: true },
                { name: '🔄 Réparations', value: `**Réactions ajoutées:** ${results.addedReactions}\n**Erreurs:** ${results.errors}`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        await reactionRoleLogger.logAutoRepair(interaction.guild, interaction.user, results);
    } catch (error) {
        console.error('Erreur lors de la réparation:', error);
        await interaction.editReply({
            content: '❌ Erreur lors de la réparation automatique.'
        });
    }
}

/**
 * Nettoie les configurations obsolètes
 */
async function handleCleanup(interaction) {
    await interaction.deferReply({ flags: 64 });
    
    try {
        const results = await reactionRoleStore.cleanup(interaction.guild.id);
        
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('🧹 Nettoyage Terminé')
            .setDescription('Le nettoyage des configurations obsolètes a été effectué !')
            .addFields(
                { name: '🗑️ Supprimés', value: `**Messages:** ${results.deletedMessages}\n**Réactions:** ${results.deletedReactions}\n**Rôles:** ${results.deletedRoles}`, inline: true },
                { name: '📊 Restants', value: `**Messages actifs:** ${results.activeMessages}\n**Réactions actives:** ${results.activeReactions}`, inline: true }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
        await reactionRoleLogger.logCleanup(interaction.guild, interaction.user, results);
    } catch (error) {
        console.error('Erreur lors du nettoyage:', error);
        await interaction.editReply({
            content: '❌ Erreur lors du nettoyage.'
        });
    }
}