import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, '../../../../json/linkModeration.json');

// Fonction pour créer un embed d'erreur
function createErrorEmbed(title, description) {
    return new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle(`❌ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

// Fonction pour charger la configuration
function loadConfig() {
    try {
        if (!fs.existsSync(configPath)) {
            fs.writeFileSync(configPath, '{}');
            return {};
        }
        const data = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('[LINK-MOD] Erreur lors du chargement de la configuration:', error);
        return {};
    }
}

// Fonction pour formater la durée
function formatDuration(duration) {
    if (!duration) return 'Désactivé';
    if (duration.includes('h')) return duration.replace('h', ' heure(s)');
    if (duration.includes('d')) return duration.replace('d', ' jour(s)');
    if (duration.includes('m')) return duration.replace('m', ' minute(s)');
    return duration;
}

// Fonction pour créer l'embed de configuration
function createConfigEmbed(guildConfig, guild) {
    const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('⚙️ Configuration de la modération des liens')
        .setDescription('Utilisez les boutons ci-dessous pour modifier les paramètres.')
        .setThumbnail(guild.iconURL())
        .setTimestamp();

    // Salon de logs
    const logChannel = guildConfig.log_channel_id ? `<#${guildConfig.log_channel_id}>` : '❌ Non configuré';
    
    // Actions automatiques
    const autoDelete = guildConfig.auto_delete ? '✅ Activé' : '❌ Désactivé';
    const autoKick = formatDuration(guildConfig.auto_kick);
    const autoBan = formatDuration(guildConfig.auto_ban);
    const notifyUser = guildConfig.notify_user ? '✅ Activé' : '❌ Désactivé';

    // Listes
    const whitelistRoles = guildConfig.whitelist_roles?.length || 0;
    const whitelistChannels = guildConfig.whitelist_channels?.length || 0;
    const whitelistDomains = guildConfig.whitelist_domains?.length || 0;
    const blacklistUsers = guildConfig.blacklist_users?.length || 0;

    embed.addFields(
        { name: '📊 Salon de logs', value: logChannel, inline: true },
        { name: '🗑️ Suppression auto', value: autoDelete, inline: true },
        { name: '📢 Notifier l\'utilisateur', value: notifyUser, inline: true },
        { name: '🦵 Kick automatique', value: autoKick, inline: true },
        { name: '🔨 Ban automatique', value: autoBan, inline: true },
        { name: '⏳ Punitions temporaires', value: `${guildConfig.temp_punishments?.length || 0} active(s)`, inline: true },
        { name: '✅ Whitelist', value: `${whitelistRoles} rôles\n${whitelistChannels} salons\n${whitelistDomains} domaines`, inline: true },
        { name: '🚫 Blacklist', value: `${blacklistUsers} utilisateurs`, inline: true },
        { name: '📋 Statut', value: guildConfig.log_channel_id ? '🟢 Actif' : '🔴 Inactif', inline: true }
    );

    return embed;
}

export const name = 'rs-config';
export const description = 'Ouvre le panneau de configuration de la modération des liens';
export const usage = '!rs-config';
export const category = 'admin';
export const permissions = ['ManageGuild'];

export async function execute(message, args) {
    try {
        // Vérifier les permissions
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply({ 
                embeds: [createErrorEmbed('Permissions insuffisantes', 'Vous devez avoir la permission `Gérer le serveur` pour utiliser cette commande.')] 
            });
        }

        const guildId = message.guild.id;
        const config = loadConfig();

        // Initialiser la configuration si elle n'existe pas
        if (!config[guildId]) {
            const noConfigEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Configuration manquante')
                .setDescription('Vous devez d\'abord configurer un salon de logs avec `!rs-set`.')
                .addFields(
                    { name: '🔧 Première étape', value: 'Utilisez `!rs-set #salon` pour définir le salon de logs', inline: false },
                    { name: '📋 Exemple', value: '`!rs-set #logs-moderation`', inline: false }
                )
                .setTimestamp();

            return message.reply({ embeds: [noConfigEmbed] });
        }

        const guildConfig = config[guildId];
        const embed = createConfigEmbed(guildConfig, message.guild);

        // Créer les boutons de configuration
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`linkmod_change_channel_${guildId}`)
                    .setLabel('Changer salon')
                    .setEmoji('📊')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`linkmod_remove_channel_${guildId}`)
                    .setLabel('Supprimer salon')
                    .setEmoji('🗑️')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`linkmod_toggle_delete_${guildId}`)
                    .setLabel('Suppression auto')
                    .setEmoji('🔄')
                    .setStyle(guildConfig.auto_delete ? ButtonStyle.Success : ButtonStyle.Secondary)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`linkmod_toggle_notify_${guildId}`)
                    .setLabel('Notifier utilisateur')
                    .setEmoji('📢')
                    .setStyle(guildConfig.notify_user ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`linkmod_config_kick_${guildId}`)
                    .setLabel('Config Kick')
                    .setEmoji('🦵')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`linkmod_config_ban_${guildId}`)
                    .setLabel('Config Ban')
                    .setEmoji('🔨')
                    .setStyle(ButtonStyle.Primary)
            );

        const row3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`linkmod_whitelist_${guildId}`)
                    .setLabel('Whitelist')
                    .setEmoji('✅')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`linkmod_blacklist_${guildId}`)
                    .setLabel('Blacklist')
                    .setEmoji('🚫')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`linkmod_temp_punishments_${guildId}`)
                    .setLabel('Punitions temporaires')
                    .setEmoji('⏳')
                    .setStyle(ButtonStyle.Secondary)
            );

        const row4 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`linkmod_refresh_${guildId}`)
                    .setLabel('Actualiser')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary)
            );

        await message.reply({ 
            embeds: [embed], 
            components: [row1, row2, row3, row4]
        });

    } catch (error) {
        console.error('[LINK-MOD] Erreur dans rs-config (prefix):', error);
        
        return message.reply({ 
            embeds: [createErrorEmbed('Erreur', 'Une erreur est survenue lors de l\'affichage de la configuration. Veuillez réessayer.')] 
        });
    }
}