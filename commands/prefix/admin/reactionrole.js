import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, AttachmentBuilder } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import reactionRoleStore from '../../../src/store/reactionRoleStore.js';
import reactionRoleLogger from '../../../src/utils/reactionRoleLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    name: 'reactionrole',
    aliases: ['rr', 'reactionroles'],
    description: 'Gestion des rôles de réaction (Administrateurs uniquement)',
    usage: 'reactionrole <add|remove|list|panel|logs|toggle|reset|export|import|repair|cleanup> [arguments]',
    category: 'admin',
    permissions: [PermissionFlagsBits.Administrator],
    
    async execute(message, args) {
        // Vérification des permissions administrateur
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Vous devez être administrateur pour utiliser cette commande.');
        }

        if (!args[0]) {
            return message.reply('❌ Veuillez spécifier une action: `add`, `remove`, `list`, `panel`, `logs`, `toggle`, `reset`, `export`, `import`, `repair`, ou `cleanup`');
        }

        const action = args[0].toLowerCase();
        const configPath = path.join(__dirname, '../../../data/reactionroles.json');

        try {
            let config = [];
            try {
                const data = await fs.readFile(configPath, 'utf8');
                config = JSON.parse(data);
            } catch (error) {
                // Fichier n'existe pas encore
            }

            switch (action) {
                case 'add':
                    await handleAdd(message, args, config, configPath);
                    break;
                case 'remove':
                    await handleRemove(message, args, config, configPath);
                    break;
                case 'list':
                    await handleList(message, config);
                    break;
                case 'panel':
                    await handlePanel(message);
                    break;
                case 'logs':
                    await handleLogs(message, args);
                    break;
                case 'toggle':
                    await handleToggle(message, args);
                    break;
                case 'reset':
                    await handleReset(message, args);
                    break;
                case 'export':
                    await handleExport(message);
                    break;
                case 'import':
                    await handleImport(message, args);
                    break;
                case 'repair':
                    await handleRepair(message);
                    break;
                case 'cleanup':
                    await handleCleanup(message);
                    break;
                default:
                    message.reply('❌ Action invalide. Utilisez: `add`, `remove`, `list`, `panel`, `logs`, `toggle`, `reset`, `export`, `import`, `repair`, ou `cleanup`');
            }
        } catch (error) {
            console.error('Erreur dans reactionrole:', error);
            message.reply('❌ Une erreur est survenue lors de l\'exécution de la commande.');
        }
    }
};

async function handleAdd(message, args, config, configPath) {
    if (args.length < 4) {
        return message.reply('❌ Usage: `reactionrole add <message_id> <emoji> <@role> [exclusive:true/false] [remove_on_unreact:true/false]`');
    }

    const messageId = args[1];
    const emoji = args[2];
    const roleMatch = args[3].match(/<@&(\d+)>/);
    
    if (!roleMatch) {
        return message.reply('❌ Veuillez mentionner un rôle valide.');
    }

    const roleId = roleMatch[1];
    const role = message.guild.roles.cache.get(roleId);
    
    if (!role) {
        return message.reply('❌ Rôle introuvable.');
    }

    // Parser les options supplémentaires
    let exclusive = false;
    let removeOnUnreact = false;
    
    for (let i = 4; i < args.length; i++) {
        const arg = args[i].toLowerCase();
        if (arg.startsWith('exclusive:')) {
            exclusive = arg.split(':')[1] === 'true';
        } else if (arg.startsWith('remove_on_unreact:')) {
            removeOnUnreact = arg.split(':')[1] === 'true';
        }
    }

    // Vérifier si le message existe
    try {
        await message.channel.messages.fetch(messageId);
    } catch (error) {
        return message.reply('❌ Message introuvable dans ce canal.');
    }

    try {
        const result = await reactionRoleStore.addReactionRole(
            message.guild.id,
            message.channel.id,
            messageId,
            emoji,
            role.id,
            exclusive,
            removeOnUnreact
        );

        if (!result.success) {
            return message.reply(`❌ ${result.error}`);
        }

        // Ajouter la réaction au message
        try {
            const targetMessage = await message.channel.messages.fetch(messageId);
            await targetMessage.react(emoji);
        } catch (error) {
            console.error('Erreur lors de l\'ajout de la réaction:', error);
        }

        const embed = new EmbedBuilder()
            .setTitle('✅ Rôle de réaction ajouté')
            .addFields(
                { name: '📨 Message', value: messageId, inline: true },
                { name: '😀 Emoji', value: emoji, inline: true },
                { name: '🎭 Rôle', value: role.toString(), inline: true },
                { name: '⚙️ Mode Exclusif', value: exclusive ? '✅ Activé' : '❌ Désactivé', inline: true },
                { name: '🔄 Retrait Auto', value: removeOnUnreact ? '✅ Activé' : '❌ Désactivé', inline: true }
            )
            .setColor(0x00ff00)
            .setTimestamp();

        message.reply({ embeds: [embed] });

        // Log l'action
        await reactionRoleLogger.logAction(message.guild.id, 'add', {
            messageId,
            emoji,
            roleId: role.id,
            exclusive,
            removeOnUnreact,
            userId: message.author.id
        });

    } catch (error) {
        console.error('Erreur lors de l\'ajout du rôle de réaction:', error);
        message.reply('❌ Une erreur est survenue lors de l\'ajout du rôle de réaction.');
    }
}

