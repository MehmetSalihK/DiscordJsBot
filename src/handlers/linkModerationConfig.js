import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, MessageFlags } from 'discord.js';
import fs from 'fs';
import path from 'path';

// Fonctions pour charger et sauvegarder la configuration
function loadConfig() {
    try {
        const configPath = path.join(process.cwd(), 'json', 'linkModeration.json');
        if (!fs.existsSync(configPath)) {
            return {};
        }
        const data = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // console.error('[LINK-MOD] Erreur lors du chargement de la configuration:', error);
        return {};
    }
}

function saveConfig(config) {
    try {
        const configPath = path.join(process.cwd(), 'json', 'linkModeration.json');
        const jsonDir = path.dirname(configPath);
        
        if (!fs.existsSync(jsonDir)) {
            fs.mkdirSync(jsonDir, { recursive: true });
        }
        
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        // console.error('[LINK-MOD] Erreur lors de la sauvegarde de la configuration:', error);
        return false;
    }
}

// Fonction pour vérifier les permissions
function hasModPermissions(member) {
    return member.permissions.has([PermissionFlagsBits.ManageGuild, PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers]);
}

// Fonction pour créer l'embed de configuration
function createConfigEmbed(guildConfig, guildName) {
    const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('⚙️ Configuration - Modération des liens')
        .setDescription(`Configuration actuelle pour **${guildName}**`)
        .addFields(
            {
                name: '📢 Salon de logs',
                value: guildConfig.log_channel_id ? `<#${guildConfig.log_channel_id}>` : '❌ Non configuré',
                inline: true
            },
            {
                name: '🗑️ Suppression automatique',
                value: guildConfig.auto_delete ? '✅ Activée' : '❌ Désactivée',
                inline: true
            },
            {
                name: '📬 Notification utilisateur',
                value: guildConfig.notify_user ? '✅ Activée' : '❌ Désactivée',
                inline: true
            },
            {
                name: '🦵 Kick automatique',
                value: guildConfig.auto_kick ? `⏱️ ${guildConfig.auto_kick}` : '❌ Désactivé',
                inline: true
            },
            {
                name: '🔨 Ban automatique',
                value: guildConfig.auto_ban ? `⏱️ ${guildConfig.auto_ban}` : '❌ Désactivé',
                inline: true
            },
            {
                name: '📊 Statistiques',
                value: '🔄 Cliquez sur "Statistiques" pour voir les détails',
                inline: true
            },
            {
                name: '✅ Rôles whitelistés',
                value: guildConfig.whitelist_roles?.length > 0 ? 
                    guildConfig.whitelist_roles.map(id => `<@&${id}>`).join(', ') : 
                    '❌ Aucun',
                inline: false
            },
            {
                name: '📝 Salons whitelistés',
                value: guildConfig.whitelist_channels?.length > 0 ? 
                    guildConfig.whitelist_channels.map(id => `<#${id}>`).join(', ') : 
                    '❌ Aucun',
                inline: false
            },
            {
                name: '🌐 Domaines whitelistés',
                value: guildConfig.whitelist_domains?.length > 0 ? 
                    guildConfig.whitelist_domains.map(domain => `\`${domain}\``).join(', ') : 
                    '❌ Aucun',
                inline: false
            }
        )
        .setFooter({ text: 'Utilisez les boutons ci-dessous pour modifier la configuration' })
        .setTimestamp();

    return embed;
}

// Fonction pour créer les boutons de configuration
function createConfigButtons() {
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('linkmod_config_autodelete')
                .setLabel('Suppression auto')
                .setEmoji('🗑️')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('linkmod_config_autokick')
                .setLabel('Kick auto')
                .setEmoji('🦵')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('linkmod_config_autoban')
                .setLabel('Ban auto')
                .setEmoji('🔨')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('linkmod_config_notify')
                .setLabel('Notifications')
                .setEmoji('📬')
                .setStyle(ButtonStyle.Secondary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('linkmod_config_whitelist_roles')
                .setLabel('Rôles whitelist')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('linkmod_config_whitelist_channels')
                .setLabel('Salons whitelist')
                .setEmoji('📝')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('linkmod_config_whitelist_domains')
                .setLabel('Domaines whitelist')
                .setEmoji('🌐')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('linkmod_config_stats')
                .setLabel('Statistiques')
                .setEmoji('📊')
                .setStyle(ButtonStyle.Success)
        );

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('linkmod_config_refresh')
                .setLabel('Actualiser')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('linkmod_config_reset')
                .setLabel('Réinitialiser')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Danger)
        );

    return [row1, row2, row3];
}

