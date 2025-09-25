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

// Fonction pour ajouter une punition temporaire
function addTempPunishment(guildId, userId, type, duration) {
    try {
        const config = loadConfig();
        if (!config[guildId]) return false;

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
        return saveConfig(config);
    } catch (error) {
        // console.error('[LINK-MOD] Erreur lors de l\'ajout de la punition temporaire:', error);
        return false;
    }
}

// Handler principal pour les boutons de modération des liens
export async function handleLinkModerationButtons(interaction) {
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

        // Parser l'ID personnalisé
        const parts = customId.split('_');
        const action = parts[1];
        const messageId = parts[2];
        const userId = parts[3];
        const guildId = parts[4];

        const guild = interaction.guild;
        const config = loadConfig();
        const guildConfig = config[guildId];

        if (!guildConfig) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Configuration manquante')
                .setDescription('La configuration de modération n\'est pas trouvée.')
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        switch (action) {
            case 'delete':
                await handleDeleteAction(interaction, messageId, userId, guild);
                break;
            case 'kick':
                await handleKickAction(interaction, userId, guild, guildConfig);
                break;
            case 'tempban':
                await handleTempBanAction(interaction, userId, guild);
                break;
            case 'ban':
                await handleBanAction(interaction, userId, guild);
                break;
            case 'whitelist':
                await handleWhitelistAction(interaction, userId, guildId);
                break;
            case 'blacklist':
                await handleBlacklistAction(interaction, userId, guildId);
                break;
            case 'ignore':
                await handleIgnoreAction(interaction);
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
        // console.error('[LINK-MOD] Erreur dans le handler de boutons:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur')
            .setDescription('Une erreur est survenue lors du traitement de l\'action.')
            .setTimestamp();

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }
    }
}