async function handleRemove(message, args, config, configPath) {
    if (args.length < 3) {
        return message.reply('❌ Usage: `reactionrole remove <message_id> <emoji>`');
    }

    const messageId = args[1];
    const emoji = args[2];

    try {
        const result = await reactionRoleStore.removeReactionRole(
            message.guild.id,
            message.channel.id,
            messageId,
            emoji
        );

        if (!result.success) {
            return message.reply(`❌ ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setTitle('✅ Rôle de réaction supprimé')
            .addFields(
                { name: '📨 Message', value: messageId, inline: true },
                { name: '😀 Emoji', value: emoji, inline: true }
            )
            .setColor(0xff0000)
            .setTimestamp();

        message.reply({ embeds: [embed] });

        // Log l'action
        await reactionRoleLogger.logAction(message.guild.id, 'remove', {
            messageId,
            emoji,
            userId: message.author.id
        });

    } catch (error) {
        console.error('Erreur lors de la suppression du rôle de réaction:', error);
        message.reply('❌ Une erreur est survenue lors de la suppression du rôle de réaction.');
    }
}

async function handleList(message, config) {
    try {
        const reactionRoles = await reactionRoleStore.getReactionRoles(message.guild.id);
        
        if (reactionRoles.length === 0) {
            return message.reply('📝 Aucun rôle de réaction configuré.');
        }

        const embed = new EmbedBuilder()
            .setTitle('📋 Liste des rôles de réaction')
            .setColor(0x0099ff)
            .setTimestamp();

        let description = '';
        for (const rule of reactionRoles) {
            description += `**Message:** ${rule.messageId}\n`;
            description += `**Canal:** <#${rule.channelId}>\n`;
            description += `**Réactions:**\n`;
            
            for (const reaction of rule.reactions) {
                const role = message.guild.roles.cache.get(reaction.roleId);
                const emoji = message.guild.emojis.cache.get(reaction.emojiId) || reaction.emoji;
                const exclusiveText = reaction.exclusive ? ' (Exclusif)' : '';
                const removeText = reaction.removeOnUnreact ? ' (Retrait auto)' : '';
                description += `  • ${emoji} → ${role || 'Rôle introuvable'}${exclusiveText}${removeText}\n`;
            }
            description += '\n';
        }

        embed.setDescription(description);
        message.reply({ embeds: [embed] });

    } catch (error) {
        console.error('Erreur lors de la récupération de la liste:', error);
        message.reply('❌ Une erreur est survenue lors de la récupération de la liste.');
    }
}

async function handlePanel(message) {
    const embed = new EmbedBuilder()
        .setTitle('🎛️ Panel de gestion des rôles de réaction')
        .setDescription('Utilisez les boutons ci-dessous pour gérer les rôles de réaction.')
        .setColor(0x0099ff)
        .setTimestamp();

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('rr_add_rule')
                .setLabel('Ajouter')
                .setStyle(ButtonStyle.Success)
                .setEmoji('➕'),
            new ButtonBuilder()
                .setCustomId('rr_remove_rule')
                .setLabel('Supprimer')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('➖'),
            new ButtonBuilder()
                .setCustomId('rr_list_rules')
                .setLabel('Lister')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📋'),
            new ButtonBuilder()
                .setCustomId('rr_toggle_logs')
                .setLabel('Logs')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📝'),
            new ButtonBuilder()
                .setCustomId('rr_toggle_rule')
                .setLabel('Toggle')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔄')
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('rr_reset_message')
                .setLabel('Reset Message')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗑️'),
            new ButtonBuilder()
                .setCustomId('rr_export_config')
                .setLabel('Export')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📤'),
            new ButtonBuilder()
                .setCustomId('rr_import_config')
                .setLabel('Import')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📥'),
            new ButtonBuilder()
                .setCustomId('rr_repair_config')
                .setLabel('Réparer')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔧'),
            new ButtonBuilder()
                .setCustomId('rr_cleanup_config')
                .setLabel('Nettoyer')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🧹')
        );

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('rr_button_create_select')
                .setLabel('Créer Select Menu')
                .setStyle(ButtonStyle.Success)
                .setEmoji('📋'),
            new ButtonBuilder()
                .setCustomId('rr_button_create_buttons')
                .setLabel('Créer Buttons')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🔘'),
            new ButtonBuilder()
                .setCustomId('rr_menu_role_assign')
                .setLabel('Assigner Rôles')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎭'),
            new ButtonBuilder()
                .setCustomId('rr_menu_role_remove')
                .setLabel('Retirer Rôles')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗑️'),
            new ButtonBuilder()
                .setCustomId('rr_menu_message_manage')
                .setLabel('Gérer Messages')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📨')
        );

    message.reply({ embeds: [embed], components: [row1, row2, row3] });
}

