import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, '../../json/linkModeration.json');

// Regex pour détecter les URLs
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;

// Domaines de liens raccourcis connus
const SHORT_LINK_DOMAINS = [
    'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'short.link',
    'tiny.cc', 'is.gd', 'buff.ly', 'ift.tt', 'rebrand.ly', 'cutt.ly'
];

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
        // console.error('[LINK-MOD] Erreur lors du chargement de la configuration:', error);
        return {};
    }
}

// Fonction pour sauvegarder la configuration
function saveConfig(config) {
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        // console.error('[LINK-MOD] Erreur lors de la sauvegarde de la configuration:', error);
        return false;
    }
}

// Fonction pour extraire le domaine d'une URL
function extractDomain(url) {
    try {
        // Ajouter http:// si pas de protocole
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'http://' + url;
        }
        const urlObj = new URL(url);
        return urlObj.hostname.toLowerCase().replace('www.', '');
    } catch (error) {
        // Fallback pour les URLs malformées
        const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\s]+)/i);
        return match ? match[1].toLowerCase() : url;
    }
}

// Fonction pour vérifier si un utilisateur est whitelisté
function isUserWhitelisted(member, guildConfig) {
    // Vérifier les rôles whitelistés
    if (guildConfig.whitelist_roles && guildConfig.whitelist_roles.length > 0) {
        const hasWhitelistedRole = member.roles.cache.some(role => 
            guildConfig.whitelist_roles.includes(role.id)
        );
        if (hasWhitelistedRole) return true;
    }

    // Vérifier les permissions de modération
    if (member.permissions.has([PermissionFlagsBits.ManageMessages, PermissionFlagsBits.KickMembers])) {
        return true;
    }

    return false;
}

// Fonction pour vérifier si un salon est whitelisté
function isChannelWhitelisted(channelId, guildConfig) {
    return guildConfig.whitelist_channels && guildConfig.whitelist_channels.includes(channelId);
}

// Fonction pour vérifier si un domaine est whitelisté
function isDomainWhitelisted(domain, guildConfig) {
    if (!guildConfig.whitelist_domains) return false;
    
    return guildConfig.whitelist_domains.some(whitelistedDomain => {
        // Vérification exacte
        if (domain === whitelistedDomain.toLowerCase()) return true;
        
        // Vérification des sous-domaines
        if (domain.endsWith('.' + whitelistedDomain.toLowerCase())) return true;
        
        return false;
    });
}

// Fonction pour vérifier si un utilisateur est blacklisté
function isUserBlacklisted(userId, guildConfig) {
    return guildConfig.blacklist_users && guildConfig.blacklist_users.includes(userId);
}

// Fonction pour créer l'embed de log
function createLogEmbed(message, detectedUrls) {
    const embed = new EmbedBuilder()
        .setColor('#FF6B35')
        .setTitle('🔍 Détection de lien')
        .setDescription('Un lien a été détecté dans un message.')
        .addFields(
            { name: '👤 Auteur', value: `${message.author} (${message.author.id})`, inline: true },
            { name: '📍 Salon', value: `${message.channel}`, inline: true },
            { name: '🕒 Timestamp', value: `<t:${Math.floor(message.createdTimestamp / 1000)}:F>`, inline: true },
            { name: '📝 Message', value: `\`\`\`text\n${message.content.length > 1000 ? message.content.substring(0, 1000) + '...' : message.content}\n\`\`\``, inline: false },
            { name: '🔗 Lien(s) détecté(s)', value: detectedUrls.map(url => `\`${url}\``).join('\n'), inline: false }
        )
        .setFooter({ text: `Message ID: ${message.id}` })
        .setTimestamp();

    return embed;
}

// Fonction pour créer les boutons d'action
function createActionButtons(messageId, userId, guildId) {
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`linkmod_delete_${messageId}_${userId}_${guildId}`)
                .setLabel('Supprimer')
                .setEmoji('🗑️')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`linkmod_kick_${messageId}_${userId}_${guildId}`)
                .setLabel('Kick')
                .setEmoji('🦵')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`linkmod_tempban_${messageId}_${userId}_${guildId}`)
                .setLabel('Temp-Ban')
                .setEmoji('⏳')
                .setStyle(ButtonStyle.Secondary)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`linkmod_ban_${messageId}_${userId}_${guildId}`)
                .setLabel('Ban')
                .setEmoji('🔨')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`linkmod_whitelist_user_${messageId}_${userId}_${guildId}`)
                .setLabel('Whitelist')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`linkmod_blacklist_user_${messageId}_${userId}_${guildId}`)
                .setLabel('Blacklist')
                .setEmoji('🚫')
                .setStyle(ButtonStyle.Danger)
        );

    const row3 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`linkmod_ignore_${messageId}_${userId}_${guildId}`)
                .setLabel('Ignorer')
                .setEmoji('👀')
                .setStyle(ButtonStyle.Secondary)
        );

    return [row1, row2, row3];
}

