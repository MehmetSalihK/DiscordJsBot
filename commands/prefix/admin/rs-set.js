import { EmbedBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
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

// Fonction pour sauvegarder la configuration
function saveConfig(config) {
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        console.error('[LINK-MOD] Erreur lors de la sauvegarde de la configuration:', error);
        return false;
    }
}

export const name = 'rs-set';
export const description = 'Configure le salon de logs pour la modération des liens';
export const usage = '!rs-set #salon';
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

        // Vérifier qu'un salon a été mentionné
        const channel = message.mentions.channels.first();
        if (!channel) {
            const helpEmbed = new EmbedBuilder()
                .setColor('#0099FF')
                .setTitle('🔧 Configuration du salon de logs')
                .setDescription('Cette commande configure le salon où seront envoyés les logs de modération des liens.')
                .addFields(
                    { name: '📝 Usage', value: '`!rs-set #salon`', inline: false },
                    { name: '📋 Exemple', value: '`!rs-set #logs-moderation`', inline: false },
                    { name: '⚠️ Permissions requises', value: 'Gérer le serveur', inline: false }
                )
                .setTimestamp();

            return message.reply({ embeds: [helpEmbed] });
        }

        // Vérifier que c'est un salon textuel
        if (channel.type !== ChannelType.GuildText) {
            return message.reply({ 
                embeds: [createErrorEmbed('Type de salon invalide', 'Vous devez mentionner un salon textuel.')] 
            });
        }

        const guildId = message.guild.id;

        // Vérifier les permissions du bot dans le salon
        const botPermissions = channel.permissionsFor(message.guild.members.me);
        if (!botPermissions.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
            return message.reply({ 
                embeds: [createErrorEmbed('Permissions insuffisantes', `Je n'ai pas les permissions nécessaires dans ${channel}.\n\n**Permissions requises :**\n• Envoyer des messages\n• Intégrer des liens`)] 
            });
        }

        // Charger la configuration
        const config = loadConfig();

        // Initialiser la configuration du serveur si elle n'existe pas
        if (!config[guildId]) {
            config[guildId] = {
                log_channel_id: null,
                auto_delete: false,
                auto_kick: null,
                auto_ban: null,
                notify_user: true,
                whitelist_roles: [],
                whitelist_channels: [],
                whitelist_domains: ["youtube.com", "youtu.be", "discord.gg", "discord.com"],
                blacklist_users: [],
                temp_punishments: []
            };
        }

        // Mettre à jour le salon de logs
        config[guildId].log_channel_id = channel.id;

        // Sauvegarder la configuration
        if (!saveConfig(config)) {
            return message.reply({ 
                embeds: [createErrorEmbed('Erreur de sauvegarde', 'Impossible de sauvegarder la configuration. Veuillez réessayer.')] 
            });
        }

        // Confirmation
        const successEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Configuration mise à jour')
            .setDescription(`Le salon de logs a été configuré sur ${channel}.\n\n**Prochaines étapes :**\n• Utilisez \`!rs-config\` pour configurer les paramètres de modération\n• Les liens détectés seront maintenant loggés dans ce salon`)
            .addFields(
                { name: '📊 Salon de logs', value: `${channel}`, inline: true },
                { name: '🔧 Configuration', value: 'Utilisez `!rs-config`', inline: true }
            )
            .setTimestamp();

        await message.reply({ embeds: [successEmbed] });

        // Envoyer un message de test dans le salon de logs
        const testEmbed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('🔍 Système de modération des liens activé')
            .setDescription('Ce salon a été configuré pour recevoir les logs de modération des liens.')
            .addFields(
                { name: '⚙️ Configuration', value: 'Utilisez `!rs-config` pour personnaliser les paramètres', inline: false },
                { name: '📋 Fonctionnalités', value: '• Détection automatique des liens\n• Actions de modération\n• Whitelist/Blacklist\n• Punitions temporaires', inline: false }
            )
            .setFooter({ text: `Configuré par ${message.author.displayName}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        await channel.send({ embeds: [testEmbed] });

    } catch (error) {
        console.error('[LINK-MOD] Erreur dans rs-set (prefix):', error);
        
        return message.reply({ 
            embeds: [createErrorEmbed('Erreur', 'Une erreur est survenue lors de la configuration. Veuillez réessayer.')] 
        });
    }
}