import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from 'discord.js';
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
import { 
    createPanelEmbed, 
    createButtonRow, 
    validatePanelConfig, 
    generatePanelId,
    formatRoleList 
} from '../../../src/modules/buttonreact/core.js';

export default {
    data: new SlashCommandBuilder()
        .setName('boutonrole')
        .setDescription('Gère les panneaux de rôles avec boutons')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(subcommand =>
            subcommand
                .setName('créer')
                .setDescription('Crée un nouveau panneau de rôles avec boutons')
                .addStringOption(option =>
                    option
                        .setName('titre')
                        .setDescription('Titre du panneau')
                        .setRequired(true)
                        .setMaxLength(256)
                )
                .addStringOption(option =>
                    option
                        .setName('description')
                        .setDescription('Description du panneau')
                        .setRequired(true)
                        .setMaxLength(4096)
                )
                .addChannelOption(option =>
                    option
                        .setName('salon')
                        .setDescription('Salon où envoyer le panneau')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
                .addStringOption(option =>
                    option
                        .setName('couleur')
                        .setDescription('Couleur de l\'embed (hex)')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName('miniature')
                        .setDescription('URL de la miniature')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('ajouter-bouton')
                .setDescription('Ajoute un bouton à un panneau existant')
                .addStringOption(option =>
                    option
                        .setName('panneau-id')
                        .setDescription('ID du panneau')
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option
                        .setName('rôle')
                        .setDescription('Rôle à attribuer')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('label')
                        .setDescription('Texte du bouton')
                        .setRequired(true)
                        .setMaxLength(80)
                )
                .addStringOption(option =>
                    option
                        .setName('style')
                        .setDescription('Style du bouton')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Bleu (Primary)', value: 'primary' },
                            { name: 'Gris (Secondary)', value: 'secondary' },
                            { name: 'Vert (Success)', value: 'success' },
                            { name: 'Rouge (Danger)', value: 'danger' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('emoji')
                        .setDescription('Emoji du bouton')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('publier')
                .setDescription('Publie un panneau dans un salon')
                .addStringOption(option =>
                    option
                        .setName('panneau-id')
                        .setDescription('ID du panneau à publier')
                        .setRequired(true)
                )
                .addChannelOption(option =>
                    option
                        .setName('salon')
                        .setDescription('Salon où publier le panneau')
                        .setRequired(false)
                        .addChannelTypes(ChannelType.GuildText)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('liste')
                .setDescription('Affiche la liste des panneaux de rôles')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('supprimer')
                .setDescription('Supprime un panneau de rôles')
                .addStringOption(option =>
                    option
                        .setName('panneau-id')
                        .setDescription('ID du panneau à supprimer')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('aperçu')
                .setDescription('Affiche un aperçu d\'un panneau')
                .addStringOption(option =>
                    option
                        .setName('panneau-id')
                        .setDescription('ID du panneau à prévisualiser')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'créer':
                    await handleCreatePanel(interaction);
                    break;
                case 'ajouter-bouton':
                    await handleAddButton(interaction);
                    break;
                case 'publier':
                    await handlePublishPanel(interaction);
                    break;
                case 'liste':
                    await handleListPanels(interaction);
                    break;
                case 'supprimer':
                    await handleDeletePanel(interaction);
                    break;
                case 'aperçu':
                    await handlePreviewPanel(interaction);
                    break;
                default:
                    await interaction.reply({
                        embeds: [createErrorEmbed('Sous-commande non reconnue.')],
                        flags: 64 // MessageFlags.Ephemeral
                    });
            }
        } catch (error) {
            console.error('Erreur dans la commande boutonrole:', error);
            const errorEmbed = createErrorEmbed('Une erreur inattendue est survenue.');
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ embeds: [errorEmbed], flags: 64 // MessageFlags.Ephemeral });
            } else {
                await interaction.followUp({ embeds: [errorEmbed], flags: 64 // MessageFlags.Ephemeral });
            }
        }
    }
};

async function handleCreatePanel(interaction) {
    const titre = interaction.options.getString('titre');
    const description = interaction.options.getString('description');
    const salon = interaction.options.getChannel('salon');
    const couleur = interaction.options.getString('couleur') || '#3498db';
    const miniature = interaction.options.getString('miniature');

    // Validation de la couleur hex
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexRegex.test(couleur)) {
        return await interaction.reply({
            embeds: [createErrorEmbed('Format de couleur invalide. Utilisez le format hex (#RRGGBB).')],
            flags: 64 // MessageFlags.Ephemeral
        });
    }

    // Créer la configuration du panneau
    const panelId = generatePanelId(interaction.guild.id);
    const panelConfig = {
        id: panelId,
        title: titre,
        description: description,
        color: couleur,
        thumbnail: miniature,
        channelId: salon.id,
        buttons: [],
        createdBy: interaction.user.id,
        createdAt: new Date().toISOString()
    };

    // Sauvegarder le panneau
    addButtonReactPanel(interaction.guild.id, panelId, panelConfig);

    const successEmbed = createSuccessEmbed(
        `Panneau de rôles créé avec succès !\n\n` +
        `**ID du panneau:** \`${panelId}\`\n` +
        `**Salon:** ${salon}\n\n` +
        `Utilisez \`/boutonrole ajouter-bouton\` pour ajouter des boutons à ce panneau.`
    );

    await interaction.reply({ embeds: [successEmbed], flags: 64 // MessageFlags.Ephemeral });
}

async function handleAddButton(interaction) {
    const panelId = interaction.options.getString('panneau-id');
    const role = interaction.options.getRole('rôle');
    const label = interaction.options.getString('label');
    const style = interaction.options.getString('style') || 'secondary';
    const emoji = interaction.options.getString('emoji');

    // Vérifier si le panneau existe
    const panel = getButtonReactPanel(interaction.guild.id, panelId);
    if (!panel) {
        return await interaction.reply({
            embeds: [createErrorEmbed('Panneau introuvable. Vérifiez l\'ID du panneau.')],
            flags: 64 // MessageFlags.Ephemeral
        });
    }

    // Vérifier si le rôle peut être géré par le bot
    if (role.position >= interaction.guild.members.me.roles.highest.position) {
        return await interaction.reply({
            embeds: [createErrorEmbed('Je ne peux pas gérer ce rôle car il est plus haut que mon rôle le plus élevé.')],
            flags: 64 // MessageFlags.Ephemeral
        });
    }

    // Vérifier si le rôle est déjà dans le panneau
    const existingButton = panel.buttons.find(btn => btn.roleId === role.id);
    if (existingButton) {
        return await interaction.reply({
            embeds: [createErrorEmbed('Ce rôle est déjà configuré dans ce panneau.')],
            flags: 64 // MessageFlags.Ephemeral
        });
    }

    // Vérifier la limite de boutons
    if (panel.buttons.length >= 25) {
        return await interaction.reply({
            embeds: [createErrorEmbed('Maximum 25 boutons par panneau.')],
            flags: 64 // MessageFlags.Ephemeral
        });
    }

    // Ajouter le bouton
    const buttonConfig = {
        roleId: role.id,
        label: label,
        style: style,
        emoji: emoji
    };

    panel.buttons.push(buttonConfig);
    addButtonReactPanel(interaction.guild.id, panelId, panel);

    const successEmbed = createSuccessEmbed(
        `Bouton ajouté avec succès !\n\n` +
        `**Rôle:** ${role}\n` +
        `**Label:** ${label}\n` +
        `**Style:** ${style}\n` +
        `${emoji ? `**Emoji:** ${emoji}\n` : ''}` +
        `\nUtilisez \`/boutonrole publier\` pour publier le panneau.`
    );

    await interaction.reply({ embeds: [successEmbed], flags: 64 // MessageFlags.Ephemeral });
}

async function handlePublishPanel(interaction) {
    const panelId = interaction.options.getString('panneau-id');
    const salon = interaction.options.getChannel('salon');

    // Vérifier si le panneau existe
    const panel = getButtonReactPanel(interaction.guild.id, panelId);
    if (!panel) {
        return await interaction.reply({
            embeds: [createErrorEmbed('Panneau introuvable. Vérifiez l\'ID du panneau.')],
            flags: 64 // MessageFlags.Ephemeral
        });
    }

    // Vérifier s'il y a des boutons
    if (panel.buttons.length === 0) {
        return await interaction.reply({
            embeds: [createErrorEmbed('Ce panneau n\'a aucun bouton. Ajoutez des boutons avant de le publier.')],
            flags: 64 // MessageFlags.Ephemeral
        });
    }

    // Utiliser le salon spécifié ou celui configuré dans le panneau
    const targetChannel = salon || interaction.guild.channels.cache.get(panel.channelId);
    if (!targetChannel) {
        return await interaction.reply({
            embeds: [createErrorEmbed('Salon introuvable.')],
            flags: 64 // MessageFlags.Ephemeral
        });
    }

    // Vérifier les permissions du bot dans le salon
    const botPermissions = targetChannel.permissionsFor(interaction.guild.members.me);
    if (!botPermissions.has(['SendMessages', 'EmbedLinks'])) {
        return await interaction.reply({
            embeds: [createErrorEmbed('Je n\'ai pas les permissions pour envoyer des messages dans ce salon.')],
            flags: 64 // MessageFlags.Ephemeral
        });
    }

    try {
        // Créer l'embed et les boutons
        const embed = createButtonReactEmbed(panel);
        const buttons = createButtonReactButtons(panel.buttons);

        // Envoyer le message
        const message = await targetChannel.send({
            embeds: [embed],
            components: buttons
        });

        // Mettre à jour le panneau avec l'ID du message
        panel.messageId = message.id;
        panel.publishedAt = new Date().toISOString();
        addButtonReactPanel(interaction.guild.id, panelId, panel);

        const successEmbed = createSuccessEmbed(
            `Panneau publié avec succès dans ${targetChannel} !\n\n` +
            `**ID du message:** \`${message.id}\`\n` +
            `**Nombre de boutons:** ${panel.buttons.length}`
        );

        await interaction.reply({ embeds: [successEmbed], flags: 64 // MessageFlags.Ephemeral });

    } catch (error) {
        console.error('Erreur lors de la publication du panneau:', error);
        await interaction.reply({
            embeds: [createErrorEmbed('Erreur lors de la publication du panneau.')],
            flags: 64 // MessageFlags.Ephemeral
        });
    }
}

async function handleListPanels(interaction) {
    const panels = getAllButtonReactPanels(interaction.guild.id);
    const panelEntries = Object.entries(panels);

    if (panelEntries.length === 0) {
        return await interaction.reply({
            embeds: [createInfoEmbed('Aucun panneau de rôles configuré sur ce serveur.')],
            flags: 64 // MessageFlags.Ephemeral
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('📋 Panneaux de Rôles')
        .setColor('#3498db')
        .setTimestamp();

    let description = '';
    for (const [panelId, panel] of panelEntries.slice(0, 10)) {
        const status = panel.messageId ? '✅ Publié' : '⏳ En attente';
        const channel = interaction.guild.channels.cache.get(panel.channelId);
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

    await interaction.reply({ embeds: [embed], flags: 64 // MessageFlags.Ephemeral });
}

async function handleDeletePanel(interaction) {
    const panelId = interaction.options.getString('panneau-id');

    // Vérifier si le panneau existe
    const panel = getButtonReactPanel(interaction.guild.id, panelId);
    if (!panel) {
        return await interaction.reply({
            embeds: [createErrorEmbed('Panneau introuvable. Vérifiez l\'ID du panneau.')],
            flags: 64 // MessageFlags.Ephemeral
        });
    }

    // Supprimer le panneau
    removeButtonReactPanel(interaction.guild.id, panelId);

    const successEmbed = createSuccessEmbed(
        `Panneau **${panel.title}** supprimé avec succès !\n\n` +
        `⚠️ **Note:** Le message publié dans le salon n'a pas été supprimé automatiquement.`
    );

    await interaction.reply({ embeds: [successEmbed], flags: 64 // MessageFlags.Ephemeral });
}

async function handlePreviewPanel(interaction) {
    const panelId = interaction.options.getString('panneau-id');

    // Vérifier si le panneau existe
    const panel = getButtonReactPanel(interaction.guild.id, panelId);
    if (!panel) {
        return await interaction.reply({
            embeds: [createErrorEmbed('Panneau introuvable. Vérifiez l\'ID du panneau.')],
            flags: 64 // MessageFlags.Ephemeral
        });
    }

    if (panel.buttons.length === 0) {
        return await interaction.reply({
            embeds: [createErrorEmbed('Ce panneau n\'a aucun bouton configuré.')],
            flags: 64 // MessageFlags.Ephemeral
        });
    }

    try {
        // Créer l'embed et les boutons pour l'aperçu
        const embed = createButtonReactEmbed(panel);
        const buttons = createButtonReactButtons(panel.buttons);

        // Ajouter des informations sur le panneau
        embed.addFields(
            { name: '📊 Informations', value: `**ID:** \`${panelId}\`\n**Boutons:** ${panel.buttons.length}`, inline: true },
            { name: '📝 Rôles configurés', value: formatRolesList(panel.buttons, interaction.guild), inline: false }
        );

        await interaction.reply({
            content: '👀 **Aperçu du panneau:**',
            embeds: [embed],
            components: buttons,
            flags: 64 // MessageFlags.Ephemeral
        });

    } catch (error) {
        console.error('Erreur lors de l\'aperçu du panneau:', error);
        await interaction.reply({
            embeds: [createErrorEmbed('Erreur lors de la génération de l\'aperçu.')],
            flags: 64 // MessageFlags.Ephemeral
        });
    }
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