// Handler principal pour les boutons de configuration
export async function handleLinkModerationConfig(interaction) {
    try {
        const customId = interaction.customId;
        
        // Vérifier les permissions
        if (!hasModPermissions(interaction.member)) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Permissions insuffisantes')
                .setDescription('Vous n\'avez pas les permissions nécessaires pour utiliser cette fonction.')
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        const guildId = interaction.guild.id;
        const config = loadConfig();
        
        if (!config[guildId]) {
            config[guildId] = {
                log_channel_id: null,
                auto_delete: false,
                auto_kick: null,
                auto_ban: null,
                notify_user: true,
                whitelist_roles: [],
                whitelist_channels: [],
                whitelist_domains: [],
                whitelist_users: [],
                blacklist_users: [],
                temp_punishments: [],
                stats: {
                    links_detected: 0,
                    messages_deleted: 0,
                    users_kicked: 0,
                    users_banned: 0
                }
            };
            saveConfig(config);
        }

        const guildConfig = config[guildId];
        
        // Parser l'action selon le format du customId
        let action;
        if (customId.startsWith('linkmod_config_')) {
            action = customId.replace('linkmod_config_', '');
        } else if (customId.startsWith('linkmod_toggle_delete_')) {
            action = 'autodelete';
        } else if (customId.startsWith('linkmod_toggle_notify_')) {
            action = 'notify';
        } else if (customId.startsWith('linkmod_change_channel_')) {
            action = 'change_channel';
        } else if (customId.startsWith('linkmod_remove_channel_')) {
            action = 'remove_channel';
        } else if (customId.startsWith('linkmod_whitelist_')) {
            action = 'whitelist';
        } else if (customId.startsWith('linkmod_blacklist_')) {
            action = 'blacklist';
        } else if (customId.startsWith('linkmod_temp_punishments_')) {
            action = 'temp_punishments';
        } else if (customId.startsWith('linkmod_refresh_')) {
            action = 'refresh';
        } else {
            action = 'unknown';
        }

        switch (action) {
            case 'autodelete':
                await handleAutoDeleteToggle(interaction, guildId, guildConfig);
                break;
            case 'autokick':
                await handleAutoKickConfig(interaction, guildId);
                break;
            case 'autoban':
                await handleAutoBanConfig(interaction, guildId);
                break;
            case 'notify':
                await handleNotifyToggle(interaction, guildId, guildConfig);
                break;
            case 'change_channel':
                await handleChangeChannel(interaction, guildId);
                break;
            case 'remove_channel':
                await handleRemoveChannel(interaction, guildId);
                break;
            case 'whitelist_roles':
                await handleWhitelistRoles(interaction, guildId);
                break;
            case 'whitelist_channels':
                await handleWhitelistChannels(interaction, guildId);
                break;
            case 'whitelist_domains':
                await handleWhitelistDomains(interaction, guildId);
                break;
            case 'whitelist':
                await handleWhitelistMenu(interaction, guildId);
                break;
            case 'blacklist':
                await handleBlacklistMenu(interaction, guildId);
                break;
            case 'temp_punishments':
                await handleTempPunishments(interaction, guildId);
                break;
            case 'stats':
                await handleShowStats(interaction, guildConfig);
                break;
            case 'refresh':
                await handleRefreshConfig(interaction, guildId);
                break;
            case 'reset':
                await handleResetConfig(interaction, guildId);
                break;
            default:
                const unknownEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Action inconnue')
                    .setDescription('Cette action n\'est pas reconnue.')
                    .setTimestamp();

                await interaction.reply({ embeds: [unknownEmbed], flags: MessageFlags.Ephemeral });
        }

    } catch (error) {
        // console.error('[LINK-MOD] Erreur dans le handler de configuration:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors du traitement de la configuration.')
            .setTimestamp();

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }
    }
}