// Fonction pour appliquer les actions automatiques
async function applyAutoActions(message, guildConfig) {
    try {
        // Suppression automatique
        if (guildConfig.auto_delete) {
            try {
                await message.delete();
                // console.log(`[LINK-MOD] Message supprimé automatiquement: ${message.id}`);
            } catch (error) {
                // console.error('[LINK-MOD] Erreur lors de la suppression automatique:', error);
            }
        }

        // Notification à l'utilisateur
        if (guildConfig.notify_user) {
            try {
                const notifyEmbed = new EmbedBuilder()
                    .setColor('#FF6B35')
                    .setTitle('⚠️ Lien détecté')
                    .setDescription(`Votre message dans **${message.guild.name}** a été détecté comme contenant un lien non autorisé.`)
                    .addFields(
                        { name: '📍 Salon', value: `${message.channel}`, inline: true },
                        { name: '📝 Message', value: `\`\`\`${message.content.substring(0, 500)}\`\`\``, inline: false }
                    )
                    .setFooter({ text: 'Contactez un modérateur si vous pensez qu\'il s\'agit d\'une erreur' })
                    .setTimestamp();

                await message.author.send({ embeds: [notifyEmbed] });
            } catch (error) {
                // console.log('[LINK-MOD] Impossible d\'envoyer un MP à l\'utilisateur');
            }
        }

        // Kick automatique
        if (guildConfig.auto_kick) {
            try {
                const member = message.member;
                if (member && member.kickable) {
                    await member.kick(`Lien non autorisé détecté - Auto-kick (${guildConfig.auto_kick})`);
                    // console.log(`[LINK-MOD] Utilisateur kické automatiquement: ${message.author.id}`);
                    
                    // Ajouter à la liste des punitions temporaires si c'est temporaire
                    if (guildConfig.auto_kick !== 'permanent') {
                        addTempPunishment(message.guild.id, message.author.id, 'kick', guildConfig.auto_kick);
                    }
                }
            } catch (error) {
                // console.error('[LINK-MOD] Erreur lors du kick automatique:', error);
            }
        }

        // Ban automatique
        if (guildConfig.auto_ban) {
            try {
                const member = message.member;
                if (member && member.bannable) {
                    await member.ban({ 
                        reason: `Lien non autorisé détecté - Auto-ban (${guildConfig.auto_ban})`,
                        deleteMessageDays: 1 
                    });
                    // console.log(`[LINK-MOD] Utilisateur banni automatiquement: ${message.author.id}`);
                    
                    // Ajouter à la liste des punitions temporaires si c'est temporaire
                    if (guildConfig.auto_ban !== 'permanent') {
                        addTempPunishment(message.guild.id, message.author.id, 'ban', guildConfig.auto_ban);
                    }
                }
            } catch (error) {
                // console.error('[LINK-MOD] Erreur lors du ban automatique:', error);
            }
        }

    } catch (error) {
        // console.error('[LINK-MOD] Erreur lors de l\'application des actions automatiques:', error);
    }
}

// Fonction pour ajouter une punition temporaire
function addTempPunishment(guildId, userId, type, duration) {
    try {
        const config = loadConfig();
        if (!config[guildId]) return;

        const expirationTime = calculateExpirationTime(duration);
        const punishment = {
            userId,
            type,
            duration,
            expirationTime,
            createdAt: Date.now()
        };

        if (!config[guildId].temp_punishments) {
            config[guildId].temp_punishments = [];
        }

        config[guildId].temp_punishments.push(punishment);
        saveConfig(config);

        // console.log(`[LINK-MOD] Punition temporaire ajoutée: ${type} pour ${userId} (expire: ${new Date(expirationTime)})`);
    } catch (error) {
        // console.error('[LINK-MOD] Erreur lors de l\'ajout de la punition temporaire:', error);
    }
}