async function handleLogs(message, args) {
    if (args.length < 2) {
        return message.reply('❌ Usage: `reactionrole logs <#channel>` ou `reactionrole logs disable`');
    }

    try {
        if (args[1].toLowerCase() === 'disable') {
            await reactionRoleLogger.setLogChannel(message.guild.id, null);
            
            const embed = new EmbedBuilder()
                .setTitle('✅ Logs désactivés')
                .setDescription('Les logs des rôles de réaction ont été désactivés.')
                .setColor(0xff0000)
                .setTimestamp();
            
            return message.reply({ embeds: [embed] });
        }

        const channelMatch = args[1].match(/<#(\d+)>/);
        if (!channelMatch) {
            return message.reply('❌ Veuillez mentionner un canal valide.');
        }

        const channelId = channelMatch[1];
        const channel = message.guild.channels.cache.get(channelId);
        
        if (!channel) {
            return message.reply('❌ Canal introuvable.');
        }

        await reactionRoleLogger.setLogChannel(message.guild.id, channelId);

        const embed = new EmbedBuilder()
            .setTitle('✅ Logs configurés')
            .setDescription(`Les logs des rôles de réaction seront envoyés dans ${channel}`)
            .setColor(0x00ff00)
            .setTimestamp();
        
        message.reply({ embeds: [embed] });

    } catch (error) {
         console.error('Erreur lors de la configuration des logs:', error);
         message.reply('❌ Une erreur est survenue lors de la configuration des logs.');
     }
}

async function handleToggle(message, args) {
    if (args.length < 3) {
        return message.reply('❌ Usage: `reactionrole toggle <message_id> <emoji>`');
    }

    const messageId = args[1];
    const emoji = args[2];

    try {
        const result = await reactionRoleStore.toggleReactionRole(
            message.guild.id,
            message.channel.id,
            messageId,
            emoji
        );

        if (!result.success) {
            return message.reply(`❌ ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setTitle('✅ Rôle de réaction basculé')
            .addFields(
                { name: '📨 Message', value: messageId, inline: true },
                { name: '😀 Emoji', value: emoji, inline: true },
                { name: '📊 Statut', value: result.enabled ? '✅ Activé' : '❌ Désactivé', inline: true }
            )
            .setColor(result.enabled ? 0x00ff00 : 0xff0000)
            .setTimestamp();

        message.reply({ embeds: [embed] });

        // Log l'action
        await reactionRoleLogger.logAction(message.guild.id, 'toggle', {
            messageId,
            emoji,
            enabled: result.enabled,
            userId: message.author.id
        });

    } catch (error) {
        console.error('Erreur lors du basculement:', error);
        message.reply('❌ Une erreur est survenue lors du basculement.');
    }
}

async function handleReset(message, args) {
    if (args.length < 2) {
        return message.reply('❌ Usage: `reactionrole reset <message_id>`');
    }

    const messageId = args[1];

    try {
        const result = await reactionRoleStore.resetMessage(
            message.guild.id,
            message.channel.id,
            messageId
        );

        if (!result.success) {
            return message.reply(`❌ ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setTitle('✅ Message réinitialisé')
            .addFields(
                { name: '📨 Message', value: messageId, inline: true },
                { name: '🗑️ Réactions supprimées', value: result.removedCount.toString(), inline: true }
            )
            .setColor(0x00ff00)
            .setTimestamp();

        message.reply({ embeds: [embed] });

        // Log l'action
        await reactionRoleLogger.logAction(message.guild.id, 'reset', {
            messageId,
            removedCount: result.removedCount,
            userId: message.author.id
        });

    } catch (error) {
        console.error('Erreur lors de la réinitialisation:', error);
        message.reply('❌ Une erreur est survenue lors de la réinitialisation.');
    }
}

async function handleExport(message) {
    try {
        const result = await reactionRoleStore.exportConfig(message.guild.id);

        if (!result.success) {
            return message.reply(`❌ ${result.error}`);
        }

        const attachment = new AttachmentBuilder(
            Buffer.from(JSON.stringify(result.data, null, 2)),
            { name: `reactionroles_${message.guild.id}_${Date.now()}.json` }
        );

        const embed = new EmbedBuilder()
            .setTitle('📤 Configuration exportée')
            .setDescription(`Configuration des rôles de réaction exportée avec succès.\n**Messages:** ${result.data.length}`)
            .setColor(0x00ff00)
            .setTimestamp();

        message.reply({ embeds: [embed], files: [attachment] });

        // Log l'action
        await reactionRoleLogger.logAction(message.guild.id, 'export', {
            messageCount: result.data.length,
            userId: message.author.id
        });

    } catch (error) {
        console.error('Erreur lors de l\'export:', error);
        message.reply('❌ Une erreur est survenue lors de l\'export.');
    }
}

async function handleImport(message, args) {
    if (!message.attachments.size) {
        return message.reply('❌ Veuillez joindre un fichier JSON de configuration.');
    }

    const attachment = message.attachments.first();
    if (!attachment.name.endsWith('.json')) {
        return message.reply('❌ Le fichier doit être au format JSON.');
    }

    try {
        const response = await fetch(attachment.url);
        const configData = await response.json();

        const result = await reactionRoleStore.importConfig(message.guild.id, configData);

        if (!result.success) {
            return message.reply(`❌ ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setTitle('📥 Configuration importée')
            .addFields(
                { name: '✅ Importés', value: result.imported.toString(), inline: true },
                { name: '⚠️ Ignorés', value: result.skipped.toString(), inline: true },
                { name: '❌ Erreurs', value: result.errors.toString(), inline: true }
            )
            .setColor(0x00ff00)
            .setTimestamp();

        message.reply({ embeds: [embed] });

        // Log l'action
        await reactionRoleLogger.logAction(message.guild.id, 'import', {
            imported: result.imported,
            skipped: result.skipped,
            errors: result.errors,
            userId: message.author.id
        });

    } catch (error) {
        console.error('Erreur lors de l\'import:', error);
        message.reply('❌ Une erreur est survenue lors de l\'import. Vérifiez le format du fichier.');
    }
}

async function handleRepair(message) {
    try {
        const result = await reactionRoleStore.repairConfig(message.guild.id);

        if (!result.success) {
            return message.reply(`❌ ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setTitle('🔧 Configuration réparée')
            .addFields(
                { name: '🗑️ Supprimés', value: result.removed.toString(), inline: true },
                { name: '🔄 Réparés', value: result.repaired.toString(), inline: true }
            )
            .setColor(0x00ff00)
            .setTimestamp();

        if (result.issues.length > 0) {
            embed.addFields({
                name: '⚠️ Problèmes détectés',
                value: result.issues.slice(0, 5).join('\n') + (result.issues.length > 5 ? '\n...' : ''),
                inline: false
            });
        }

        message.reply({ embeds: [embed] });

        // Log l'action
        await reactionRoleLogger.logAction(message.guild.id, 'repair', {
            removed: result.removed,
            repaired: result.repaired,
            issues: result.issues.length,
            userId: message.author.id
        });

    } catch (error) {
        console.error('Erreur lors de la réparation:', error);
        message.reply('❌ Une erreur est survenue lors de la réparation.');
    }
}

async function handleCleanup(message) {
    try {
        const result = await reactionRoleStore.cleanupConfig(message.guild.id);

        if (!result.success) {
            return message.reply(`❌ ${result.error}`);
        }

        const embed = new EmbedBuilder()
            .setTitle('🧹 Nettoyage effectué')
            .addFields(
                { name: '🗑️ Messages supprimés', value: result.removedMessages.toString(), inline: true },
                { name: '🗑️ Réactions supprimées', value: result.removedReactions.toString(), inline: true }
            )
            .setColor(0x00ff00)
            .setTimestamp();

        message.reply({ embeds: [embed] });

        // Log l'action
        await reactionRoleLogger.logAction(message.guild.id, 'cleanup', {
            removedMessages: result.removedMessages,
            removedReactions: result.removedReactions,
            userId: message.author.id
        });

    } catch (error) {
        console.error('Erreur lors du nettoyage:', error);
        message.reply('❌ Une erreur est survenue lors du nettoyage.');
    }
}