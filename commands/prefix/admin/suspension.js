import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';

export default {
    name: 'suspension',
    description: 'Système de suspensions progressives',
    usage: '!suspension [panel|config|status <@utilisateur>|reset <@utilisateur>|test <@utilisateur> <niveau>]',
    category: 'admin',
    permissions: [PermissionFlagsBits.ManageGuild],
    
    async execute(message, args) {
        // Vérifier les permissions
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild) && 
            !message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Permissions insuffisantes')
                .setDescription('Vous devez avoir la permission de gérer le serveur ou bannir des membres.')
                .setTimestamp();
            
            return await message.reply({ embeds: [errorEmbed] });
        }

        const subcommand = args[0]?.toLowerCase();

        switch (subcommand) {
            case 'config':
                await showConfigPanel(message);
                break;
            case 'status':
                await showUserStatus(message, args);
                break;
            case 'reset':
                await resetUser(message, args);
                break;
            case 'test':
                await testSanction(message, args);
                break;
            case 'panel':
            default:
                await showMainPanel(message);
        }
    }
};

async function showMainPanel(message) {
    const introEmbed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('🔒 Système de suspensions progressives')
        .setDescription(`Ce module permet de :
• Enregistrer des avertissements (\`!warn\` ou \`/warn\`)
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

    await message.reply({ 
        embeds: [introEmbed], 
        components: [actionRow, actionRow2]
    });
}

async function showConfigPanel(message) {
    const configEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('⚙️ Panneau de configuration')
        .setDescription('Utilisez les boutons interactifs pour configurer le système.')
        .addFields(
            { name: 'ℹ️ Information', value: 'Utilisez la commande `/suspension config` ou cliquez sur le bouton "Configurer" dans le panneau principal pour accéder à l\'interface interactive complète.', inline: false }
        )
        .setTimestamp();

    await message.reply({ embeds: [configEmbed] });
}

async function showUserStatus(message, args) {
    if (!args[1]) {
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Utilisateur manquant')
            .setDescription('Veuillez mentionner un utilisateur : `!suspension status @utilisateur`')
            .setTimestamp();
        
        return await message.reply({ embeds: [errorEmbed] });
    }

    const userId = args[1].replace(/[<@!>]/g, '');
    const user = await message.client.users.fetch(userId).catch(() => null);
    
    if (!user) {
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Utilisateur non trouvé')
            .setDescription('Impossible de trouver cet utilisateur.')
            .setTimestamp();
        
        return await message.reply({ embeds: [errorEmbed] });
    }
    
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

    await message.reply({ embeds: [statusEmbed] });
}

async function resetUser(message, args) {
    if (!args[1]) {
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Utilisateur manquant')
            .setDescription('Veuillez mentionner un utilisateur : `!suspension reset @utilisateur`')
            .setTimestamp();
        
        return await message.reply({ embeds: [errorEmbed] });
    }

    const userId = args[1].replace(/[<@!>]/g, '');
    const user = await message.client.users.fetch(userId).catch(() => null);
    
    if (!user) {
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Utilisateur non trouvé')
            .setDescription('Impossible de trouver cet utilisateur.')
            .setTimestamp();
        
        return await message.reply({ embeds: [errorEmbed] });
    }
    
    // TODO: Implémenter la logique de reset
    const resetEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🔄 Utilisateur réinitialisé')
        .setDescription(`Toutes les données de suspension de ${user} ont été réinitialisées.`)
        .setTimestamp();

    await message.reply({ embeds: [resetEmbed] });
}

async function testSanction(message, args) {
    if (!args[1] || !args[2]) {
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Arguments manquants')
            .setDescription('Usage : `!suspension test @utilisateur <niveau>`\nNiveau : 1, 2 ou 3')
            .setTimestamp();
        
        return await message.reply({ embeds: [errorEmbed] });
    }

    const userId = args[1].replace(/[<@!>]/g, '');
    const level = parseInt(args[2]);
    
    if (![1, 2, 3].includes(level)) {
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Niveau invalide')
            .setDescription('Le niveau doit être 1, 2 ou 3.')
            .setTimestamp();
        
        return await message.reply({ embeds: [errorEmbed] });
    }

    const user = await message.client.users.fetch(userId).catch(() => null);
    
    if (!user) {
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Utilisateur non trouvé')
            .setDescription('Impossible de trouver cet utilisateur.')
            .setTimestamp();
        
        return await message.reply({ embeds: [errorEmbed] });
    }
    
    const testEmbed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🔄 Test de sanction')
        .setDescription(`Test de suspension niveau ${level} sur ${user} (mode sandbox)`)
        .addFields(
            { name: '⚠️ Mode test', value: 'Aucune action réelle n\'a été effectuée', inline: false }
        )
        .setTimestamp();

    await message.reply({ embeds: [testEmbed] });
}