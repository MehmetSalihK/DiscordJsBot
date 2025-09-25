import { StringSelectMenuBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInfoEmbed, createErrorEmbed, createSuccessEmbed } from '../utils/embeds.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const socialsPath = path.join(__dirname, '../../json/socials.json');

// Configuration des réseaux supportés
const supportedNetworks = {
    twitter: { name: 'Twitter', emoji: '🐦', baseUrl: 'https://twitter.com/' },
    instagram: { name: 'Instagram', emoji: '📸', baseUrl: 'https://instagram.com/' },
    github: { name: 'GitHub', emoji: '💻', baseUrl: 'https://github.com/' },
    twitch: { name: 'Twitch', emoji: '🎮', baseUrl: 'https://twitch.tv/' },
    youtube: { name: 'YouTube', emoji: '📺', baseUrl: 'https://youtube.com/@' },
    tiktok: { name: 'TikTok', emoji: '🎵', baseUrl: 'https://tiktok.com/@' },
    discord: { name: 'Discord', emoji: '💬', baseUrl: 'https://discord.com/users/' },
    linkedin: { name: 'LinkedIn', emoji: '💼', baseUrl: 'https://linkedin.com/in/' }
};

export async function handleSocialButtonInteraction(interaction) {
    const userId = interaction.user.id;
    const action = interaction.customId.split('_')[1]; // social_add -> add
    
    // Lire les données existantes
    let socialsData = {};
    try {
        const data = fs.readFileSync(socialsPath, 'utf8');
        socialsData = JSON.parse(data);
    } catch (error) {
        // Fichier n'existe pas encore
    }
    
    const userSocials = socialsData[userId] || {};
    const configuredNetworks = Object.keys(userSocials);
    
    switch (action) {
        case 'add':
            await handleAddButtonClick(interaction);
            break;
        case 'remove':
            await handleRemoveButtonClick(interaction, configuredNetworks);
            break;
        case 'edit':
            await handleEditButtonClick(interaction, configuredNetworks);
            break;
        case 'privacy':
            await handlePrivacyButtonClick(interaction, configuredNetworks, userSocials);
            break;
    }
}

