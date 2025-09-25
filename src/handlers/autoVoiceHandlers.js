import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, MessageFlags } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const autoVoiceChannelsPath = path.join(__dirname, '../../json/autoVoiceChannels.json');
const voiceActivityLogsPath = path.join(__dirname, '../../json/voiceActivityLogs.json');

// Fonction pour charger les données
function loadAutoVoiceData() {
    try {
        if (!fs.existsSync(autoVoiceChannelsPath)) {
            fs.writeFileSync(autoVoiceChannelsPath, '{}');
            return {};
        }
        const data = fs.readFileSync(autoVoiceChannelsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('[AUTO-VOICE] Erreur lors du chargement des données:', error);
        return {};
    }
}

// Fonction pour sauvegarder les données
function saveAutoVoiceData(data) {
    try {
        fs.writeFileSync(autoVoiceChannelsPath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('[AUTO-VOICE] Erreur lors de la sauvegarde des données:', error);
    }
}

// Fonction pour charger les logs d'activité vocale
function loadVoiceActivityLogs() {
    try {
        if (!fs.existsSync(voiceActivityLogsPath)) {
            fs.writeFileSync(voiceActivityLogsPath, '{}');
            return {};
        }
        const data = fs.readFileSync(voiceActivityLogsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('[VOICE-LOGS] Erreur lors du chargement des logs:', error);
        return [];{};
    }
}

// Gestionnaire principal pour les boutons du panneau de gestion
async function handleManagementButtons(interaction) {
    try {
        const [prefix, action, channelId] = interaction.customId.split('_');
        const channel = interaction.guild.channels.cache.get(channelId);
        
        if (!channel) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Salon introuvable')
                .setDescription('Le salon vocal n\'existe plus ou a été supprimé.')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        const autoVoiceData = loadAutoVoiceData();
        const guildId = interaction.guild.id;
        
        // Trouver le propriétaire du salon
        let channelData = null;
        if (autoVoiceData[guildId] && autoVoiceData[guildId].userChannels) {
            channelData = Object.values(autoVoiceData[guildId].userChannels).find(
                data => data.channelId === channelId
            );
        }

        if (!channelData) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ **Données du salon introuvables**')
                .setDescription(`
> 🔍 **Problème détecté**
> Ce salon n'est pas géré par le système de salons vocaux automatiques.

\`\`\`yaml
Salon: ${channel.name}
Type: Non géré par le système
Action: Impossible à exécuter
\`\`\`

**💡 Solution :** Utilisez uniquement ce panneau sur les salons créés automatiquement.
                `)
                .setTimestamp();
            
            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        // Vérifier si l'utilisateur est le propriétaire ou a les permissions
        const isOwner = channelData.ownerId === interaction.user.id;
        const isAuthorized = channelData.authorizedUsers && channelData.authorizedUsers.includes(interaction.user.id);
        
        if (!isOwner && !isAuthorized) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🚫 **Accès Refusé**')
                .setDescription(`
> 🔐 **Permissions insuffisantes**
> Seul le **propriétaire** du salon ou les utilisateurs **autorisés** peuvent utiliser ces contrôles.

\`\`\`yaml
Salon: ${channel.name}
Votre statut: Non autorisé
Action requise: Permission du propriétaire
\`\`\`
                `)
                .addFields([
                    { name: '👑 **Propriétaire du salon**', value: `<@${channelData.ownerId}>`, inline: true },
                    { name: '🔒 **Votre statut**', value: '`❌ Non autorisé`', inline: true },
                    { name: '💡 **Solution**', value: 'Demandez au propriétaire de vous donner des permissions', inline: false }
                ])
                .setTimestamp();
            
            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        // console.log(`[AUTO-VOICE] ${interaction.user.displayName} utilise l'action: ${action} sur le salon: ${channel.name}`);

        switch (action) {
            case 'kick':
                await handleKickAction(interaction, channel, channelData);
                break;
            case 'ban':
                await handleBanAction(interaction, channel, channelData);
                break;
            case 'unban':
                await handleUnbanAction(interaction, channel, channelData);
                break;
            case 'blacklist':
                await handleBlacklistAction(interaction, channel, channelData);
                break;
            case 'permissions':
                await handlePermissionsAction(interaction, channel, channelData);
                break;
            case 'edit':
                await handleEditAction(interaction, channel, channelData);
                break;
            case 'privacy':
                await handlePrivacyAction(interaction, channel, channelData);
                break;
            case 'refresh':
                await handleRefreshAction(interaction, channel, channelData);
                break;
            case 'delete':
                await handleDeleteAction(interaction, channel, channelData);
                break;
            case 'logs':
                await handleLogsAction(interaction, channel, channelData);
                break;
            case 'logs_realtime':
                await handleLogsAction(interaction, channel, channelData);
                break;
            default:
                const unknownEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Action inconnue')
                    .setDescription('Cette action n\'est pas reconnue par le système.')
                    .setTimestamp();
                await interaction.reply({ embeds: [unknownEmbed], flags: MessageFlags.Ephemeral });
        }

    } catch (error) {
        console.error('[AUTO-VOICE] Erreur dans le gestionnaire de boutons:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ System Error')
            .setDescription('An error occurred while processing your request.')
            .setTimestamp();
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }
    }
}

// 🦵 Action: Kick member
async function handleKickAction(interaction, channel, channelData) {
    const members = channel.members.filter(member => member.id !== channelData.ownerId);
    
    if (members.size === 0) {
        const noMembersEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('⚠️ Aucun membre à expulser')
            .setDescription('Il n\'y a aucun membre dans ce salon à part vous.')
            .addFields([
                { name: '💡 Astuce', value: 'Les membres apparaîtront ici dès qu\'ils rejoindront votre salon.', inline: false }
            ])
            .setTimestamp();
        
        return await interaction.reply({ embeds: [noMembersEmbed], flags: MessageFlags.Ephemeral });
    }

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`autovoice_kick_select_${channel.id}`)
        .setPlaceholder('🦵 Sélectionnez un membre à expulser')
        .addOptions(
            members.map(member => ({
                label: member.displayName,
                value: member.id,
                description: `${member.user.tag}`,
                emoji: '🦵'
            }))
        );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const kickEmbed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('🦵 Expulser un membre')
        .setDescription('Sélectionnez le membre que vous souhaitez expulser de votre salon vocal.')
        .addFields([
            { name: '👥 Membres présents', value: `${members.size} membre(s)`, inline: true },
            { name: '⚠️ Note', value: 'Le membre pourra rejoindre à nouveau sauf s\'il est banni.', inline: false }
        ])
        .setTimestamp();

    await interaction.reply({
        embeds: [kickEmbed],
        components: [row],
        flags: MessageFlags.Ephemeral
    });
}

// 🔨 Action: Ban member
async function handleBanAction(interaction, channel, channelData) {
    const members = channel.members.filter(member => member.id !== channelData.ownerId);
    
    if (members.size === 0) {
        const noMembersEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('⚠️ Aucun membre à bannir')
            .setDescription('Il n\'y a aucun membre dans ce salon à part vous.')
            .addFields([
                { name: '💡 Astuce', value: 'Les membres apparaîtront ici dès qu\'ils rejoindront votre salon.', inline: false }
            ])
            .setTimestamp();
        
        return await interaction.reply({ embeds: [noMembersEmbed], flags: MessageFlags.Ephemeral });
    }

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`autovoice_ban_select_${channel.id}`)
        .setPlaceholder('🔨 Sélectionnez un membre à bannir')
        .addOptions(
            members.map(member => ({
                label: member.displayName,
                value: member.id,
                description: `${member.user.tag}`,
                emoji: '🔨'
            }))
        );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const banEmbed = new EmbedBuilder()
        .setColor('#DC143C')
        .setTitle('🔨 Bannir un membre')
        .setDescription('Sélectionnez le membre que vous souhaitez bannir définitivement de votre salon vocal.')
        .addFields([
            { name: '👥 Membres présents', value: `${members.size} membre(s)`, inline: true },
            { name: '🚫 Effet', value: 'Le membre ne pourra plus rejoindre ce salon.', inline: false }
        ])
        .setTimestamp();

    await interaction.reply({
        embeds: [banEmbed],
        components: [row],
        flags: MessageFlags.Ephemeral
    });
}