// Action: Supprimer le message
async function handleDeleteAction(interaction, messageId, userId, guild) {
    try {
        // Chercher le message dans tous les salons
        let messageFound = false;
        
        for (const channel of guild.channels.cache.values()) {
            if (channel.isTextBased()) {
                try {
                    const message = await channel.messages.fetch(messageId);
                    if (message) {
                        await message.delete();
                        messageFound = true;
                        break;
                    }
                } catch (error) {
                    // Message pas trouvé dans ce salon, continuer
                }
            }
        }

        const embed = new EmbedBuilder()
            .setColor(messageFound ? '#00FF00' : '#FF6B35')
            .setTitle(messageFound ? '✅ Message supprimé' : '⚠️ Message introuvable')
            .setDescription(messageFound ? 
                `Le message a été supprimé avec succès.` : 
                `Le message a peut-être déjà été supprimé ou n'est plus accessible.`)
            .addFields(
                { name: '👤 Utilisateur', value: `<@${userId}>`, inline: true },
                { name: '🔧 Action par', value: `${interaction.user}`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

    } catch (error) {
        // console.error('[LINK-MOD] Erreur lors de la suppression:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur de suppression')
            .setDescription('Impossible de supprimer le message.')
            .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}

// Action: Kick
async function handleKickAction(interaction, userId, guild, guildConfig) {
    try {
        const member = await guild.members.fetch(userId).catch(() => null);
        
        if (!member) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Utilisateur introuvable')
                .setDescription('L\'utilisateur n\'est plus sur le serveur.')
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        if (!member.kickable) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Impossible de kick')
                .setDescription('Je n\'ai pas les permissions pour kick cet utilisateur.')
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        await member.kick(`Lien non autorisé - Action manuelle par ${interaction.user.displayName}`);

        const successEmbed = new EmbedBuilder()
            .setColor('#FF6B35')
            .setTitle('🦵 Utilisateur kické')
            .setDescription(`${member.user.displayName} a été kické du serveur.`)
            .addFields(
                { name: '👤 Utilisateur', value: `${member.user} (${member.user.id})`, inline: true },
                { name: '🔧 Action par', value: `${interaction.user}`, inline: true },
                { name: '📝 Raison', value: 'Lien non autorisé détecté', inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [successEmbed], flags: MessageFlags.Ephemeral });

    } catch (error) {
        // console.error('[LINK-MOD] Erreur lors du kick:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur de kick')
            .setDescription('Impossible de kick l\'utilisateur.')
            .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}

// Action: Temp-Ban (avec modal)
async function handleTempBanAction(interaction, userId, guild) {
    try {
        const modal = new ModalBuilder()
            .setCustomId(`linkmod_tempban_modal_${userId}_${guild.id}`)
            .setTitle('⏳ Ban temporaire');

        const durationInput = new TextInputBuilder()
            .setCustomId('duration')
            .setLabel('Durée du ban')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ex: 1h, 24h, 7d')
            .setRequired(true)
            .setMaxLength(10);

        const reasonInput = new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('Raison (optionnelle)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Raison du ban temporaire...')
            .setRequired(false)
            .setMaxLength(500);

        const row1 = new ActionRowBuilder().addComponents(durationInput);
        const row2 = new ActionRowBuilder().addComponents(reasonInput);

        modal.addComponents(row1, row2);

        await interaction.showModal(modal);

    } catch (error) {
        // console.error('[LINK-MOD] Erreur lors de l\'affichage du modal temp-ban:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur')
            .setDescription('Impossible d\'afficher le formulaire de ban temporaire.')
            .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}

// Action: Ban permanent
async function handleBanAction(interaction, userId, guild) {
    try {
        const member = await guild.members.fetch(userId).catch(() => null);
        const user = member ? member.user : await interaction.client.users.fetch(userId).catch(() => null);
        
        if (!user) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Utilisateur introuvable')
                .setDescription('Impossible de trouver cet utilisateur.')
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        if (member && !member.bannable) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Impossible de ban')
                .setDescription('Je n\'ai pas les permissions pour ban cet utilisateur.')
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        await guild.members.ban(userId, { 
            reason: `Lien non autorisé - Action manuelle par ${interaction.user.displayName}`,
            deleteMessageDays: 1 
        });

        const successEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🔨 Utilisateur banni')
            .setDescription(`${user.displayName} a été banni définitivement du serveur.`)
            .addFields(
                { name: '👤 Utilisateur', value: `${user} (${user.id})`, inline: true },
                { name: '🔧 Action par', value: `${interaction.user}`, inline: true },
                { name: '📝 Raison', value: 'Lien non autorisé détecté', inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [successEmbed], flags: MessageFlags.Ephemeral });

    } catch (error) {
        // console.error('[LINK-MOD] Erreur lors du ban:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur de ban')
            .setDescription('Impossible de ban l\'utilisateur.')
            .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}

// Action: Whitelist utilisateur
async function handleWhitelistAction(interaction, userId, guildId) {
    try {
        const config = loadConfig();
        const guildConfig = config[guildId];

        if (!guildConfig.whitelist_users) {
            guildConfig.whitelist_users = [];
        }

        if (guildConfig.whitelist_users.includes(userId)) {
            const alreadyEmbed = new EmbedBuilder()
                .setColor('#FF6B35')
                .setTitle('⚠️ Déjà whitelisté')
                .setDescription('Cet utilisateur est déjà dans la whitelist.')
                .setTimestamp();

            return await interaction.reply({ embeds: [alreadyEmbed], flags: MessageFlags.Ephemeral });
        }

        guildConfig.whitelist_users.push(userId);
        saveConfig(config);

        const user = await interaction.client.users.fetch(userId).catch(() => null);
        const successEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Utilisateur whitelisté')
            .setDescription(`${user ? user.displayName : 'Utilisateur'} a été ajouté à la whitelist.`)
            .addFields(
                { name: '👤 Utilisateur', value: `<@${userId}>`, inline: true },
                { name: '🔧 Action par', value: `${interaction.user}`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [successEmbed], flags: MessageFlags.Ephemeral });

    } catch (error) {
        // console.error('[LINK-MOD] Erreur lors de la whitelist:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur de whitelist')
            .setDescription('Impossible d\'ajouter l\'utilisateur à la whitelist.')
            .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}

// Action: Blacklist utilisateur
async function handleBlacklistAction(interaction, userId, guildId) {
    try {
        const config = loadConfig();
        const guildConfig = config[guildId];

        if (!guildConfig.blacklist_users) {
            guildConfig.blacklist_users = [];
        }

        if (guildConfig.blacklist_users.includes(userId)) {
            const alreadyEmbed = new EmbedBuilder()
                .setColor('#FF6B35')
                .setTitle('⚠️ Déjà blacklisté')
                .setDescription('Cet utilisateur est déjà dans la blacklist.')
                .setTimestamp();

            return await interaction.reply({ embeds: [alreadyEmbed], flags: MessageFlags.Ephemeral });
        }

        guildConfig.blacklist_users.push(userId);
        saveConfig(config);

        const user = await interaction.client.users.fetch(userId).catch(() => null);
        const successEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🚫 Utilisateur blacklisté')
            .setDescription(`${user ? user.displayName : 'Utilisateur'} a été ajouté à la blacklist.`)
            .addFields(
                { name: '👤 Utilisateur', value: `<@${userId}>`, inline: true },
                { name: '🔧 Action par', value: `${interaction.user}`, inline: true },
                { name: '⚠️ Effet', value: 'Toutes les actions automatiques s\'appliqueront à cet utilisateur', inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [successEmbed], flags: MessageFlags.Ephemeral });

    } catch (error) {
        // console.error('[LINK-MOD] Erreur lors de la blacklist:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur de blacklist')
            .setDescription('Impossible d\'ajouter l\'utilisateur à la blacklist.')
            .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}

// Action: Ignorer
async function handleIgnoreAction(interaction) {
    try {
        const embed = new EmbedBuilder()
            .setColor('#6C757D')
            .setTitle('👀 Action ignorée')
            .setDescription('Aucune action n\'a été prise concernant ce lien.')
            .addFields(
                { name: '🔧 Action par', value: `${interaction.user}`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

    } catch (error) {
        // console.error('[LINK-MOD] Erreur lors de l\'ignore:', error);
    }
}

// Handler pour les modals de temp-ban
export async function handleTempBanModal(interaction) {
    try {
        const customId = interaction.customId;
        const parts = customId.split('_');
        const userId = parts[3];
        const guildId = parts[4];

        const duration = interaction.fields.getTextInputValue('duration');
        const reason = interaction.fields.getTextInputValue('reason') || 'Lien non autorisé détecté';

        // Valider la durée
        const durationRegex = /^(\d+)([hdm])$/;
        if (!durationRegex.test(duration)) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Format de durée invalide')
                .setDescription('Utilisez le format: `1h`, `24h`, `7d`, etc.')
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        const guild = interaction.guild;
        const member = await guild.members.fetch(userId).catch(() => null);
        const user = member ? member.user : await interaction.client.users.fetch(userId).catch(() => null);

        if (!user) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Utilisateur introuvable')
                .setDescription('Impossible de trouver cet utilisateur.')
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        if (member && !member.bannable) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Impossible de ban')
                .setDescription('Je n\'ai pas les permissions pour ban cet utilisateur.')
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        // Bannir l'utilisateur
        await guild.members.ban(userId, { 
            reason: `${reason} - Ban temporaire (${duration}) par ${interaction.user.displayName}`,
            deleteMessageDays: 1 
        });

        // Ajouter à la liste des punitions temporaires
        addTempPunishment(guildId, userId, 'ban', duration);

        const successEmbed = new EmbedBuilder()
            .setColor('#FF6B35')
            .setTitle('⏳ Ban temporaire appliqué')
            .setDescription(`${user.displayName} a été banni temporairement.`)
            .addFields(
                { name: '👤 Utilisateur', value: `${user} (${user.id})`, inline: true },
                { name: '⏱️ Durée', value: duration, inline: true },
                { name: '🔧 Action par', value: `${interaction.user}`, inline: true },
                { name: '📝 Raison', value: reason, inline: false }
            )
            .setFooter({ text: 'L\'utilisateur sera automatiquement débanni à l\'expiration' })
            .setTimestamp();

        await interaction.reply({ embeds: [successEmbed], flags: MessageFlags.Ephemeral });

    } catch (error) {
        // console.error('[LINK-MOD] Erreur lors du temp-ban modal:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur de ban temporaire')
            .setDescription('Impossible d\'appliquer le ban temporaire.')
            .setTimestamp();

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }
    }
}