import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionFlagsBits } from 'discord.js';
import { 
    loadButtonReactData,
    saveButtonReactData,
    getGuildButtonReactConfig,
    updateGuildButtonReactConfig,
    addButtonReactPanel, 
    removeButtonReactPanel, 
    getAllButtonReactPanels, 
    getButtonReactPanel 
} from '../../../src/modules/buttonreact/storage.js';
import { createPanelEmbed, createButtonRow, validatePanelConfig, generatePanelId, formatRoleList } from '../../../src/modules/buttonreact/core.js';

export default {
    name: 'boutonrole',
    description: 'Gère les panneaux de rôles avec boutons',
    category: 'admin',
    usage: 'boutonrole <action> [options]',
    permissions: [PermissionFlagsBits.ManageRoles],

    async execute(message, args) {
        // Vérifier les permissions
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply({
                embeds: [createErrorEmbed('Vous n\'avez pas la permission de gérer les rôles.')]
            });
        }

        if (args.length === 0) {
            return message.reply({
                embeds: [createHelpEmbed()]
            });
        }

        const action = args[0].toLowerCase();

        try {
            switch (action) {
                case 'créer':
                case 'creer':
                case 'create':
                    await handleCreatePanel(message, args.slice(1));
                    break;
                case 'ajouter':
                case 'add':
                case 'bouton':
                    await handleAddButton(message, args.slice(1));
                    break;
                case 'publier':
                case 'publish':
                case 'send':
                    await handlePublishPanel(message, args.slice(1));
                    break;
                case 'liste':
                case 'list':
                    await handleListPanels(message);
                    break;
                case 'supprimer':
                case 'delete':
                case 'remove':
                    await handleDeletePanel(message, args.slice(1));
                    break;
                case 'aperçu':
                case 'apercu':
                case 'preview':
                    await handlePreviewPanel(message, args.slice(1));
                    break;
                case 'aide':
                case 'help':
                    await message.reply({ embeds: [createHelpEmbed()] });
                    break;
                default:
                    await message.reply({
                        embeds: [createErrorEmbed(`Action inconnue: \`${action}\`. Utilisez \`boutonrole aide\` pour voir les commandes disponibles.`)]
                    });
            }
        } catch (error) {
            console.error('Erreur dans la commande boutonrole:', error);
            await message.reply({
                embeds: [createErrorEmbed('Une erreur inattendue est survenue.')]
            });
        }
    }
};

async function handleCreatePanel(message, args) {
    if (args.length < 3) {
        return message.reply({
            embeds: [createErrorEmbed('Usage: `boutonrole créer <titre> <description> <#salon> [couleur] [miniature]`')]
        });
    }

    // Parser les arguments
    const titre = args[0];
    const description = args[1];
    const salonMention = args[2];
    const couleur = args[3] || '#3498db';
    const miniature = args[4];

    // Extraire l'ID du salon depuis la mention
    const salonMatch = salonMention.match(/^<#(\d+)>$/) || salonMention.match(/^(\d+)$/);
    if (!salonMatch) {
        return message.reply({
            embeds: [createErrorEmbed('Format de salon invalide. Utilisez #salon ou l\'ID du salon.')]
        });
    }

    const salon = message.guild.channels.cache.get(salonMatch[1]);
    if (!salon || salon.type !== ChannelType.GuildText) {
        return message.reply({
            embeds: [createErrorEmbed('Salon introuvable ou invalide.')]
        });
    }

    // Validation de la couleur hex
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexRegex.test(couleur)) {
        return message.reply({
            embeds: [createErrorEmbed('Format de couleur invalide. Utilisez le format hex (#RRGGBB).')]
        });
    }

    // Créer la configuration du panneau
    const panelId = generatePanelId(message.guild.id);
    const panelConfig = {
        id: panelId,
        title: titre,
        description: description,
        color: couleur,
        thumbnail: miniature,
        channelId: salon.id,
        buttons: [],
        createdBy: message.author.id,
        createdAt: new Date().toISOString()
    };

    // Sauvegarder le panneau
    addButtonReactPanel(message.guild.id, panelId, panelConfig);

    const successEmbed = createSuccessEmbed(
        `Panneau de rôles créé avec succès !\n\n` +
        `**ID du panneau:** \`${panelId}\`\n` +
        `**Salon:** ${salon}\n\n` +
        `Utilisez \`boutonrole ajouter ${panelId} @rôle "Label du bouton"\` pour ajouter des boutons.`
    );

    await message.reply({ embeds: [successEmbed] });
}