// 🟢 Action: Unban member
async function handleUnbanAction(interaction, channel, channelData) {
    const autoVoiceData = loadAutoVoiceData();
    const guildId = interaction.guild.id;
    
    if (!channelData.blacklistedUsers || channelData.blacklistedUsers.length === 0) {
        const noBannedEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('⚠️ Aucun membre banni')
            .setDescription('Il n\'y a aucun membre banni dans ce salon.')
            .addFields([
                { name: '💡 Information', value: 'Les membres bannis apparaîtront ici pour pouvoir les débannir.', inline: false }
            ])
            .setTimestamp();
        
        return await interaction.reply({ embeds: [noBannedEmbed], flags: MessageFlags.Ephemeral });
    }

    const selectOptions = [];
    for (const userId of channelData.blacklistedUsers) {
        try {
            const user = await interaction.client.users.fetch(userId);
            selectOptions.push({
                label: user.displayName || user.username,
                value: userId,
                description: `${user.tag}`,
                emoji: '🟢'
            });
        } catch (error) {
            console.error(`[AUTO-VOICE] Impossible de récupérer l'utilisateur ${userId}:`, error);
        }
    }

    if (selectOptions.length === 0) {
        const noValidUsersEmbed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('⚠️ Aucun utilisateur valide trouvé')
            .setDescription('Impossible de récupérer les informations des utilisateurs bannis.')
            .addFields([
                { name: '🔧 Solution', value: 'Vérifiez que les utilisateurs bannis existent toujours.', inline: false }
            ])
            .setTimestamp();
        
        return await interaction.reply({ embeds: [noValidUsersEmbed], flags: MessageFlags.Ephemeral });
    }

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`autovoice_unban_select_${channel.id}`)
        .setPlaceholder('🟢 Sélectionnez un utilisateur à débannir')
        .addOptions(selectOptions);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const unbanEmbed = new EmbedBuilder()
        .setColor('#32CD32')
        .setTitle('🟢 Débannir un membre')
        .setDescription('Sélectionnez l\'utilisateur que vous souhaitez débannir de votre salon vocal.')
        .addFields([
            { name: '🚫 Membres bannis', value: `${selectOptions.length} utilisateur(s)`, inline: true },
            { name: '✅ Effet', value: 'L\'utilisateur pourra à nouveau rejoindre ce salon.', inline: false }
        ])
        .setTimestamp();

    await interaction.reply({
        embeds: [unbanEmbed],
        components: [row],
        flags: MessageFlags.Ephemeral
    });
}

