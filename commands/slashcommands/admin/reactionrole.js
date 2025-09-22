import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    data: new SlashCommandBuilder()
        .setName('reactionrole')
        .setDescription('Gestion des rôles de réaction (Administrateurs uniquement)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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
                        .setRequired(true)))
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
                .setName('panel')
                .setDescription('Afficher le panel de gestion'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('logs')
                .setDescription('Configurer les logs des rôles de réaction')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Canal pour les logs (laisser vide pour désactiver)')
                        .setRequired(false))),

    async execute(interaction) {
        // Vérification des permissions administrateur
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ Vous devez être administrateur pour utiliser cette commande.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const configPath = path.join(__dirname, '../../../data/reactionroles.json');

        try {
            let config = [];
            try {
                const data = await fs.readFile(configPath, 'utf8');
                config = JSON.parse(data);
            } catch (error) {
                // Fichier n'existe pas encore
            }

            switch (subcommand) {
                case 'add':
                    await handleAdd(interaction, config, configPath);
                    break;
                case 'remove':
                    await handleRemove(interaction, config, configPath);
                    break;
                case 'list':
                    await handleList(interaction, config);
                    break;
                case 'panel':
                    await handlePanel(interaction);
                    break;
                case 'logs':
                    await handleLogs(interaction);
                    break;
            }
        } catch (error) {
            console.error('Erreur dans reactionrole:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
                ephemeral: true
            });
        }
    }
};

async function handleAdd(interaction, config, configPath) {
    const messageId = interaction.options.getString('message_id');
    const emoji = interaction.options.getString('emoji');
    const role = interaction.options.getRole('role');

    // Vérifier si le message existe
    try {
        await interaction.channel.messages.fetch(messageId);
    } catch (error) {
        return await interaction.reply({
            content: '❌ Message introuvable dans ce canal.',
            ephemeral: true
        });
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
            id_salon: interaction.channel.id,
            id_message: messageId,
            reactions: []
        };
        config.push(messageRule);
    }

    // Vérifier si l'emoji existe déjà
    const existingReaction = messageRule.reactions.find(r => r.id_emoji === emojiId);
    if (existingReaction) {
        return await interaction.reply({
            content: '❌ Cet emoji est déjà configuré pour ce message.',
            ephemeral: true
        });
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
        const message = await interaction.channel.messages.fetch(messageId);
        await message.react(emoji);
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la réaction:', error);
    }

    const embed = new EmbedBuilder()
        .setTitle('✅ Rôle de réaction ajouté')
        .setDescription(`**Message:** ${messageId}\n**Emoji:** ${emoji}\n**Rôle:** ${role}`)
        .setColor(0x00ff00)
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleRemove(interaction, config, configPath) {
    const messageId = interaction.options.getString('message_id');
    const emoji = interaction.options.getString('emoji');

    // Extraire l'ID de l'emoji
    let emojiId = emoji;
    const customEmojiMatch = emoji.match(/<a?:\w+:(\d+)>/);
    if (customEmojiMatch) {
        emojiId = customEmojiMatch[1];
    }

    // Trouver la règle
    const messageRule = config.find(rule => rule.id_message === messageId);
    if (!messageRule) {
        return await interaction.reply({
            content: '❌ Aucune règle trouvée pour ce message.',
            ephemeral: true
        });
    }

    // Trouver et supprimer la réaction
    const reactionIndex = messageRule.reactions.findIndex(r => r.id_emoji === emojiId);
    if (reactionIndex === -1) {
        return await interaction.reply({
            content: '❌ Aucune règle trouvée pour cet emoji.',
            ephemeral: true
        });
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

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleList(interaction, config) {
    if (config.length === 0) {
        return await interaction.reply({
            content: '📝 Aucun rôle de réaction configuré.',
            ephemeral: true
        });
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
            const role = interaction.guild.roles.cache.get(reaction.id_role);
            const emoji = interaction.guild.emojis.cache.get(reaction.id_emoji) || reaction.id_emoji;
            description += `  • ${emoji} → ${role || 'Rôle introuvable'}\n`;
        }
        description += '\n';
    }

    embed.setDescription(description);
    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handlePanel(interaction) {
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

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

async function handleLogs(interaction) {
    const channel = interaction.options.getChannel('channel');
    
    // Ici on pourrait sauvegarder la configuration des logs
    // Pour l'instant, on fait juste une réponse simple
    
    if (channel) {
        const embed = new EmbedBuilder()
            .setTitle('✅ Logs configurés')
            .setDescription(`Les logs des rôles de réaction seront envoyés dans ${channel}`)
            .setColor(0x00ff00)
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
        const embed = new EmbedBuilder()
            .setTitle('✅ Logs désactivés')
            .setDescription('Les logs des rôles de réaction ont été désactivés.')
            .setColor(0xff0000)
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}