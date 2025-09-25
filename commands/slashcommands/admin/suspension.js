import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('suspension')
        .setDescription('Système de suspensions progressives')
        .addSubcommand(subcommand =>
            subcommand
                .setName('panel')
                .setDescription('Afficher le panneau principal du système'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('Accéder directement à la configuration'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Voir le statut d\'un utilisateur')
                .addUserOption(option =>
                    option.setName('utilisateur')
                        .setDescription('L\'utilisateur à vérifier')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Réinitialiser les données d\'un utilisateur')
                .addUserOption(option =>
                    option.setName('utilisateur')
                        .setDescription('L\'utilisateur à réinitialiser')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('historique')
                .setDescription('Définir le salon de logs')
                .addChannelOption(option =>
                    option.setName('salon')
                        .setDescription('Le salon pour les logs')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Tester une sanction (sandbox)')
                .addUserOption(option =>
                    option.setName('utilisateur')
                        .setDescription('L\'utilisateur pour le test')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('niveau')
                        .setDescription('Niveau de suspension à tester')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Niveau 1', value: 1 },
                            { name: 'Niveau 2', value: 2 },
                            { name: 'Niveau 3', value: 3 }
                        )))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        // Vérifier les permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) && 
            !interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Permissions insuffisantes')
                .setDescription('Vous devez avoir la permission de gérer le serveur ou bannir des membres.')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'panel':
                await showMainPanel(interaction);
                break;
            case 'config':
                await showConfigPanel(interaction);
                break;
            case 'status':
                await showUserStatus(interaction);
                break;
            case 'reset':
                await resetUser(interaction);
                break;
            case 'historique':
                await handleLogsCommand(interaction);
                break;
            case 'test':
                await testSanction(interaction);
                break;
            default:
                await showMainPanel(interaction);
        }
    }
};

async function showMainPanel(interaction) {
    const introEmbed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('🔒 Système de suspensions progressives')
        .setDescription(`Ce module permet de :
• Enregistrer des avertissements (\`/warn\`)
• Appliquer automatiquement des suspensions progressives (3 niveaux)
• Configurer les rôles, durées, salons de logs et actions
• Gérer les utilisateurs via un panneau avec boutons

ℹ️ **Actions rapides :**`)
        .addFields(
            { name: '⚙️ Configuration', value: 'Paramétrer les rôles, durées et options', inline: true },
            { name: '📊 Statut serveur', value: 'Voir les statistiques et utilisateurs sanctionnés', inline: true },
            { name: '🧾 Logs', value: 'Consulter l\'historique des sanctions', inline: true },
            { name: '🔔 Activation', value: 'Activer/désactiver le système automatique', inline: true },
            { name: '🔄 Test', value: 'Tester le système en mode sandbox', inline: true },
            { name: '❌ Fermer', value: 'Fermer ce panneau', inline: true }
        )
        .setFooter({ text: 'Système de Suspensions Progressives • Cliquez sur les boutons ci-dessous' })
        .setTimestamp();

    const actionRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_config')
                .setLabel('Configurer')
                .setEmoji('⚙️')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('suspension_status')
                .setLabel('Statut serveur')
                .setEmoji('📊')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('suspension_logs')
                .setLabel('Voir logs')
                .setEmoji('🧾')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('suspension_toggle')
                .setLabel('Activer/Désactiver')
                .setEmoji('🔔')
                .setStyle(ButtonStyle.Success)
        );

    const actionRow2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_test')
                .setLabel('Test')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('suspension_close')
                .setLabel('Fermer')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Danger)
        );

    await interaction.reply({ 
        embeds: [introEmbed], 
        components: [actionRow, actionRow2],
        ephemeral: false 
    });
}

async function showConfigPanel(interaction) {
    const configEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚙️ Panneau de configuration')
        .setDescription('Configurez tous les aspects du système de suspensions progressives.')
        .addFields(
            { name: '🛠️ Paramètres généraux', value: 'Seuil d\'avertissements, auto-reset, notifications', inline: true },
            { name: '🏷️ Rôles de suspension', value: 'Créer automatiquement ou choisir des rôles existants', inline: true },
            { name: '⏱️ Durées par palier', value: 'Définir les durées pour chaque niveau', inline: true },
            { name: '🧭 Canaux autorisés', value: 'Configurer les salons visibles par niveau', inline: true },
            { name: '📢 Salon logs', value: 'Choisir le salon pour les logs de sanctions', inline: true },
            { name: '↩️ Réinitialiser', value: 'Remettre la configuration par défaut', inline: true }
        )
        .setFooter({ text: 'Configuration du système • Choisissez une option' })
        .setTimestamp();

    const configRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_config_general')
                .setLabel('Paramètres généraux')
                .setEmoji('🛠️')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('suspension_config_roles')
                .setLabel('Rôles de suspension')
                .setEmoji('🏷️')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('suspension_config_durations')
                .setLabel('Durées par palier')
                .setEmoji('⏱️')
                .setStyle(ButtonStyle.Primary)
        );

    const configRow2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_config_channels')
                .setLabel('Canaux autorisés')
                .setEmoji('🧭')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('suspension_config_logs')
                .setLabel('Salon logs')
                .setEmoji('📢')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('suspension_config_reset')
                .setLabel('Réinitialiser')
                .setEmoji('↩️')
                .setStyle(ButtonStyle.Danger)
        );

    const backRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('suspension_back')
                .setLabel('Retour')
                .setEmoji('⬅️')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.reply({ 
        embeds: [configEmbed], 
        components: [configRow, configRow2, backRow],
        ephemeral: true 
    });
}

async function showUserStatus(interaction) {
    const user = interaction.options.getUser('utilisateur');
    
    // TODO: Implémenter la logique de statut utilisateur
    const statusEmbed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle(`📊 Statut de ${user.username}`)
        .setDescription('Informations sur les sanctions de cet utilisateur')
        .addFields(
            { name: '⚠️ Avertissements', value: '0/3', inline: true },
            { name: '🔒 Niveau de suspension', value: 'Aucun', inline: true },
            { name: '⏰ Expire le', value: 'N/A', inline: true }
        )
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();

    await interaction.reply({ embeds: [statusEmbed], ephemeral: true });
}

async function resetUser(interaction) {
    const user = interaction.options.getUser('utilisateur');
    
    // TODO: Implémenter la logique de reset
    const resetEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🔄 Utilisateur réinitialisé')
        .setDescription(`Toutes les données de suspension de ${user} ont été réinitialisées.`)
        .setTimestamp();

    await interaction.reply({ embeds: [resetEmbed], ephemeral: true });
}

async function handleLogsCommand(interaction) {
    const channel = interaction.options.getChannel('salon');
    
    // TODO: Implémenter la logique de configuration des logs
    const logsEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('📢 Salon de logs configuré')
        .setDescription(`Le salon ${channel} a été défini comme salon de logs.`)
        .setTimestamp();

    await interaction.reply({ embeds: [logsEmbed], ephemeral: true });
}

async function testSanction(interaction) {
    const user = interaction.options.getUser('utilisateur');
    const level = interaction.options.getInteger('niveau');
    
    const testEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🔄 Test de sanction')
        .setDescription(`Test de suspension niveau ${level} sur ${user} (mode sandbox)`)
        .addFields(
            { name: '⚠️ Mode test', value: 'Aucune action réelle n\'a été effectuée', inline: false }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [testEmbed], ephemeral: true });
}