// Toggle suppression automatique
async function handleAutoDeleteToggle(interaction, guildId, guildConfig) {
    const config = loadConfig();
    config[guildId].auto_delete = !guildConfig.auto_delete;
    saveConfig(config);

    const embed = new EmbedBuilder()
        .setColor(config[guildId].auto_delete ? '#00FF00' : '#FF6B35')
        .setTitle('🗑️ Suppression automatique')
        .setDescription(`La suppression automatique des liens a été **${config[guildId].auto_delete ? 'activée' : 'désactivée'}**.`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

// Changer le salon de logs
async function handleChangeChannel(interaction, guildId) {
    const modal = new ModalBuilder()
        .setCustomId(`linkmod_change_channel_modal_${guildId}`)
        .setTitle('Changer le salon de logs');

    const channelInput = new TextInputBuilder()
        .setCustomId('channel')
        .setLabel('ID ou mention du salon')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('#salon-logs ou 123456789012345678')
        .setRequired(true)
        .setMaxLength(100);

    const firstActionRow = new ActionRowBuilder().addComponents(channelInput);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
}

// Supprimer le salon de logs
async function handleRemoveChannel(interaction, guildId) {
    const config = loadConfig();
    
    if (!config[guildId].log_channel) {
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Aucun salon configuré')
            .setDescription('Aucun salon de logs n\'est actuellement configuré.')
            .setTimestamp();

        return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    config[guildId].log_channel = null;
    saveConfig(config);

    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🗑️ Salon supprimé')
        .setDescription('Le salon de logs a été supprimé avec succès.')
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    
    // Rafraîchir la configuration
    await handleRefreshConfig(interaction, guildId);
}

// Modal pour changer le salon
async function handleChangeChannelModal(interaction, guildId) {
    const channelInput = interaction.fields.getTextInputValue('channel').trim();
    const config = loadConfig();
    
    let channelId;
    
    // Extraire l'ID du salon depuis une mention ou un ID direct
    if (channelInput.startsWith('<#') && channelInput.endsWith('>')) {
        channelId = channelInput.slice(2, -1);
    } else if (/^\d+$/.test(channelInput)) {
        channelId = channelInput;
    } else {
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Format invalide')
            .setDescription('Veuillez fournir un ID de salon valide ou une mention (#salon).')
            .setTimestamp();

        return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }

    // Vérifier que le salon existe
    try {
        const channel = await interaction.guild.channels.fetch(channelId);
        
        if (!channel || channel.type !== 0) { // 0 = GUILD_TEXT
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Salon invalide')
                .setDescription('Le salon spécifié n\'existe pas ou n\'est pas un salon textuel.')
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        // Vérifier les permissions
        const botMember = interaction.guild.members.me;
        if (!channel.permissionsFor(botMember).has(['SendMessages', 'EmbedLinks'])) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Permissions insuffisantes')
                .setDescription('Je n\'ai pas les permissions nécessaires pour envoyer des messages dans ce salon.')
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        config[guildId].log_channel = channelId;
        saveConfig(config);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Salon configuré')
            .setDescription(`Le salon de logs a été configuré sur ${channel}.`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        
        // Rafraîchir la configuration
        await handleRefreshConfig(interaction, guildId);

    } catch (error) {
        // console.error('[LINK-MOD] Erreur lors de la vérification du salon:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur')
            .setDescription('Impossible de vérifier le salon. Assurez-vous que l\'ID est correct.')
            .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}

// Configuration kick automatique
async function handleAutoKickConfig(interaction, guildId) {
    const modal = new ModalBuilder()
        .setCustomId(`linkmod_autokick_modal_${guildId}`)
        .setTitle('🦵 Configuration Kick Automatique');

    const durationInput = new TextInputBuilder()
        .setCustomId('duration')
        .setLabel('Durée avant kick (ou "off" pour désactiver)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: 1h, 24h, 7d, off')
        .setRequired(true)
        .setMaxLength(10);

    const row = new ActionRowBuilder().addComponents(durationInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

// Configuration ban automatique
async function handleAutoBanConfig(interaction, guildId) {
    const modal = new ModalBuilder()
        .setCustomId(`linkmod_autoban_modal_${guildId}`)
        .setTitle('🔨 Configuration Ban Automatique');

    const durationInput = new TextInputBuilder()
        .setCustomId('duration')
        .setLabel('Durée du ban (ou "permanent" ou "off")')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: 1h, 24h, 7d, permanent, off')
        .setRequired(true)
        .setMaxLength(15);

    const row = new ActionRowBuilder().addComponents(durationInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

// Toggle notifications
async function handleNotifyToggle(interaction, guildId, guildConfig) {
    const config = loadConfig();
    config[guildId].notify_user = !guildConfig.notify_user;
    saveConfig(config);

    const embed = new EmbedBuilder()
        .setColor(config[guildId].notify_user ? '#00FF00' : '#FF6B35')
        .setTitle('📬 Notifications utilisateur')
        .setDescription(`Les notifications aux utilisateurs ont été **${config[guildId].notify_user ? 'activées' : 'désactivées'}**.`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

// Configuration whitelist rôles
async function handleWhitelistRoles(interaction, guildId) {
    const modal = new ModalBuilder()
        .setCustomId(`linkmod_whitelist_roles_modal_${guildId}`)
        .setTitle('✅ Whitelist - Rôles');

    const rolesInput = new TextInputBuilder()
        .setCustomId('roles')
        .setLabel('IDs des rôles (séparés par des virgules)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Ex: 123456789, 987654321')
        .setRequired(false)
        .setMaxLength(1000);

    const row = new ActionRowBuilder().addComponents(rolesInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

// Configuration whitelist salons
async function handleWhitelistChannels(interaction, guildId) {
    const modal = new ModalBuilder()
        .setCustomId(`linkmod_whitelist_channels_modal_${guildId}`)
        .setTitle('📝 Whitelist - Salons');

    const channelsInput = new TextInputBuilder()
        .setCustomId('channels')
        .setLabel('IDs des salons (séparés par des virgules)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Ex: 123456789, 987654321')
        .setRequired(false)
        .setMaxLength(1000);

    const row = new ActionRowBuilder().addComponents(channelsInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

// Configuration whitelist domaines
async function handleWhitelistDomains(interaction, guildId) {
    const modal = new ModalBuilder()
        .setCustomId(`linkmod_whitelist_domains_modal_${guildId}`)
        .setTitle('🌐 Whitelist - Domaines');

    const domainsInput = new TextInputBuilder()
        .setCustomId('domains')
        .setLabel('Domaines autorisés (séparés par des virgules)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Ex: youtube.com, amazon.com, discord.com')
        .setRequired(false)
        .setMaxLength(1000);

    const row = new ActionRowBuilder().addComponents(domainsInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

// Afficher les statistiques
async function handleShowStats(interaction, guildConfig) {
    const stats = guildConfig.stats || {
        links_detected: 0,
        messages_deleted: 0,
        users_kicked: 0,
        users_banned: 0
    };

    const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('📊 Statistiques - Modération des liens')
        .addFields(
            { name: '🔍 Liens détectés', value: stats.links_detected.toString(), inline: true },
            { name: '🗑️ Messages supprimés', value: stats.messages_deleted.toString(), inline: true },
            { name: '🦵 Utilisateurs kickés', value: stats.users_kicked.toString(), inline: true },
            { name: '🔨 Utilisateurs bannis', value: stats.users_banned.toString(), inline: true },
            { name: '⏳ Punitions temporaires actives', value: guildConfig.temp_punishments?.length.toString() || '0', inline: true },
            { name: '✅ Utilisateurs whitelistés', value: guildConfig.whitelist_users?.length.toString() || '0', inline: true }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

// Actualiser la configuration
async function handleRefreshConfig(interaction, guildId) {
    const config = loadConfig();
    const guildConfig = config[guildId];
    
    if (!guildConfig) {
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Configuration introuvable')
            .setDescription('Aucune configuration trouvée pour ce serveur.')
            .setTimestamp();

        return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }

    const embed = createConfigEmbed(guildConfig, interaction.guild.name);
    const buttons = createConfigButtons();

    await interaction.update({ embeds: [embed], components: buttons });
}

// Réinitialiser la configuration
async function handleResetConfig(interaction, guildId) {
    const config = loadConfig();
    config[guildId] = {
        log_channel_id: null,
        auto_delete: false,
        auto_kick: null,
        auto_ban: null,
        notify_user: true,
        whitelist_roles: [],
        whitelist_channels: [],
        whitelist_domains: [],
        whitelist_users: [],
        blacklist_users: [],
        temp_punishments: [],
        stats: {
            links_detected: 0,
            messages_deleted: 0,
            users_kicked: 0,
            users_banned: 0
        }
    };
    saveConfig(config);

    const embed = new EmbedBuilder()
        .setColor('#FF6B35')
        .setTitle('🔄 Configuration réinitialisée')
        .setDescription('La configuration a été réinitialisée aux valeurs par défaut.')
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

// Handlers pour les modals
export async function handleConfigModals(interaction) {
    try {
        const customId = interaction.customId;
        const parts = customId.split('_');
        const type = parts[1];
        const guildId = parts[3];

        const config = loadConfig();
        const guildConfig = config[guildId];

        switch (type) {
            case 'autokick':
                await handleAutoKickModal(interaction, guildId, guildConfig);
                break;
            case 'autoban':
                await handleAutoBanModal(interaction, guildId, guildConfig);
                break;
            case 'change':
                if (parts[2] === 'channel') {
                    await handleChangeChannelModal(interaction, guildId);
                }
                break;
            case 'whitelist':
                const subtype = parts[2];
                await handleWhitelistModal(interaction, guildId, guildConfig, subtype);
                break;
        }

    } catch (error) {
        // console.error('[LINK-MOD] Erreur dans le handler de modal de configuration:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors du traitement de la configuration.')
            .setTimestamp();

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }
    }
}

// Modal auto-kick
async function handleAutoKickModal(interaction, guildId, guildConfig) {
    const duration = interaction.fields.getTextInputValue('duration').toLowerCase().trim();
    
    const config = loadConfig();
    
    if (duration === 'off' || duration === 'désactivé') {
        config[guildId].auto_kick = null;
    } else {
        const durationRegex = /^(\d+)([hdm])$/;
        if (!durationRegex.test(duration)) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Format invalide')
                .setDescription('Utilisez le format: `1h`, `24h`, `7d` ou `off` pour désactiver.')
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }
        config[guildId].auto_kick = duration;
    }

    saveConfig(config);

    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🦵 Kick automatique configuré')
        .setDescription(`Le kick automatique a été ${config[guildId].auto_kick ? `configuré à **${config[guildId].auto_kick}**` : '**désactivé**'}.`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

// Modal auto-ban
async function handleAutoBanModal(interaction, guildId, guildConfig) {
    const duration = interaction.fields.getTextInputValue('duration').toLowerCase().trim();
    
    const config = loadConfig();
    
    if (duration === 'off' || duration === 'désactivé') {
        config[guildId].auto_ban = null;
    } else if (duration === 'permanent' || duration === 'perm') {
        config[guildId].auto_ban = 'permanent';
    } else {
        const durationRegex = /^(\d+)([hdm])$/;
        if (!durationRegex.test(duration)) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Format invalide')
                .setDescription('Utilisez le format: `1h`, `24h`, `7d`, `permanent` ou `off` pour désactiver.')
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }
        config[guildId].auto_ban = duration;
    }

    saveConfig(config);

    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🔨 Ban automatique configuré')
        .setDescription(`Le ban automatique a été ${config[guildId].auto_ban ? `configuré à **${config[guildId].auto_ban}**` : '**désactivé**'}.`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

// Modal whitelist
async function handleWhitelistModal(interaction, guildId, guildConfig, type) {
    const input = interaction.fields.getTextInputValue(type);
    const config = loadConfig();
    
    let items = [];
    if (input.trim()) {
        items = input.split(',').map(item => item.trim()).filter(item => item);
    }

    const fieldName = `whitelist_${type}`;
    config[guildId][fieldName] = items;
    saveConfig(config);

    const typeNames = {
        'roles': 'rôles',
        'channels': 'salons',
        'domains': 'domaines'
    };

    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle(`✅ Whitelist ${typeNames[type]} mise à jour`)
        .setDescription(`La whitelist des ${typeNames[type]} a été mise à jour avec ${items.length} élément(s).`)
        .setTimestamp();

    if (items.length > 0) {
        let displayItems;
        if (type === 'roles') {
            displayItems = items.map(id => `<@&${id}>`).join(', ');
        } else if (type === 'channels') {
            displayItems = items.map(id => `<#${id}>`).join(', ');
        } else {
            displayItems = items.map(domain => `\`${domain}\``).join(', ');
        }
        embed.addFields({ name: `${typeNames[type]} whitelistés`, value: displayItems, inline: false });
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

export { createConfigEmbed, createConfigButtons };