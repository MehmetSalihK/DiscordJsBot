import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Emojis, createInfoEmbed, createErrorEmbed, createSuccessEmbed } from '../../../src/utils/embeds.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const socialsPath = path.join(__dirname, '../../../json/socials.json');

// Fonction pour lire les données sociales
function readSocialsData() {
    try {
        if (!fs.existsSync(socialsPath)) {
            fs.writeFileSync(socialsPath, '{}');
            return {};
        }
        const data = fs.readFileSync(socialsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('[SOCIAL] Erreur lors de la lecture:', error);
        return {};
    }
}

// Fonction pour sauvegarder les données sociales
function saveSocialsData(data) {
    try {
        fs.writeFileSync(socialsPath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('[SOCIAL] Erreur lors de la sauvegarde:', error);
        return false;
    }
}

// Configuration des réseaux sociaux supportés
const supportedNetworks = {
    twitter: { emoji: '🐦', name: 'Twitter', baseUrl: 'https://twitter.com/' },
    instagram: { emoji: '📸', name: 'Instagram', baseUrl: 'https://instagram.com/' },
    github: { emoji: '💻', name: 'GitHub', baseUrl: 'https://github.com/' },
    twitch: { emoji: '🎮', name: 'Twitch', baseUrl: 'https://twitch.tv/' },
    youtube: { emoji: '📺', name: 'YouTube', baseUrl: 'https://youtube.com/@' },
    tiktok: { emoji: '🎵', name: 'TikTok', baseUrl: 'https://tiktok.com/@' },
    discord: { emoji: '💬', name: 'Discord', baseUrl: '' },
    linkedin: { emoji: '💼', name: 'LinkedIn', baseUrl: 'https://linkedin.com/in/' }
};

export default {
    data: new SlashCommandBuilder()
        .setName('social')
        .setDescription('🌐 Gérer vos profils de réseaux sociaux')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('➕ Ajouter ou modifier un réseau social')
                .addStringOption(option =>
                    option
                        .setName('réseau')
                        .setDescription('Le réseau social à configurer')
                        .setRequired(true)
                        .addChoices(
                            { name: '🐦 Twitter', value: 'twitter' },
                            { name: '📸 Instagram', value: 'instagram' },
                            { name: '💻 GitHub', value: 'github' },
                            { name: '🎮 Twitch', value: 'twitch' },
                            { name: '📺 YouTube', value: 'youtube' },
                            { name: '🎵 TikTok', value: 'tiktok' },
                            { name: '💬 Discord', value: 'discord' },
                            { name: '💼 LinkedIn', value: 'linkedin' }
                        ))
                .addStringOption(option =>
                    option
                        .setName('identifiant')
                        .setDescription('Votre nom d\'utilisateur (sans @)')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('lien')
                        .setDescription('Lien direct vers votre profil (optionnel)')
                        .setRequired(false))
                .addStringOption(option =>
                    option
                        .setName('confidentialité')
                        .setDescription('Visibilité de votre profil')
                        .setRequired(false)
                        .addChoices(
                            { name: '🌍 Public', value: 'public' },
                            { name: '🔒 Privé', value: 'privé' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('🗑️ Supprimer un réseau social')
                .addStringOption(option =>
                    option
                        .setName('réseau')
                        .setDescription('Le réseau social à supprimer')
                        .setRequired(true)
                        .addChoices(
                            { name: '🐦 Twitter', value: 'twitter' },
                            { name: '📸 Instagram', value: 'instagram' },
                            { name: '💻 GitHub', value: 'github' },
                            { name: '🎮 Twitch', value: 'twitch' },
                            { name: '📺 YouTube', value: 'youtube' },
                            { name: '🎵 TikTok', value: 'tiktok' },
                            { name: '💬 Discord', value: 'discord' },
                            { name: '💼 LinkedIn', value: 'linkedin' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('📋 Afficher tous vos réseaux sociaux configurés'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('panel')
                .setDescription('⚙️ Panneau de gestion interactif des réseaux sociaux')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        switch (subcommand) {
            case 'add':
                await handleAddSocial(interaction, userId);
                break;
            case 'remove':
                await handleRemoveSocial(interaction, userId);
                break;
            case 'list':
                await handleListSocials(interaction, userId);
                break;
            case 'panel':
                await handleSocialPanel(interaction, userId);
                break;
        }
    }
};

async function handleAddSocial(interaction, userId) {
    const network = interaction.options.getString('réseau');
    const username = interaction.options.getString('identifiant');
    const customLink = interaction.options.getString('lien');
    const privacy = interaction.options.getString('confidentialité') || 'public';

    // Validation du nom d'utilisateur
    const cleanUsername = username.replace(/^@/, ''); // Supprimer @ si présent
    
    // Générer le lien automatiquement si pas fourni
    let finalLink = customLink;
    if (!customLink && supportedNetworks[network]) {
        if (network === 'discord') {
            finalLink = cleanUsername; // Pour Discord, on garde juste le tag
        } else {
            finalLink = supportedNetworks[network].baseUrl + cleanUsername;
        }
    }

    // Lire les données existantes
    const socialsData = readSocialsData();
    
    // Initialiser l'utilisateur s'il n'existe pas
    if (!socialsData[userId]) {
        socialsData[userId] = {};
    }

    // Vérifier si c'est une mise à jour
    const isUpdate = socialsData[userId][network] !== undefined;

    // Ajouter/mettre à jour le réseau social
    socialsData[userId][network] = {
        username: cleanUsername,
        link: finalLink || 'non défini',
        privacy: privacy
    };

    // Sauvegarder
    if (saveSocialsData(socialsData)) {
        const networkInfo = supportedNetworks[network];
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle(`${Emojis.success} Réseau social ${isUpdate ? 'mis à jour' : 'ajouté'}`)
            .setDescription(`${networkInfo.emoji} **${networkInfo.name}** a été ${isUpdate ? 'mis à jour' : 'configuré'} avec succès !`)
            .addFields(
                { name: '👤 Identifiant', value: `\`${cleanUsername}\``, inline: true },
                { name: '🔗 Lien', value: finalLink === 'non défini' ? '`non défini`' : `[Voir le profil](${finalLink})`, inline: true },
                { name: '🔒 Confidentialité', value: privacy === 'public' ? '🌍 Public' : '🔒 Privé', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

        console.log(`[SOCIAL] ${isUpdate ? 'Mise à jour' : 'Ajout'} - ${interaction.user.tag} (${userId}) : ${network} → ${cleanUsername}`);
        
        await interaction.reply({ embeds: [embed] });
    } else {
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle(`${Emojis.error} Erreur`)
            .setDescription('Une erreur est survenue lors de la sauvegarde. Veuillez réessayer.')
            .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}

async function handleRemoveSocial(interaction, userId) {
    const network = interaction.options.getString('réseau');
    
    // Lire les données existantes
    const socialsData = readSocialsData();
    
    // Vérifier si l'utilisateur et le réseau existent
    if (!socialsData[userId] || !socialsData[userId][network]) {
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle(`${Emojis.error} Profil non trouvé`)
            .setDescription(`Vous n'avez pas configuré de profil **${supportedNetworks[network].name}**.`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    // Supprimer le réseau social
    const removedData = socialsData[userId][network];
    delete socialsData[userId][network];

    // Supprimer l'utilisateur entièrement s'il n'a plus de réseaux
    if (Object.keys(socialsData[userId]).length === 0) {
        delete socialsData[userId];
    }

    // Sauvegarder
    if (saveSocialsData(socialsData)) {
        const networkInfo = supportedNetworks[network];
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle(`${Emojis.success} Réseau social supprimé`)
            .setDescription(`${networkInfo.emoji} Votre profil **${networkInfo.name}** (\`${removedData.username}\`) a été supprimé avec succès.`)
            .setTimestamp()
            .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

        console.log(`[SOCIAL] Suppression - ${interaction.user.tag} (${userId}) : ${network} → ${removedData.username}`);
        
        await interaction.reply({ embeds: [embed] });
    } else {
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle(`${Emojis.error} Erreur`)
            .setDescription('Une erreur est survenue lors de la suppression. Veuillez réessayer.')
            .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}

async function handleListSocials(interaction, userId) {
    const socialsData = readSocialsData();
    const userSocials = socialsData[userId];

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`${Emojis.user} Profils sociaux de ${interaction.user.displayName}`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setTimestamp()
        .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

    if (!userSocials || Object.keys(userSocials).length === 0) {
        embed.setDescription(`${Emojis.warning} Aucun réseau social configuré.\n\nUtilisez \`/social add\` pour ajouter vos profils !`);
        await interaction.reply({ embeds: [embed] });
        return;
    }

    let description = '';
    let configuredCount = 0;

    // Parcourir tous les réseaux supportés
    for (const [networkKey, networkInfo] of Object.entries(supportedNetworks)) {
        if (userSocials[networkKey]) {
            const social = userSocials[networkKey];
            const privacyIcon = social.privacy === 'public' ? '🌍' : '🔒';
            const linkText = social.link === 'non défini' ? 'Aucun lien' : `[Voir le profil](${social.link})`;
            
            description += `${networkInfo.emoji} **${networkInfo.name}** : \`@${social.username}\` ${privacyIcon}\n`;
            if (social.link !== 'non défini') {
                description += `└ ${linkText}\n`;
            }
            description += '\n';
            configuredCount++;
        } else {
            description += `${networkInfo.emoji} **${networkInfo.name}** : \`Aucun\`\n\n`;
        }
    }

    embed.setDescription(description);
    embed.addFields({
        name: '📊 Statistiques',
        value: `**${configuredCount}** réseau${configuredCount > 1 ? 'x' : ''} configuré${configuredCount > 1 ? 's' : ''}`,
        inline: true
    });

    await interaction.reply({ embeds: [embed] });
}

async function handleSocialPanel(interaction, userId) {
    // Lire les données existantes
    let socialsData = {};
    try {
        const data = fs.readFileSync(socialsPath, 'utf8');
        socialsData = JSON.parse(data);
    } catch (error) {
        // Fichier n'existe pas encore ou est vide
    }

    const userSocials = socialsData[userId] || {};
    const configuredNetworks = Object.keys(userSocials);
    const configuredCount = configuredNetworks.length;

    // Créer l'embed du panneau
    const embed = createInfoEmbed(
        '⚙️ Configuration des réseaux sociaux',
        `**Gérez vos profils de réseaux sociaux**\n\n` +
            `🔧 **Ajouter un profil** → Utilisez \`/social add\`\n` +
            `🗑️ **Supprimer un profil** → Cliquez sur le bouton Supprimer\n` +
            `✏️ **Modifier un profil** → Cliquez sur le bouton Modifier\n` +
            `👁️ **Confidentialité** → Basculez entre Public/Privé\n\n` +
            `📊 **Réseaux configurés** : ${configuredCount}`,
        { footer: 'Utilisez les boutons ci-dessous pour gérer vos réseaux' }
    ).setColor('#9b59b6');

    // Créer les boutons
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('social_add')
                .setLabel('Ajouter')
                .setEmoji('➕')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('social_remove')
                .setLabel('Supprimer')
                .setEmoji('🗑️')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(configuredCount === 0),
            new ButtonBuilder()
                .setCustomId('social_edit')
                .setLabel('Modifier')
                .setEmoji('✏️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(configuredCount === 0),
            new ButtonBuilder()
                .setCustomId('social_privacy')
                .setLabel('Confidentialité')
                .setEmoji('👁️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(configuredCount === 0)
        );

    await interaction.reply({ embeds: [embed], components: [row] });
}