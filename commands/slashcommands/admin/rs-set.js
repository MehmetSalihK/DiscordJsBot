import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, MessageFlags } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, '../../../../json/linkModeration.json');

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

export const data = new SlashCommandBuilder()
    .setName('rs-set')
    .setDescription('Configure le salon de logs pour la modération des liens')
    .addChannelOption(option =>
        option.setName('salon')
            .setDescription('Le salon où envoyer les logs de modération')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
    try {
        const channel = interaction.options.getChannel('salon');
        const guildId = interaction.guild.id;

        // Vérifier les permissions du bot dans le salon
        const botPermissions = channel.permissionsFor(interaction.guild.members.me);
        if (!botPermissions.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Permissions insuffisantes')
                .setDescription(`Je n'ai pas les permissions nécessaires dans ${channel}.\n\n**Permissions requises :**\n• Envoyer des messages\n• Intégrer des liens`)
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
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
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Erreur de sauvegarde')
                .setDescription('Impossible de sauvegarder la configuration. Veuillez réessayer.')
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        // Confirmation
        const successEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Configuration mise à jour')
            .setDescription(`Le salon de logs a été configuré sur ${channel}.\n\n**Prochaines étapes :**\n• Utilisez \`/rs-config\` pour configurer les paramètres de modération\n• Les liens détectés seront maintenant loggés dans ce salon`)
            .addFields(
                { name: '📊 Salon de logs', value: `${channel}`, inline: true },
                { name: '🔧 Configuration', value: 'Utilisez `/rs-config`', inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [successEmbed] });

        // Envoyer un message de test dans le salon de logs
        const testEmbed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('🔍 Système de modération des liens activé')
            .setDescription('Ce salon a été configuré pour recevoir les logs de modération des liens.')
            .addFields(
                { name: '⚙️ Configuration', value: 'Utilisez `/rs-config` pour personnaliser les paramètres', inline: false },
                { name: '📋 Fonctionnalités', value: '• Détection automatique des liens\n• Actions de modération\n• Whitelist/Blacklist\n• Punitions temporaires', inline: false }
            )
            .setFooter({ text: `Configuré par ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        await channel.send({ embeds: [testEmbed] });

    } catch (error) {
        console.error('[LINK-MOD] Erreur dans rs-set:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors de la configuration. Veuillez réessayer.')
            .setTimestamp();

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }
    }
}