// Fonction pour calculer le temps d'expiration
function calculateExpirationTime(duration) {
    const now = Date.now();
    const match = duration.match(/(\d+)([hdm])/);
    
    if (!match) return now + (24 * 60 * 60 * 1000); // 24h par défaut
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
        case 'h':
            return now + (value * 60 * 60 * 1000);
        case 'd':
            return now + (value * 24 * 60 * 60 * 1000);
        case 'm':
            return now + (value * 60 * 1000);
        default:
            return now + (24 * 60 * 60 * 1000);
    }
}

// Fonction principale de détection
export async function handleLinkDetection(message) {
    try {
        // Ignorer les bots
        if (message.author.bot) return;

        // Ignorer les messages sans contenu
        if (!message.content) return;

        const guildId = message.guild.id;
        const config = loadConfig();
        const guildConfig = config[guildId];

        // Vérifier si la modération est configurée
        if (!guildConfig || !guildConfig.log_channel_id) return;

        // Vérifier si le salon est whitelisté
        if (isChannelWhitelisted(message.channel.id, guildConfig)) return;

        // Vérifier si l'utilisateur est whitelisté
        if (isUserWhitelisted(message.member, guildConfig)) return;

        // Détecter les URLs
        const urls = message.content.match(URL_REGEX);
        if (!urls || urls.length === 0) return;

        // Filtrer les URLs selon la whitelist
        const detectedUrls = [];
        for (const url of urls) {
            const domain = extractDomain(url);
            
            // Vérifier si le domaine est whitelisté
            if (!isDomainWhitelisted(domain, guildConfig)) {
                detectedUrls.push(url);
            }
        }

        // Si aucune URL non-whitelistée n'est trouvée, ignorer
        if (detectedUrls.length === 0) return;

        // console.log(`[LINK-MOD] Lien détecté de ${message.author.displayName} dans #${message.channel.name}: ${detectedUrls.join(', ')}`);

        // Vérifier si l'utilisateur est blacklisté (action immédiate)
        const isBlacklisted = isUserBlacklisted(message.author.id, guildConfig);

        // Appliquer les actions automatiques
        if (isBlacklisted || guildConfig.auto_delete || guildConfig.auto_kick || guildConfig.auto_ban) {
            await applyAutoActions(message, guildConfig);
        }

        // Envoyer le log
        const logChannel = message.guild.channels.cache.get(guildConfig.log_channel_id);
        if (logChannel) {
            const embed = createLogEmbed(message, detectedUrls);
            const buttons = createActionButtons(message.id, message.author.id, guildId);

            // Ajouter une indication si l'utilisateur est blacklisté
            if (isBlacklisted) {
                embed.addFields({ name: '🚫 Statut', value: '**Utilisateur blacklisté** - Actions automatiques appliquées', inline: false });
            }

            await logChannel.send({ embeds: [embed], components: buttons });
        }

    } catch (error) {
        // console.error('[LINK-MOD] Erreur dans la détection de liens:', error);
    }
}

// Fonction pour vérifier et traiter les punitions expirées
export function checkExpiredPunishments(client) {
    try {
        const config = loadConfig();
        let configChanged = false;

        for (const guildId in config) {
            const guildConfig = config[guildId];
            if (!guildConfig.temp_punishments) continue;

            const now = Date.now();
            const expiredPunishments = guildConfig.temp_punishments.filter(p => p.expirationTime <= now);

            if (expiredPunishments.length > 0) {
                // Traiter les punitions expirées
                expiredPunishments.forEach(async (punishment) => {
                    try {
                        const guild = client.guilds.cache.get(guildId);
                        if (!guild) return;

                        if (punishment.type === 'ban') {
                            await guild.members.unban(punishment.userId, 'Punition temporaire expirée');
                            // console.log(`[LINK-MOD] Unban automatique: ${punishment.userId} dans ${guild.name}`);
                        }
                    } catch (error) {
                        // console.error('[LINK-MOD] Erreur lors du traitement de la punition expirée:', error);
                    }
                });

                // Supprimer les punitions expirées de la configuration
                guildConfig.temp_punishments = guildConfig.temp_punishments.filter(p => p.expirationTime > now);
                configChanged = true;
            }
        }

        if (configChanged) {
            saveConfig(config);
        }

    } catch (error) {
        // console.error('[LINK-MOD] Erreur lors de la vérification des punitions expirées:', error);
    }
}

export { loadConfig, saveConfig };