// 🚫 Action: Blacklist user
async function handleBlacklistAction(interaction, channel, channelData) {
    const modal = new ModalBuilder()
        .setCustomId(`autovoice_blacklist_modal_${channel.id}`)
        .setTitle('🚫 Bannir un utilisateur');

    const userInput = new TextInputBuilder()
        .setCustomId('blacklist_user')
        .setLabel('ID utilisateur ou mention')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('123456789012345678 ou @utilisateur')
        .setRequired(true);

    const row = new ActionRowBuilder().addComponents(userInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

// 🔑 Action: Grant permissions
async function handlePermissionsAction(interaction, channel, channelData) {
    const modal = new ModalBuilder()
        .setCustomId(`autovoice_permissions_modal_${channel.id}`)
        .setTitle('🔑 Accorder des permissions');

    const userInput = new TextInputBuilder()
        .setCustomId('permission_user')
        .setLabel('ID utilisateur ou mention')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('123456789012345678 ou @utilisateur')
        .setRequired(true);

    const row = new ActionRowBuilder().addComponents(userInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

// ✏️ Action: Edit channel
async function handleEditAction(interaction, channel, channelData) {
    const modal = new ModalBuilder()
        .setCustomId(`autovoice_edit_modal_${channel.id}`)
        .setTitle('✏️ Modifier le salon');

    const nameInput = new TextInputBuilder()
        .setCustomId('channel_name')
        .setLabel('Nouveau nom du salon')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(channel.name)
        .setRequired(false);

    const limitInput = new TextInputBuilder()
        .setCustomId('user_limit')
        .setLabel('Limite d\'utilisateurs (0 = illimité)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(channel.userLimit.toString())
        .setRequired(false);

    const bitrateInput = new TextInputBuilder()
        .setCustomId('bitrate')
        .setLabel('Débit audio (en kbps, max 384)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder((channel.bitrate / 1000).toString())
        .setRequired(false);

    const firstRow = new ActionRowBuilder().addComponents(nameInput);
    const secondRow = new ActionRowBuilder().addComponents(limitInput);
    const thirdRow = new ActionRowBuilder().addComponents(bitrateInput);

    modal.addComponents(firstRow, secondRow, thirdRow);

    await interaction.showModal(modal);
}

// Gestionnaire pour les sélections de menus
async function handleSelectMenuInteraction(interaction) {
    try {
        const [prefix, action, type, channelId] = interaction.customId.split('_');
        const channel = interaction.guild.channels.cache.get(channelId);
        
        if (!channel) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Salon introuvable')
                .setDescription('Le salon vocal n\'existe plus ou a été supprimé.')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        const autoVoiceData = loadAutoVoiceData();
        const guildId = interaction.guild.id;
        const selectedUserId = interaction.values[0];

        // Trouver les données du salon
        const channelData = Object.values(autoVoiceData[guildId].userChannels).find(
            data => data.channelId === channelId
        );

        if (!channelData) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Données du salon introuvables')
                .setDescription('Ce salon n\'est pas géré par le système de salons vocaux automatiques.')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        switch (action) {
            case 'kick':
                await handleKickSelect(interaction, channel, channelData, selectedUserId);
                break;
            case 'ban':
                await handleBanSelect(interaction, channel, channelData, selectedUserId);
                break;
            case 'unban':
                await handleUnbanSelect(interaction, channel, channelData, selectedUserId);
                break;
        }

    } catch (error) {
        console.error('[AUTO-VOICE] Erreur dans le gestionnaire de sélection:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur système')
            .setDescription('Une erreur s\'est produite lors du traitement de votre sélection.')
            .addFields([
                { name: '🔧 Solution', value: 'Veuillez réessayer dans quelques instants.', inline: false }
            ])
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}

// Gestionnaire pour les sélections de kick
async function handleKickSelect(interaction, channel, channelData, selectedUserId) {
    try {
        const member = await interaction.guild.members.fetch(selectedUserId);
        
        if (member.voice.channel && member.voice.channel.id === channel.id) {
            await member.voice.disconnect('Expulsé par le propriétaire du salon');
            
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('🦵 Membre expulsé')
                .setDescription(`✅ **${member.displayName}** a été expulsé du salon vocal.`)
                .addFields([
                    { name: '👤 Utilisateur expulsé', value: `${member.user.tag} (${member.user.id})`, inline: true },
                    { name: '🎵 Salon', value: `<#${channel.id}>`, inline: true },
                    { name: '⚠️ Note', value: 'L\'utilisateur peut rejoindre à nouveau sauf s\'il est banni.', inline: false }
                ])
                .setTimestamp();
                
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            // console.log(`[AUTO-VOICE] 🦵 ${member.user.tag} expulsé de ${channel.name} par ${interaction.user.tag}`);
        } else {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('⚠️ Utilisateur non présent')
                .setDescription('Cet utilisateur n\'est pas dans le salon vocal.')
                .addFields([
                    { name: '💡 Information', value: 'L\'utilisateur a peut-être quitté le salon entre temps.', inline: false }
                ])
                .setTimestamp();
            
            await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }
    } catch (error) {
        console.error('[AUTO-VOICE] Erreur lors du kick:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur lors de l\'expulsion')
            .setDescription('Impossible d\'expulser cet utilisateur.')
            .addFields([
                { name: '🔧 Causes possibles', value: '• Permissions insuffisantes\n• Utilisateur introuvable\n• Erreur de connexion', inline: false }
            ])
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}

// Gestionnaire pour les sélections de ban
async function handleBanSelect(interaction, channel, channelData, selectedUserId) {
    try {
        const member = await interaction.guild.members.fetch(selectedUserId);
        const autoVoiceData = loadAutoVoiceData();
        const guildId = interaction.guild.id;
        
        // Ajouter à la liste noire
        if (!channelData.blacklistedUsers) {
            channelData.blacklistedUsers = [];
        }
        
        if (!channelData.blacklistedUsers.includes(selectedUserId)) {
            channelData.blacklistedUsers.push(selectedUserId);
            
            // Sauvegarder les données
            const userChannelKey = Object.keys(autoVoiceData[guildId].userChannels).find(
                key => autoVoiceData[guildId].userChannels[key].channelId === channel.id
            );
            if (userChannelKey) {
                autoVoiceData[guildId].userChannels[userChannelKey] = channelData;
                saveAutoVoiceData(autoVoiceData);
            }
        }
        
        // Expulser l'utilisateur s'il est dans le salon
        if (member.voice.channel && member.voice.channel.id === channel.id) {
            await member.voice.disconnect('Banni par le propriétaire du salon');
        }
        
        // Retirer les permissions
        await channel.permissionOverwrites.edit(selectedUserId, {
            Connect: false,
            ViewChannel: false
        });
        
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🔨 Membre banni')
            .setDescription(`✅ **${member.displayName}** a été banni définitivement du salon vocal.`)
            .addFields([
                { name: '👤 Utilisateur banni', value: `${member.user.tag} (${member.user.id})`, inline: true },
                { name: '🎵 Salon', value: `<#${channel.id}>`, inline: true },
                { name: '🚫 Effet', value: 'L\'utilisateur ne peut plus rejoindre ce salon.', inline: false }
            ])
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        // console.log(`[AUTO-VOICE] 🔨 ${member.user.tag} banni de ${channel.name} par ${interaction.user.tag}`);
        
    } catch (error) {
        console.error('[AUTO-VOICE] Erreur lors du ban:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur lors du bannissement')
            .setDescription('Impossible de bannir cet utilisateur.')
            .addFields([
                { name: '🔧 Causes possibles', value: '• Permissions insuffisantes\n• Utilisateur introuvable\n• Erreur de sauvegarde', inline: false }
            ])
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}

// Gestionnaire pour les sélections d'unban
async function handleUnbanSelect(interaction, channel, channelData, selectedUserId) {
    try {
        const user = await interaction.client.users.fetch(selectedUserId);
        const autoVoiceData = loadAutoVoiceData();
        const guildId = interaction.guild.id;
        
        // Retirer de la liste noire
        if (channelData.blacklistedUsers) {
            channelData.blacklistedUsers = channelData.blacklistedUsers.filter(id => id !== selectedUserId);
            
            // Sauvegarder les données
            const userChannelKey = Object.keys(autoVoiceData[guildId].userChannels).find(
                key => autoVoiceData[guildId].userChannels[key].channelId === channel.id
            );
            if (userChannelKey) {
                autoVoiceData[guildId].userChannels[userChannelKey] = channelData;
                saveAutoVoiceData(autoVoiceData);
            }
        }
        
        // Restaurer les permissions
        await channel.permissionOverwrites.edit(selectedUserId, {
            Connect: true,
            ViewChannel: true
        });
        
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🟢 Membre débanni')
            .setDescription(`✅ **${user.displayName || user.username}** a été débanni du salon vocal.`)
            .addFields([
                { name: '👤 Utilisateur débanni', value: `${user.tag} (${user.id})`, inline: true },
                { name: '🎵 Salon', value: `<#${channel.id}>`, inline: true },
                { name: '✅ Effet', value: 'L\'utilisateur peut à nouveau rejoindre ce salon.', inline: false }
            ])
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        // console.log(`[AUTO-VOICE] 🟢 ${user.tag} débanni de ${channel.name} par ${interaction.user.tag}`);
        
    } catch (error) {
        console.error('[AUTO-VOICE] Erreur lors de l\'unban:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur lors du débannissement')
            .setDescription('Impossible de débannir cet utilisateur.')
            .addFields([
                { name: '🔧 Causes possibles', value: '• Permissions insuffisantes\n• Utilisateur introuvable\n• Erreur de sauvegarde', inline: false }
            ])
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}

// Gestionnaire pour les modals
async function handleModalSubmit(interaction) {
    try {
        const [prefix, action, type, channelId] = interaction.customId.split('_');
        const channel = interaction.guild.channels.cache.get(channelId);
        
        if (!channel) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Salon introuvable')
                .setDescription('Le salon vocal n\'existe plus ou a été supprimé.')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        const autoVoiceData = loadAutoVoiceData();
        const guildId = interaction.guild.id;

        // Trouver les données du salon
        const channelData = Object.values(autoVoiceData[guildId].userChannels).find(
            data => data.channelId === channelId
        );

        if (!channelData) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Données du salon introuvables')
                .setDescription('Ce salon n\'est pas géré par le système de salons vocaux automatiques.')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }

        switch (action) {
            case 'blacklist':
                await handleBlacklistModal(interaction, channel, channelData);
                break;
            case 'permissions':
                await handlePermissionsModal(interaction, channel, channelData);
                break;
            case 'edit':
                await handleEditModal(interaction, channel, channelData);
                break;
        }

    } catch (error) {
        console.error('[AUTO-VOICE] Erreur dans le gestionnaire de modal:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur système')
            .setDescription('Une erreur s\'est produite lors du traitement de votre demande.')
            .addFields([
                { name: '🔧 Solution', value: 'Veuillez réessayer dans quelques instants.', inline: false }
            ])
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}

// Gestionnaire pour le modal de blacklist
async function handleBlacklistModal(interaction, channel, channelData) {
    const userInput = interaction.fields.getTextInputValue('blacklist_user');
    let userId = userInput.replace(/[<@!>]/g, '');
    
    try {
        const user = await interaction.client.users.fetch(userId);
        const autoVoiceData = loadAutoVoiceData();
        const guildId = interaction.guild.id;
        
        // Ajouter à la liste noire
        if (!channelData.blacklistedUsers) {
            channelData.blacklistedUsers = [];
        }
        
        if (!channelData.blacklistedUsers.includes(userId)) {
            channelData.blacklistedUsers.push(userId);
            
            // Sauvegarder les données
            const userChannelKey = Object.keys(autoVoiceData[guildId].userChannels).find(
                key => autoVoiceData[guildId].userChannels[key].channelId === channel.id
            );
            if (userChannelKey) {
                autoVoiceData[guildId].userChannels[userChannelKey] = channelData;
                saveAutoVoiceData(autoVoiceData);
            }
        }
        
        // Expulser l'utilisateur s'il est dans le salon
        const member = interaction.guild.members.cache.get(userId);
        if (member && member.voice.channel && member.voice.channel.id === channel.id) {
            await member.voice.disconnect('Mis sur liste noire par le propriétaire du salon');
        }
        
        // Retirer les permissions
        await channel.permissionOverwrites.edit(userId, {
            Connect: false,
            ViewChannel: false
        });
        
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🚫 Utilisateur mis sur liste noire')
            .setDescription(`✅ **${user.displayName || user.username}** a été mis sur liste noire du salon vocal.`)
            .addFields([
                { name: '👤 Utilisateur banni', value: `${user.tag} (${user.id})`, inline: true },
                { name: '🎵 Salon', value: `<#${channel.id}>`, inline: true },
                { name: '🚫 Effet', value: 'L\'utilisateur ne peut plus accéder à ce salon.', inline: false }
            ])
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        // console.log(`[AUTO-VOICE] 🚫 ${user.tag} mis sur liste noire de ${channel.name} par ${interaction.user.tag}`);
        
    } catch (error) {
        console.error('[AUTO-VOICE] Erreur lors du blacklist:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur de liste noire')
            .setDescription('Impossible de mettre cet utilisateur sur liste noire.')
            .addFields([
                { name: '🔧 Causes possibles', value: '• ID utilisateur invalide\n• Utilisateur introuvable\n• Erreur de permissions', inline: false }
            ])
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}

// Gestionnaire pour le modal de permissions
async function handlePermissionsModal(interaction, channel, channelData) {
    const userInput = interaction.fields.getTextInputValue('permission_user');
    let userId = userInput.replace(/[<@!>]/g, '');
    
    try {
        const user = await interaction.client.users.fetch(userId);
        const autoVoiceData = loadAutoVoiceData();
        const guildId = interaction.guild.id;
        
        // Ajouter aux utilisateurs autorisés
        if (!channelData.authorizedUsers) {
            channelData.authorizedUsers = [];
        }
        
        if (!channelData.authorizedUsers.includes(userId)) {
            channelData.authorizedUsers.push(userId);
            
            // Sauvegarder les données
            const userChannelKey = Object.keys(autoVoiceData[guildId].userChannels).find(
                key => autoVoiceData[guildId].userChannels[key].channelId === channel.id
            );
            if (userChannelKey) {
                autoVoiceData[guildId].userChannels[userChannelKey] = channelData;
                saveAutoVoiceData(autoVoiceData);
            }
        }
        
        // Donner les permissions de gestion
        await channel.permissionOverwrites.edit(userId, {
            ViewChannel: true,
            Connect: true,
            Speak: true,
            ManageChannels: true,
            ManageRoles: true,
            MoveMembers: true,
            MuteMembers: true,
            DeafenMembers: true
        });
        
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🔑 Permissions accordées')
            .setDescription(`✅ **${user.displayName || user.username}** a reçu les permissions de gestion pour ce salon vocal.`)
            .addFields([
                { name: '👤 Utilisateur autorisé', value: `${user.tag} (${user.id})`, inline: true },
                { name: '🎵 Salon', value: `<#${channel.id}>`, inline: true },
                { name: '🔧 Permissions', value: '• Voir le salon\n• Se connecter\n• Parler\n• Gérer le salon\n• Déplacer les membres\n• Couper le micro', inline: false }
            ])
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        // console.log(`[AUTO-VOICE] 🔑 ${user.tag} a reçu les permissions pour ${channel.name} par ${interaction.user.tag}`);
        
    } catch (error) {
        console.error('[AUTO-VOICE] Erreur lors de l\'attribution des permissions:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur de permissions')
            .setDescription('Impossible d\'accorder les permissions à cet utilisateur.')
            .addFields([
                { name: '🔧 Causes possibles', value: '• ID utilisateur invalide\n• Utilisateur introuvable\n• Erreur de permissions', inline: false }
            ])
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}

// Gestionnaire pour le modal d'édition
async function handleEditModal(interaction, channel, channelData) {
    const nameInput = interaction.fields.getTextInputValue('channel_name');
    const limitInput = interaction.fields.getTextInputValue('user_limit');
    const bitrateInput = interaction.fields.getTextInputValue('bitrate');
    
    try {
        const updates = {};
        
        if (nameInput && nameInput.trim() !== '') {
            updates.name = nameInput.trim();
        }
        
        if (limitInput && limitInput.trim() !== '') {
            const limit = parseInt(limitInput);
            if (!isNaN(limit) && limit >= 0 && limit <= 99) {
                updates.userLimit = limit;
            }
        }
        
        if (bitrateInput && bitrateInput.trim() !== '') {
            const bitrate = parseInt(bitrateInput);
            if (!isNaN(bitrate) && bitrate >= 8 && bitrate <= 384) {
                updates.bitrate = bitrate * 1000;
            }
        }
        
        if (Object.keys(updates).length > 0) {
            await channel.edit(updates);
            
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✏️ Salon modifié')
                .setDescription('✅ Le salon vocal a été mis à jour avec succès.')
                .addFields([
                    { name: '🎵 Salon', value: `<#${channel.id}>`, inline: true },
                    { name: '📝 Modifications', value: Object.keys(updates).map(key => {
                        if (key === 'bitrate') return `• Débit audio: ${updates[key] / 1000}kbps`;
                        if (key === 'userLimit') return `• Limite d'utilisateurs: ${updates[key] || 'Illimitée'}`;
                        if (key === 'name') return `• Nom: ${updates[key]}`;
                        return `• ${key}: ${updates[key]}`;
                    }).join('\n'), inline: true }
                ])
                .setTimestamp();
                
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            // console.log(`[AUTO-VOICE] ✏️ Salon ${channel.name} modifié par ${interaction.user.tag}`);
        } else {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('⚠️ Aucune modification valide')
                .setDescription('Aucune modification valide n\'a été fournie.')
                .addFields([
                    { name: '💡 Conseils', value: '• Nom: 1-100 caractères\n• Limite: 0-99 utilisateurs\n• Débit: 8-384 kbps', inline: false }
                ])
                .setTimestamp();
            
            await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }
        
    } catch (error) {
        console.error('[AUTO-VOICE] Erreur lors de l\'édition du salon:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur de modification')
            .setDescription('Impossible de modifier le salon vocal.')
            .addFields([
                { name: '🔧 Causes possibles', value: '• Permissions insuffisantes\n• Valeurs invalides\n• Erreur de connexion', inline: false }
            ])
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}

// 🔒 Action: Toggle Privacy
async function handlePrivacyAction(interaction, channel, channelData) {
    try {
        const everyoneRole = interaction.guild.roles.everyone;
        const currentOverwrite = channel.permissionOverwrites.cache.get(everyoneRole.id);
        
        let isCurrentlyPrivate = currentOverwrite && currentOverwrite.deny.has('Connect');
        
        if (isCurrentlyPrivate) {
            // Rendre public
            await channel.permissionOverwrites.edit(everyoneRole, {
                Connect: true,
                ViewChannel: true
            });
            
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🌐 Salon rendu public')
                .setDescription('✅ Votre salon vocal est maintenant accessible à tous les membres du serveur.')
                .addFields([
                    { name: '🎵 Salon', value: `<#${channel.id}>`, inline: true },
                    { name: '🔓 Statut', value: 'Public', inline: true },
                    { name: '👥 Accès', value: 'Tous les membres', inline: true }
                ])
                .setTimestamp();
                
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        } else {
            // Rendre privé
            await channel.permissionOverwrites.edit(everyoneRole, {
                Connect: false,
                ViewChannel: true
            });
            
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('🔒 Salon rendu privé')
                .setDescription('✅ Votre salon vocal est maintenant privé. Seules les personnes autorisées peuvent rejoindre.')
                .addFields([
                    { name: '🎵 Salon', value: `<#${channel.id}>`, inline: true },
                    { name: '🔒 Statut', value: 'Privé', inline: true },
                    { name: '👥 Accès', value: 'Membres autorisés uniquement', inline: true }
                ])
                .setTimestamp();
                
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
        
        // console.log(`[AUTO-VOICE] 🔒 Confidentialité du salon ${channel.name} modifiée par ${interaction.user.tag} (${isCurrentlyPrivate ? 'Public' : 'Privé'})`);
        
    } catch (error) {
        console.error('[AUTO-VOICE] Erreur lors du changement de confidentialité:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur de confidentialité')
            .setDescription('Impossible de modifier la confidentialité du salon.')
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}

// 🔄 Action: Refresh Panel
async function handleRefreshAction(interaction, channel, channelData) {
    try {
        // Importer la fonction createManagementPanel depuis voiceStateUpdate.js
        const { createManagementPanel } = await import('../events/voiceStateUpdate.js');
        
        // Récupérer le propriétaire
        const owner = await interaction.guild.members.fetch(channelData.ownerId);
        
        // Supprimer l'ancien panneau si possible
        try {
            const messages = await channel.messages.fetch({ limit: 50 });
            const botMessages = messages.filter(msg => 
                msg.author.id === interaction.client.user.id && 
                msg.embeds.length > 0 && 
                msg.embeds[0].title?.includes('Panneau de Configuration Vocal')
            );
            
            for (const message of botMessages.values()) {
                await message.delete();
            }
        } catch (deleteError) {
            // console.log('[AUTO-VOICE] Impossible de supprimer l\'ancien panneau:', deleteError.message);
        }
        
        // Créer un nouveau panneau avec les informations mises à jour
        await createManagementPanel(channel, owner);
        
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🔄 Panneau actualisé')
            .setDescription('✅ Le panneau de gestion a été mis à jour avec les informations en temps réel.')
            .addFields([
                { name: '🎵 Salon', value: `<#${channel.id}>`, inline: true },
                { name: '👥 Membres', value: `${channel.members.size} connectés`, inline: true },
                { name: '⏰ Mise à jour', value: 'Maintenant', inline: true }
            ])
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        // console.log(`[AUTO-VOICE] 🔄 Panneau actualisé pour le salon ${channel.name} par ${interaction.user.tag}`);
        
    } catch (error) {
        console.error('[AUTO-VOICE] Erreur lors de l\'actualisation du panneau:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur d\'actualisation')
            .setDescription('Impossible d\'actualiser le panneau de gestion.')
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}

// 🗑️ Action: Delete Channel
async function handleDeleteAction(interaction, channel, channelData) {
    try {
        const confirmEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('⚠️ Confirmation de suppression')
            .setDescription('Êtes-vous sûr de vouloir supprimer définitivement ce salon vocal ?')
            .addFields([
                { name: '🎵 Salon à supprimer', value: `<#${channel.id}>`, inline: true },
                { name: '👥 Membres connectés', value: `${channel.members.size}`, inline: true },
                { name: '⚠️ Attention', value: 'Cette action est irréversible !', inline: false }
            ])
            .setTimestamp();
        
        const confirmButton = new ButtonBuilder()
            .setCustomId(`confirm_delete_${channel.id}`)
            .setLabel('Confirmer la suppression')
            .setEmoji('🗑️')
            .setStyle(ButtonStyle.Danger);
            
        const cancelButton = new ButtonBuilder()
            .setCustomId(`cancel_delete_${channel.id}`)
            .setLabel('Annuler')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Secondary);
        
        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);
        
        await interaction.reply({ embeds: [confirmEmbed], components: [row], flags: MessageFlags.Ephemeral });
        
        // Attendre la confirmation
        const filter = (i) => i.user.id === interaction.user.id && (i.customId.startsWith('confirm_delete_') || i.customId.startsWith('cancel_delete_'));
        const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 });
        
        collector.on('collect', async (i) => {
            if (i.customId.startsWith('confirm_delete_')) {
                try {
                    // Supprimer les données
                    const autoVoiceData = loadAutoVoiceData();
                    const guildId = interaction.guild.id;
                    delete autoVoiceData[guildId].userChannels[channelData.ownerId];
                    saveAutoVoiceData(autoVoiceData);
                    
                    // Supprimer le salon
                    await channel.delete();
                    
                    const successEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('✅ **Salon Supprimé avec Succès**')
                        .setDescription(`
> 🗑️ **Suppression terminée**
> Le salon vocal a été **définitivement supprimé** du serveur.

\`\`\`yaml
Salon supprimé: ${channel.name}
Propriétaire: ${interaction.user.displayName}
Date: ${new Date().toLocaleString('fr-FR')}
\`\`\`

**🔄 Action suivante :** Vous pouvez créer un nouveau salon en rejoignant un salon "Créer Salon Vocal".
                        `)
                        .setTimestamp();
                    
                    await i.update({ embeds: [successEmbed], components: [] });
                    // console.log(`[AUTO-VOICE] 🗑️ Salon ${channel.name} supprimé par ${interaction.user.tag}`);
                    
                } catch (error) {
                    console.error('[AUTO-VOICE] Erreur lors de la suppression:', error);
                    
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ **Erreur de Suppression**')
                        .setDescription(`
> ⚠️ **Problème technique**
> Impossible de supprimer le salon vocal.

\`\`\`yaml
Salon: ${channel.name}
Erreur: Suppression échouée
Statut: Salon toujours actif
\`\`\`

**💡 Solutions possibles :**
• Vérifiez les permissions du bot
• Réessayez dans quelques instants
• Contactez un administrateur si le problème persiste
                        `)
                        .setTimestamp();
                    
                    await i.update({ embeds: [errorEmbed], components: [] });
                }
            } else {
                const cancelEmbed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('❌ Suppression annulée')
                    .setDescription('La suppression du salon a été annulée.')
                    .setTimestamp();
                
                await i.update({ embeds: [cancelEmbed], components: [] });
            }
            collector.stop();
        });
        
        collector.on('end', async (collected) => {
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('⏰ Temps écoulé')
                    .setDescription('La demande de suppression a expiré.')
                    .setTimestamp();
                
                try {
                    await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
                } catch (error) {
                    // console.log('[AUTO-VOICE] Impossible de modifier la réponse expirée');
                }
            }
        });
        
    } catch (error) {
        console.error('[AUTO-VOICE] Erreur lors de la demande de suppression:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Erreur')
            .setDescription('Impossible de traiter la demande de suppression.')
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}

// Gestionnaire pour l'action logs avec temps réel
async function handleLogsAction(interaction, channel, channelData) {
    try {
        const logs = loadVoiceActivityLogs();
        const channelLogs = logs[channel.id] || {};
        
        // Fonction pour formater la durée en temps réel
        function formatDurationRealTime(milliseconds) {
            if (!milliseconds || milliseconds <= 0) return '0s';
            
            const seconds = Math.floor(milliseconds / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 0) return `${days}j ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
            if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
            if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
            return `${seconds}s`;
        }
        
        // Fonction pour formater la date
        function formatDate(dateString) {
            if (!dateString) return 'Jamais';
            const date = new Date(dateString);
            return `<t:${Math.floor(date.getTime() / 1000)}:R>`;
        }
        
        // Fonction pour créer l'embed avec données en temps réel
        function createLogsEmbed() {
            const currentTime = Date.now();
            
            if (Object.keys(channelLogs).length === 0) {
                return new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('📊 **Logs d\'activité vocale - Temps Réel**')
                    .setDescription(`
> 📋 **Aucune activité enregistrée**
> Ce salon n'a pas encore d'historique d'activité vocale.

\`\`\`yaml
Salon: ${channel.name}
Statut: Nouveau salon
Activité: Aucune donnée
Mise à jour: ${new Date().toLocaleTimeString('fr-FR')}
\`\`\`

**💡 Info :** Les logs commenceront à s'enregistrer dès que des utilisateurs rejoindront ce salon.
                    `)
                    .setTimestamp();
            }
            
            // Identifier les utilisateurs actuellement connectés
            const connectedMembers = channel.members.filter(member => !member.user.bot);
            const connectedUserIds = connectedMembers.map(member => member.id);
            
            // Calculer les sessions en cours
            const activeSessions = [];
            connectedUserIds.forEach(userId => {
                const userData = channelLogs[userId];
                if (userData && userData.sessions && userData.sessions.length > 0) {
                    const lastSession = userData.sessions[userData.sessions.length - 1];
                    if (lastSession.joinTime && !lastSession.leaveTime) {
                        const sessionDuration = currentTime - new Date(lastSession.joinTime).getTime();
                        activeSessions.push({
                            username: userData.username,
                            joinTime: new Date(lastSession.joinTime),
                            currentDuration: sessionDuration,
                            userId: userId
                        });
                    }
                }
            });
            
            // Trier les utilisateurs par nombre de connexions
            const sortedUsers = Object.entries(channelLogs)
                .sort(([,a], [,b]) => b.joinCount - a.joinCount)
                .slice(0, 8); // Top 8 pour laisser place aux sessions actives
            
            // Calculer les statistiques globales
            const totalUsers = Object.keys(channelLogs).length;
            const totalConnections = Object.values(channelLogs).reduce((sum, user) => sum + user.joinCount, 0);
            const totalTimeSpent = Object.values(channelLogs).reduce((sum, user) => sum + (user.totalTimeSpent || 0), 0);
            
            // Ajouter le temps des sessions en cours au total
            const currentSessionTime = activeSessions.reduce((sum, session) => sum + session.currentDuration, 0);
            const totalTimeWithCurrent = totalTimeSpent + currentSessionTime;
            
            // Créer l'embed principal
            const logsEmbed = new EmbedBuilder()
                .setColor('#00FF88')
                .setTitle('📊 **Logs d\'activité vocale - Temps Réel**')
                .setDescription(`
> 🎯 **Statistiques du salon**
> Données mises à jour en temps réel toutes les 10 secondes.

\`\`\`yaml
Salon: ${channel.name}
Utilisateurs uniques: ${totalUsers}
Connexions totales: ${totalConnections}
Temps total passé: ${formatDurationRealTime(totalTimeWithCurrent)}
Connectés maintenant: ${connectedMembers.size} personne${connectedMembers.size > 1 ? 's' : ''}
Mise à jour: ${new Date().toLocaleTimeString('fr-FR')}
\`\`\`
                `)
                .setTimestamp();
            
            // Ajouter les sessions actives en temps réel
            if (activeSessions.length > 0) {
                const activeSessionsText = activeSessions.map(session => {
                    return `🟢 **${session.username}**\n` +
                           `   └ Session en cours: ${formatDurationRealTime(session.currentDuration)}\n` +
                           `   └ Connecté depuis: ${formatDate(session.joinTime.toISOString())}`;
                }).join('\n\n');
                
                logsEmbed.addFields([
                    { 
                        name: '🔴 **Sessions actives en temps réel**', 
                        value: activeSessionsText.length > 1024 ? activeSessionsText.substring(0, 1021) + '...' : activeSessionsText, 
                        inline: false 
                    }
                ]);
            }
            
            // Ajouter le top des utilisateurs
            if (sortedUsers.length > 0) {
                const topUsersText = sortedUsers.map(([userId, userData], index) => {
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                    const isOnline = connectedUserIds.includes(userId) ? '🟢' : '⚫';
                    
                    // Calculer le temps total incluant la session en cours si applicable
                    let totalTime = userData.totalTimeSpent || 0;
                    if (connectedUserIds.includes(userId)) {
                        const activeSession = activeSessions.find(s => s.userId === userId);
                        if (activeSession) {
                            totalTime += activeSession.currentDuration;
                        }
                    }
                    
                    return `${medal} ${isOnline} **${userData.username}**\n` +
                           `   └ ${userData.joinCount} connexions • ${formatDurationRealTime(totalTime)} total\n` +
                           `   └ Dernière visite: ${formatDate(userData.lastJoin)}`;
                }).join('\n\n');
                
                logsEmbed.addFields([
                    { 
                        name: '👥 **Top utilisateurs les plus actifs**', 
                        value: topUsersText.length > 1024 ? topUsersText.substring(0, 1021) + '...' : topUsersText, 
                        inline: false 
                    }
                ]);
            }
            
            return logsEmbed;
        }
        
        // Boutons pour actualisation automatique et manuelle
        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`autovoice_logs_realtime_${channel.id}`)
                    .setLabel('Mode Temps Réel (10s)')
                    .setEmoji('🔴')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`autovoice_logs_${channel.id}`)
                    .setLabel('Actualiser maintenant')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        // Envoyer la réponse initiale
        const initialEmbed = createLogsEmbed();
        const response = await interaction.reply({ 
            embeds: [initialEmbed], 
            components: [actionButtons],
            flags: MessageFlags.Ephemeral,
            fetchReply: true
        });
        
        // Système de mise à jour automatique toutes les 10 secondes
        let updateCount = 0;
        const maxUpdates = 30; // 5 minutes maximum (30 * 10s)
        
        const updateInterval = setInterval(async () => {
            try {
                updateCount++;
                
                // Arrêter après 5 minutes pour éviter la surcharge
                if (updateCount >= maxUpdates) {
                    clearInterval(updateInterval);
                    
                    // Message final indiquant l'arrêt de la mise à jour
                    const finalEmbed = createLogsEmbed()
                        .setColor('#FF6B6B')
                        .setFooter({ text: '⏰ Mise à jour automatique arrêtée après 5 minutes. Cliquez sur "Actualiser" pour continuer.' });
                    
                    const finalButtons = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`autovoice_logs_${channel.id}`)
                                .setLabel('Actualiser les logs')
                                .setEmoji('🔄')
                                .setStyle(ButtonStyle.Primary)
                        );
                    
                    await response.edit({ 
                        embeds: [finalEmbed], 
                        components: [finalButtons] 
                    });
                    return;
                }
                
                // Recharger les logs pour avoir les données les plus récentes
                const updatedLogs = loadVoiceActivityLogs();
                Object.assign(channelLogs, updatedLogs[channel.id] || {});
                
                // Créer l'embed mis à jour
                const updatedEmbed = createLogsEmbed();
                
                // Mettre à jour le message
                await response.edit({ 
                    embeds: [updatedEmbed], 
                    components: [actionButtons] 
                });
                
            } catch (error) {
                console.error('[VOICE-LOGS] ❌ Erreur lors de la mise à jour automatique:', error);
                clearInterval(updateInterval);
            }
        }, 10000); // Mise à jour toutes les 10 secondes
        
        // console.log(`[VOICE-LOGS] ✅ Logs temps réel démarrés pour ${interaction.user.displayName} - Canal: ${channel.name}`);
        
    } catch (error) {
        console.error('[VOICE-LOGS] ❌ Erreur lors de l\'affichage des logs:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ **Erreur lors du chargement des logs**')
            .setDescription(`
> 🔧 **Problème technique**
> Impossible de charger les logs d'activité vocale.

\`\`\`yaml
Erreur: ${error.message}
Canal: ${channel.name}
Action: Chargement des logs temps réel
\`\`\`

**💡 Solution :** Réessayez dans quelques instants ou contactez un administrateur.
            `)
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
    }
}

export {
    handleManagementButtons,
    handleSelectMenuInteraction,
    handleModalSubmit,
    handleLogsAction,
    loadAutoVoiceData,
    saveAutoVoiceData
};