async function handleAddButtonClick(interaction) {
    const embed = createInfoEmbed(
        '➕ Ajouter un réseau social',
        'Pour ajouter un nouveau réseau social, utilisez la commande :\n\n' +
            '`/social add réseau:[réseau] identifiant:[votre_nom] lien:[optionnel]`\n\n' +
            '**Réseaux disponibles :**\n' +
            Object.entries(supportedNetworks).map(([key, network]) => 
                `${network.emoji} **${network.name}**`
            ).join('\n'),
        { footer: 'Exemple: /social add réseau:twitter identifiant:monnom' }
    ).setColor('#27ae60');
    
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleRemoveButtonClick(interaction, configuredNetworks) {
    if (configuredNetworks.length === 0) {
        const embed = createErrorEmbed('Aucun réseau configuré', 'Vous n\'avez aucun réseau social configuré à supprimer.');
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        return;
    }
    
    // Créer le menu select pour choisir le réseau à supprimer
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('social_select_remove')
        .setPlaceholder('Choisissez un réseau à supprimer')
        .addOptions(
            configuredNetworks.map(network => ({
                label: supportedNetworks[network]?.name || network,
                value: network,
                emoji: supportedNetworks[network]?.emoji || '🌐',
                description: `Supprimer votre profil ${supportedNetworks[network]?.name || network}`
            }))
        );
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    const embed = createInfoEmbed(
        '🗑️ Supprimer un réseau social',
        'Sélectionnez le réseau social que vous souhaitez supprimer :'
    ).setColor('#e74c3c');
    
    await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
}

async function handleEditButtonClick(interaction, configuredNetworks) {
    if (configuredNetworks.length === 0) {
        const embed = createErrorEmbed('Aucun réseau configuré', 'Vous n\'avez aucun réseau social configuré à modifier.');
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        return;
    }
    
    // Créer le menu select pour choisir le réseau à modifier
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('social_select_edit')
        .setPlaceholder('Choisissez un réseau à modifier')
        .addOptions(
            configuredNetworks.map(network => ({
                label: supportedNetworks[network]?.name || network,
                value: network,
                emoji: supportedNetworks[network]?.emoji || '🌐',
                description: `Modifier votre profil ${supportedNetworks[network]?.name || network}`
            }))
        );
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    const embed = createInfoEmbed(
        '✏️ Modifier un réseau social',
        'Sélectionnez le réseau social que vous souhaitez modifier :'
    ).setColor('#3498db');
    
    await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
}

async function handlePrivacyButtonClick(interaction, configuredNetworks, userSocials) {
    if (configuredNetworks.length === 0) {
        const embed = createErrorEmbed('Aucun réseau configuré', 'Vous n\'avez aucun réseau social configuré.');
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        return;
    }
    
    // Créer le menu select pour choisir le réseau dont modifier la confidentialité
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('social_select_privacy')
        .setPlaceholder('Choisissez un réseau pour modifier sa confidentialité')
        .addOptions(
            configuredNetworks.map(network => {
                const currentPrivacy = userSocials[network]?.privacy || 'public';
                const privacyEmoji = currentPrivacy === 'public' ? '🌍' : '🔒';
                return {
                    label: supportedNetworks[network]?.name || network,
                    value: network,
                    emoji: supportedNetworks[network]?.emoji || '🌐',
                    description: `${privacyEmoji} Actuellement ${currentPrivacy === 'public' ? 'Public' : 'Privé'}`
                };
            })
        );
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    const embed = createInfoEmbed(
        '👁️ Modifier la confidentialité',
        'Sélectionnez le réseau social dont vous souhaitez modifier la confidentialité :\n\n' +
            '🌍 **Public** : Visible par tous\n' +
            '🔒 **Privé** : Visible uniquement par vous'
    ).setColor('#9b59b6');
    
    await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
}

export async function handleSocialSelectInteraction(interaction) {
    const action = interaction.customId.split('_')[2]; // social_select_remove -> remove
    const selectedNetwork = interaction.values[0];
    const userId = interaction.user.id;
    
    switch (action) {
        case 'remove':
            await handleNetworkRemoval(interaction, userId, selectedNetwork);
            break;
        case 'edit':
            await handleNetworkEdit(interaction, userId, selectedNetwork);
            break;
        case 'privacy':
            await handleNetworkPrivacyToggle(interaction, userId, selectedNetwork);
            break;
    }
}

async function handleNetworkRemoval(interaction, userId, network) {
    // Lire les données
    let socialsData = {};
    try {
        const data = fs.readFileSync(socialsPath, 'utf8');
        socialsData = JSON.parse(data);
    } catch (error) {
        socialsData = {};
    }
    
    if (!socialsData[userId] || !socialsData[userId][network]) {
        const embed = createErrorEmbed('Réseau non trouvé', 'Ce réseau social n\'est pas configuré.');
        await interaction.update({ embeds: [embed], components: [] });
        return;
    }
    
    // Supprimer le réseau
    delete socialsData[userId][network];
    
    // Si l'utilisateur n'a plus de réseaux, supprimer son entrée
    if (Object.keys(socialsData[userId]).length === 0) {
        delete socialsData[userId];
    }
    
    // Sauvegarder
    fs.writeFileSync(socialsPath, JSON.stringify(socialsData, null, 2));
    
    // Log console
    console.log(`[SOCIAL] Suppression : ${interaction.user.username} → ${supportedNetworks[network]?.name || network}`);
    
    const embed = createSuccessEmbed(
        'Réseau supprimé',
        `Votre profil **${supportedNetworks[network]?.name || network}** a été supprimé avec succès.`
    );
    
    await interaction.update({ embeds: [embed], components: [] });
}

async function handleNetworkEdit(interaction, userId, network) {
    // Lire les données actuelles
    let socialsData = {};
    try {
        const data = fs.readFileSync(socialsPath, 'utf8');
        socialsData = JSON.parse(data);
    } catch (error) {
        socialsData = {};
    }
    
    const currentData = socialsData[userId]?.[network] || {};
    
    // Créer le modal pour modifier les informations
    const modal = new ModalBuilder()
        .setCustomId(`social_modal_edit_${network}`)
        .setTitle(`Modifier ${supportedNetworks[network]?.name || network}`);
    
    const usernameInput = new TextInputBuilder()
        .setCustomId('username')
        .setLabel('Nom d\'utilisateur (sans @)')
        .setStyle(TextInputStyle.Short)
        .setValue(currentData.username || '')
        .setRequired(true)
        .setMaxLength(50);
    
    const linkInput = new TextInputBuilder()
        .setCustomId('link')
        .setLabel('Lien direct (optionnel)')
        .setStyle(TextInputStyle.Short)
        .setValue(currentData.link === 'non défini' ? '' : currentData.link || '')
        .setRequired(false)
        .setMaxLength(200);
    
    const firstRow = new ActionRowBuilder().addComponents(usernameInput);
    const secondRow = new ActionRowBuilder().addComponents(linkInput);
    
    modal.addComponents(firstRow, secondRow);
    
    await interaction.showModal(modal);
}

async function handleNetworkPrivacyToggle(interaction, userId, network) {
    // Lire les données
    let socialsData = {};
    try {
        const data = fs.readFileSync(socialsPath, 'utf8');
        socialsData = JSON.parse(data);
    } catch (error) {
        socialsData = {};
    }
    
    if (!socialsData[userId] || !socialsData[userId][network]) {
        const embed = createErrorEmbed('Réseau non trouvé', 'Ce réseau social n\'est pas configuré.');
        await interaction.update({ embeds: [embed], components: [] });
        return;
    }
    
    // Toggle la confidentialité
    const currentPrivacy = socialsData[userId][network].privacy || 'public';
    const newPrivacy = currentPrivacy === 'public' ? 'private' : 'public';
    
    socialsData[userId][network].privacy = newPrivacy;
    
    // Sauvegarder
    fs.writeFileSync(socialsPath, JSON.stringify(socialsData, null, 2));
    
    // Log console
    console.log(`[SOCIAL] Privacy changé : ${supportedNetworks[network]?.name || network} → ${newPrivacy === 'public' ? 'Public' : 'Privé'}`);
    
    const privacyEmoji = newPrivacy === 'public' ? '🌍' : '🔒';
    const privacyText = newPrivacy === 'public' ? 'Public' : 'Privé';
    
    const embed = createSuccessEmbed(
        'Confidentialité modifiée',
        `${privacyEmoji} Votre profil **${supportedNetworks[network]?.name || network}** est maintenant **${privacyText}**.`
    );
    
    await interaction.update({ embeds: [embed], components: [] });
}

export async function handleSocialModalInteraction(interaction) {
    const modalParts = interaction.customId.split('_'); // social_modal_edit_twitter
    const action = modalParts[2]; // edit
    const network = modalParts[3]; // twitter
    const userId = interaction.user.id;
    
    if (action === 'edit') {
        await handleModalEdit(interaction, userId, network);
    }
}

async function handleModalEdit(interaction, userId, network) {
    const username = interaction.fields.getTextInputValue('username');
    const customLink = interaction.fields.getTextInputValue('link') || null;
    
    // Lire les données existantes
    let socialsData = {};
    try {
        const data = fs.readFileSync(socialsPath, 'utf8');
        socialsData = JSON.parse(data);
    } catch (error) {
        socialsData = {};
    }
    
    // Initialiser l'utilisateur s'il n'existe pas
    if (!socialsData[userId]) {
        socialsData[userId] = {};
    }
    
    // Conserver la confidentialité existante
    const existingPrivacy = socialsData[userId][network]?.privacy || 'public';
    
    // Générer le lien automatique ou utiliser le lien personnalisé
    const networkInfo = supportedNetworks[network];
    let finalLink = 'non défini';
    
    if (customLink && customLink.trim()) {
        finalLink = customLink.trim();
    } else if (networkInfo) {
        finalLink = networkInfo.baseUrl + username;
    }
    
    // Sauvegarder les nouvelles données
    socialsData[userId][network] = {
        username: username,
        link: finalLink,
        privacy: existingPrivacy
    };
    
    // Écrire dans le fichier
    fs.writeFileSync(socialsPath, JSON.stringify(socialsData, null, 2));
    
    // Log console
    console.log(`[SOCIAL] Modification : ${interaction.user.username} → ${supportedNetworks[network]?.name || network} (@${username})`);
    
    const embed = createSuccessEmbed(
        'Réseau modifié',
        `${networkInfo?.emoji || '🌐'} Votre profil **${networkInfo?.name || network}** a été modifié avec succès !\n\n` +
        `**Nom d'utilisateur :** @${username}\n` +
        `**Lien :** ${finalLink}\n` +
        `**Confidentialité :** ${existingPrivacy === 'public' ? '🌍 Public' : '🔒 Privé'}`
    );
    
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