async function handleAddButton(message, args) {
    if (args.length < 3) {
        return message.reply({
            embeds: [createErrorEmbed('Usage: `boutonrole ajouter <panneau-id> <@rôle> <"label"> [style] [emoji]`')]
        });
    }

    const panelId = args[0];
    const roleMention = args[1];
    const label = args[2].replace(/"/g, ''); // Retirer les guillemets
    const style = args[3] || 'secondary';
    const emoji = args[4];

    // Vérifier si le panneau existe
    const panel = getButtonReactPanel(message.guild.id, panelId);
    if (!panel) {
        return message.reply({
            embeds: [createErrorEmbed('Panneau introuvable. Vérifiez l\'ID du panneau.')]
        });
    }

    // Extraire l'ID du rôle depuis la mention
    const roleMatch = roleMention.match(/^<@&(\d+)>$/) || roleMention.match(/^(\d+)$/);
    if (!roleMatch) {
        return message.reply({
            embeds: [createErrorEmbed('Format de rôle invalide. Utilisez @rôle ou l\'ID du rôle.')]
        });
    }

    const role = message.guild.roles.cache.get(roleMatch[1]);
    if (!role) {
        return message.reply({
            embeds: [createErrorEmbed('Rôle introuvable.')]
        });
    }

    // Vérifier si le rôle peut être géré par le bot
    if (role.position >= message.guild.members.me.roles.highest.position) {
        return message.reply({
            embeds: [createErrorEmbed('Je ne peux pas gérer ce rôle car il est plus haut que mon rôle le plus élevé.')]
        });
    }

    // Vérifier si le rôle est déjà dans le panneau
    const existingButton = panel.buttons.find(btn => btn.roleId === role.id);
    if (existingButton) {
        return message.reply({
            embeds: [createErrorEmbed('Ce rôle est déjà configuré dans ce panneau.')]
        });
    }

    // Vérifier la limite de boutons
    if (panel.buttons.length >= 25) {
        return message.reply({
            embeds: [createErrorEmbed('Maximum 25 boutons par panneau.')]
        });
    }

    // Valider le style
    const validStyles = ['primary', 'secondary', 'success', 'danger'];
    if (!validStyles.includes(style.toLowerCase())) {
        return message.reply({
            embeds: [createErrorEmbed(`Style invalide. Styles disponibles: ${validStyles.join(', ')}`)]
        });
    }

    // Ajouter le bouton
    const buttonConfig = {
        roleId: role.id,
        label: label,
        style: style.toLowerCase(),
        emoji: emoji
    };

    panel.buttons.push(buttonConfig);
    addButtonReactPanel(message.guild.id, panelId, panel);

    const successEmbed = createSuccessEmbed(
        `Bouton ajouté avec succès !\n\n` +
        `**Rôle:** ${role}\n` +
        `**Label:** ${label}\n` +
        `**Style:** ${style}\n` +
        `${emoji ? `**Emoji:** ${emoji}\n` : ''}` +
        `\nUtilisez \`boutonrole publier ${panelId}\` pour publier le panneau.`
    );

    await message.reply({ embeds: [successEmbed] });
}

async function handlePublishPanel(message, args) {
    if (args.length < 1) {
        return message.reply({
            embeds: [createErrorEmbed('Usage: `boutonrole publier <panneau-id> [#salon]`')]
        });
    }

    const panelId = args[0];
    const salonMention = args[1];

    // Vérifier si le panneau existe
    const panel = getButtonReactPanel(message.guild.id, panelId);
    if (!panel) {
        return message.reply({
            embeds: [createErrorEmbed('Panneau introuvable. Vérifiez l\'ID du panneau.')]
        });
    }

    // Vérifier s'il y a des boutons
    if (panel.buttons.length === 0) {
        return message.reply({
            embeds: [createErrorEmbed('Ce panneau n\'a aucun bouton. Ajoutez des boutons avant de le publier.')]
        });
    }

    let targetChannel;
    if (salonMention) {
        // Salon spécifié
        const salonMatch = salonMention.match(/^<#(\d+)>$/) || salonMention.match(/^(\d+)$/);
        if (!salonMatch) {
            return message.reply({
                embeds: [createErrorEmbed('Format de salon invalide. Utilisez #salon ou l\'ID du salon.')]
            });
        }
        targetChannel = message.guild.channels.cache.get(salonMatch[1]);
    } else {
        // Salon configuré dans le panneau
        targetChannel = message.guild.channels.cache.get(panel.channelId);
    }

    if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
        return message.reply({
            embeds: [createErrorEmbed('Salon introuvable ou invalide.')]
        });
    }

    // Vérifier les permissions du bot dans le salon
    const botPermissions = targetChannel.permissionsFor(message.guild.members.me);
    if (!botPermissions.has(['SendMessages', 'EmbedLinks'])) {
        return message.reply({
            embeds: [createErrorEmbed('Je n\'ai pas les permissions pour envoyer des messages dans ce salon.')]
        });
    }

    try {
        // Créer l'embed et les boutons
        const embed = createButtonReactEmbed(panel);
        const buttons = createButtonReactButtons(panel.buttons);

        // Envoyer le message
        const sentMessage = await targetChannel.send({
            embeds: [embed],
            components: buttons
        });

        // Mettre à jour le panneau avec l'ID du message
        panel.messageId = sentMessage.id;
        panel.publishedAt = new Date().toISOString();
        addButtonReactPanel(message.guild.id, panelId, panel);

        const successEmbed = createSuccessEmbed(
            `Panneau publié avec succès dans ${targetChannel} !\n\n` +
            `**ID du message:** \`${sentMessage.id}\`\n` +
            `**Nombre de boutons:** ${panel.buttons.length}`
        );

        await message.reply({ embeds: [successEmbed] });

    } catch (error) {
        console.error('Erreur lors de la publication du panneau:', error);
        await message.reply({
            embeds: [createErrorEmbed('Erreur lors de la publication du panneau.')]
        });
    }
}

async function handleListPanels(message) {
    const panels = getAllButtonReactPanels(message.guild.id);
    const panelEntries = Object.entries(panels);

    if (panelEntries.length === 0) {
        return message.reply({
            embeds: [createInfoEmbed('Aucun panneau de rôles configuré sur ce serveur.')]
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('📋 Panneaux de Rôles')
        .setColor('#3498db')
        .setTimestamp();

    let description = '';
    for (const [panelId, panel] of panelEntries.slice(0, 10)) {
        const status = panel.messageId ? '✅ Publié' : '⏳ En attente';
        const channel = message.guild.channels.cache.get(panel.channelId);
        const channelName = channel ? channel.name : 'Salon supprimé';
        
        description += `**${panel.title}**\n`;
        description += `ID: \`${panelId}\`\n`;
        description += `Salon: #${channelName}\n`;
        description += `Boutons: ${panel.buttons.length}\n`;
        description += `Statut: ${status}\n\n`;
    }

    if (panelEntries.length > 10) {
        description += `*... et ${panelEntries.length - 10} autres panneaux*`;
    }

    embed.setDescription(description);

    await message.reply({ embeds: [embed] });
}

async function handleDeletePanel(message, args) {
    if (args.length < 1) {
        return message.reply({
            embeds: [createErrorEmbed('Usage: `boutonrole supprimer <panneau-id>`')]
        });
    }

    const panelId = args[0];

    // Vérifier si le panneau existe
    const panel = getButtonReactPanel(message.guild.id, panelId);
    if (!panel) {
        return message.reply({
            embeds: [createErrorEmbed('Panneau introuvable. Vérifiez l\'ID du panneau.')]
        });
    }

    // Supprimer le panneau
    removeButtonReactPanel(message.guild.id, panelId);

    const successEmbed = createSuccessEmbed(
        `Panneau **${panel.title}** supprimé avec succès !\n\n` +
        `⚠️ **Note:** Le message publié dans le salon n'a pas été supprimé automatiquement.`
    );

    await message.reply({ embeds: [successEmbed] });
}

async function handlePreviewPanel(message, args) {
    if (args.length < 1) {
        return message.reply({
            embeds: [createErrorEmbed('Usage: `boutonrole aperçu <panneau-id>`')]
        });
    }

    const panelId = args[0];

    // Vérifier si le panneau existe
    const panel = getButtonReactPanel(message.guild.id, panelId);
    if (!panel) {
        return message.reply({
            embeds: [createErrorEmbed('Panneau introuvable. Vérifiez l\'ID du panneau.')]
        });
    }

    if (panel.buttons.length === 0) {
        return message.reply({
            embeds: [createErrorEmbed('Ce panneau n\'a aucun bouton configuré.')]
        });
    }

    try {
        // Créer l'embed et les boutons pour l'aperçu
        const embed = createButtonReactEmbed(panel);
        const buttons = createButtonReactButtons(panel.buttons);

        // Ajouter des informations sur le panneau
        embed.addFields(
            { name: '📊 Informations', value: `**ID:** \`${panelId}\`\n**Boutons:** ${panel.buttons.length}`, inline: true },
            { name: '📝 Rôles configurés', value: formatRolesList(panel.buttons, message.guild), inline: false }
        );

        await message.reply({
            content: '👀 **Aperçu du panneau:**',
            embeds: [embed],
            components: buttons
        });

    } catch (error) {
        console.error('Erreur lors de l\'aperçu du panneau:', error);
        await message.reply({
            embeds: [createErrorEmbed('Erreur lors de la génération de l\'aperçu.')]
        });
    }
}

function createHelpEmbed() {
    return new EmbedBuilder()
        .setTitle('🎭 Aide - Bouton Rôle')
        .setColor('#3498db')
        .setDescription('Système de gestion des rôles avec boutons interactifs')
        .addFields(
            {
                name: '📝 Créer un panneau',
                value: '`boutonrole créer <titre> <description> <#salon> [couleur] [miniature]`',
                inline: false
            },
            {
                name: '➕ Ajouter un bouton',
                value: '`boutonrole ajouter <panneau-id> <@rôle> <"label"> [style] [emoji]`',
                inline: false
            },
            {
                name: '📤 Publier un panneau',
                value: '`boutonrole publier <panneau-id> [#salon]`',
                inline: false
            },
            {
                name: '📋 Lister les panneaux',
                value: '`boutonrole liste`',
                inline: false
            },
            {
                name: '👀 Aperçu d\'un panneau',
                value: '`boutonrole aperçu <panneau-id>`',
                inline: false
            },
            {
                name: '🗑️ Supprimer un panneau',
                value: '`boutonrole supprimer <panneau-id>`',
                inline: false
            },
            {
                name: '🎨 Styles de boutons',
                value: '`primary` (bleu), `secondary` (gris), `success` (vert), `danger` (rouge)',
                inline: false
            }
        )
        .setTimestamp();
}

function createErrorEmbed(message) {
    return new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('❌ Erreur')
        .setDescription(message)
        .setTimestamp();
}

function createSuccessEmbed(message) {
    return new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('✅ Succès')
        .setDescription(message)
        .setTimestamp();
}

function createInfoEmbed(message) {
    return new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('ℹ️ Information')
        .setDescription(message)
        .setTimestamp();
}



