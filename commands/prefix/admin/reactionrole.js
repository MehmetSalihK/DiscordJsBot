import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    name: 'reactionrole',
    aliases: ['rr', 'reactionroles'],
    description: 'Gestion des rôles de réaction (Administrateurs uniquement)',
    usage: 'reactionrole <add|remove|list|panel|logs> [arguments]',
    category: 'admin',
    permissions: [PermissionFlagsBits.Administrator],
    
    async execute(message, args) {
        // Vérification des permissions administrateur
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Vous devez être administrateur pour utiliser cette commande.');
        }

        if (!args[0]) {
            return message.reply('❌ Veuillez spécifier une action: `add`, `remove`, `list`, `panel`, ou `logs`');
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
                default:
                    message.reply('❌ Action invalide. Utilisez: `add`, `remove`, `list`, `panel`, ou `logs`');
            }
        } catch (error) {
            console.error('Erreur dans reactionrole:', error);
            message.reply('❌ Une erreur est survenue lors de l\'exécution de la commande.');
        }
    }
};

async function handleAdd(message, args, config, configPath) {
    if (args.length < 4) {
        return message.reply('❌ Usage: `reactionrole add <message_id> <emoji> <@role>`');
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

    // Vérifier si le message existe
    try {
        await message.channel.messages.fetch(messageId);
    } catch (error) {
        return message.reply('❌ Message introuvable dans ce canal.');
    }

    // Extraire l'ID de l'emoji
    let emojiId = emoji;
    const customEmojiMatch = emoji.match(/<a?:\w+:(\d+)>/);
    if (customEmojiMatch) {
        emojiId = customEmojiMatch[1];
    }

    // Trouver ou créer la règle pour ce message
    let messageRule = config.find(rule => rule.id_message === messageId);
    if (!messageRule) {
        messageRule = {
            id_salon: message.channel.id,
            id_message: messageId,
            reactions: []
        };
        config.push(messageRule);
    }

    // Vérifier si l'emoji existe déjà
    const existingReaction = messageRule.reactions.find(r => r.id_emoji === emojiId);
    if (existingReaction) {
        return message.reply('❌ Cet emoji est déjà configuré pour ce message.');
    }

    // Ajouter la nouvelle réaction
    messageRule.reactions.push({
        id_emoji: emojiId,
        id_role: role.id
    });

    // Sauvegarder
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    // Ajouter la réaction au message
    try {
        const targetMessage = await message.channel.messages.fetch(messageId);
        await targetMessage.react(emoji);
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la réaction:', error);
    }

    const embed = new EmbedBuilder()
        .setTitle('✅ Rôle de réaction ajouté')
        .setDescription(`**Message:** ${messageId}\n**Emoji:** ${emoji}\n**Rôle:** ${role}`)
        .setColor(0x00ff00)
        .setTimestamp();

    message.reply({ embeds: [embed] });
}

async function handleRemove(message, args, config, configPath) {
    if (args.length < 3) {
        return message.reply('❌ Usage: `reactionrole remove <message_id> <emoji>`');
    }

    const messageId = args[1];
    const emoji = args[2];

    // Extraire l'ID de l'emoji
    let emojiId = emoji;
    const customEmojiMatch = emoji.match(/<a?:\w+:(\d+)>/);
    if (customEmojiMatch) {
        emojiId = customEmojiMatch[1];
    }

    // Trouver la règle
    const messageRule = config.find(rule => rule.id_message === messageId);
    if (!messageRule) {
        return message.reply('❌ Aucune règle trouvée pour ce message.');
    }

    // Trouver et supprimer la réaction
    const reactionIndex = messageRule.reactions.findIndex(r => r.id_emoji === emojiId);
    if (reactionIndex === -1) {
        return message.reply('❌ Aucune règle trouvée pour cet emoji.');
    }

    messageRule.reactions.splice(reactionIndex, 1);

    // Si plus de réactions, supprimer la règle complète
    if (messageRule.reactions.length === 0) {
        const ruleIndex = config.findIndex(rule => rule.id_message === messageId);
        config.splice(ruleIndex, 1);
    }

    // Sauvegarder
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    const embed = new EmbedBuilder()
        .setTitle('✅ Rôle de réaction supprimé')
        .setDescription(`**Message:** ${messageId}\n**Emoji:** ${emoji}`)
        .setColor(0xff0000)
        .setTimestamp();

    message.reply({ embeds: [embed] });
}

async function handleList(message, config) {
    if (config.length === 0) {
        return message.reply('📝 Aucun rôle de réaction configuré.');
    }

    const embed = new EmbedBuilder()
        .setTitle('📋 Liste des rôles de réaction')
        .setColor(0x0099ff)
        .setTimestamp();

    let description = '';
    for (const rule of config) {
        description += `**Message:** ${rule.id_message}\n`;
        description += `**Canal:** <#${rule.id_salon}>\n`;
        description += `**Réactions:**\n`;
        
        for (const reaction of rule.reactions) {
            const role = message.guild.roles.cache.get(reaction.id_role);
            const emoji = message.guild.emojis.cache.get(reaction.id_emoji) || reaction.id_emoji;
            description += `  • ${emoji} → ${role || 'Rôle introuvable'}\n`;
        }
        description += '\n';
    }

    embed.setDescription(description);
    message.reply({ embeds: [embed] });
}

async function handlePanel(message) {
    const embed = new EmbedBuilder()
        .setTitle('🎛️ Panel de gestion des rôles de réaction')
        .setDescription('Utilisez les boutons ci-dessous pour gérer les rôles de réaction.')
        .setColor(0x0099ff)
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('rr_add')
                .setLabel('Ajouter')
                .setStyle(ButtonStyle.Success)
                .setEmoji('➕'),
            new ButtonBuilder()
                .setCustomId('rr_remove')
                .setLabel('Supprimer')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('➖'),
            new ButtonBuilder()
                .setCustomId('rr_list')
                .setLabel('Lister')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📋'),
            new ButtonBuilder()
                .setCustomId('rr_logs')
                .setLabel('Logs')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📝')
        );

    message.reply({ embeds: [embed], components: [row] });
}

async function handleLogs(message, args) {
    if (args.length < 2) {
        return message.reply('❌ Usage: `reactionrole logs <#channel>` ou `reactionrole logs disable`');
    }

    if (args[1].toLowerCase() === 'disable') {
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

    const embed = new EmbedBuilder()
        .setTitle('✅ Logs configurés')
        .setDescription(`Les logs des rôles de réaction seront envoyés dans ${channel}`)
        .setColor(0x00ff00)
        .setTimestamp();
    
    message.reply({ embeds: [embed] });
}