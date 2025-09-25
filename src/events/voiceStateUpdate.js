import { Events, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { sendVoiceLog } from '../utils/logs.js';
import { createInfoEmbed, createSuccessEmbed, createErrorEmbed } from '../utils/embeds.js';
import voiceXPHandler from '../utils/voiceXpHandler.js';

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
        return {};
    }
}

// Fonction pour sauvegarder les logs d'activité vocale
function saveVoiceActivityLogs(data) {
    try {
        fs.writeFileSync(voiceActivityLogsPath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('[VOICE-LOGS] Erreur lors de la sauvegarde des logs:', error);
    }
}

// Fonction pour enregistrer l'activité vocale
function logVoiceActivity(channelId, userId, username, action, timestamp = new Date()) {
    try {
        const logs = loadVoiceActivityLogs();
        
        // Initialiser la structure si elle n'existe pas
        if (!logs[channelId]) {
            logs[channelId] = {};
        }
        if (!logs[channelId][userId]) {
            logs[channelId][userId] = {
                username: username,
                joinCount: 0,
                totalTimeSpent: 0,
                sessions: [],
                lastJoin: null,
                lastLeave: null
            };
        }
        
        const userLog = logs[channelId][userId];
        userLog.username = username; // Mettre à jour le nom d'utilisateur
        
        if (action === 'join') {
            userLog.joinCount++;
            userLog.lastJoin = timestamp.toISOString();
            userLog.sessions.push({
                joinTime: timestamp.toISOString(),
                leaveTime: null,
                duration: null
            });
        } else if (action === 'leave') {
            userLog.lastLeave = timestamp.toISOString();
            
            // Trouver la session en cours et calculer la durée
            const currentSession = userLog.sessions.find(session => session.leaveTime === null);
            if (currentSession) {
                const joinTime = new Date(currentSession.joinTime);
                const duration = timestamp - joinTime;
                currentSession.leaveTime = timestamp.toISOString();
                currentSession.duration = duration;
                userLog.totalTimeSpent += duration;
            }
        }
        
        saveVoiceActivityLogs(logs);
        // Suppression du console.log pour nettoyer les logs
    } catch (error) {
        console.error('[VOICE-LOGS] ❌ Erreur lors de l\'enregistrement de l\'activité:', error);
    }
}

// Fonction pour créer des embeds de logs vocaux détaillés
function createVoiceLogEmbed(member, action, channel, additionalInfo = {}) {
    const timestamp = new Date();
    const user = member.user;
    
    let color, emoji, title, description;
    
    switch (action) {
        case 'join':
            color = '#00FF88'; // Vert
            emoji = '🎤';
            title = 'Utilisateur rejoint un salon vocal';
            description = `${user.displayName} a rejoint **${channel.name}**`;
            break;
        case 'leave':
            color = '#FF4444'; // Rouge
            emoji = '🚪';
            title = 'Utilisateur quitte un salon vocal';
            description = `${user.displayName} a quitté **${channel.name}**`;
            break;
        case 'switch':
            color = '#FFB347'; // Orange
            emoji = '🔄';
            title = 'Utilisateur change de salon vocal';
            description = `${user.displayName} est passé de **${additionalInfo.oldChannel}** vers **${additionalInfo.newChannel}**`;
            break;
        default:
            color = '#7289DA';
            emoji = '🎙️';
            title = 'Activité vocale';
            description = `Activité de ${user.displayName}`;
    }
    
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} ${title}`)
        .setDescription(description)
        .addFields([
            { name: '👤 Utilisateur', value: `<@${user.id}>\n\`${user.tag}\``, inline: true },
            { name: '🎯 Salon', value: `<#${channel.id}>\n\`${channel.name}\``, inline: true },
            { name: '🕐 Heure', value: `<t:${Math.floor(timestamp.getTime() / 1000)}:T>\n<t:${Math.floor(timestamp.getTime() / 1000)}:R>`, inline: true }
        ])
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setFooter({ 
            text: `ID: ${user.id} • Logs vocaux en temps réel`, 
            iconURL: channel.guild.iconURL({ dynamic: true }) 
        })
        .setTimestamp();
    
    // Ajouter des informations supplémentaires selon l'action
    if (action === 'join') {
        const membersInChannel = channel.members.size;
        embed.addFields([
            { name: '📊 Membres dans le salon', value: `${membersInChannel} membre${membersInChannel > 1 ? 's' : ''}`, inline: true }
        ]);
    }
    
    if (action === 'leave' && additionalInfo.sessionDuration) {
        const duration = formatDuration(additionalInfo.sessionDuration);
        embed.addFields([
            { name: '⏱️ Durée de la session', value: duration, inline: true }
        ]);
    }
    
    return embed;
}

// Fonction pour formater la durée
function formatDuration(milliseconds) {
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

// Fonction pour créer le panneau de gestion avec informations en temps réel
async function createManagementPanel(voiceChannel, owner) {
    try {
        // Récupérer les informations en temps réel du salon
        const memberCount = voiceChannel.members.size;
        const membersList = voiceChannel.members.map(member => member.displayName).join(', ') || 'Aucun membre';
        
        // Déterminer le statut de confidentialité
        const everyoneOverwrite = voiceChannel.permissionOverwrites.cache.get(voiceChannel.guild.roles.everyone.id);
        let privacyStatus = '🌐 **Public**';
        let privacyDescription = 'Tout le monde peut rejoindre ce salon';
        let isPrivate = false;
        let privacyButtonEmoji = '🔓';
        let privacyButtonLabel = 'Rendre privé';
        
        if (everyoneOverwrite && everyoneOverwrite.deny.has('Connect')) {
            privacyStatus = '🔒 **Privé**';
            privacyDescription = 'Seules les personnes autorisées peuvent rejoindre';
            isPrivate = true;
            privacyButtonEmoji = '🔒';
            privacyButtonLabel = 'Rendre public';
        }
        
        // Informations sur les limites et qualité
        const userLimit = voiceChannel.userLimit || 'Illimitée';
        const bitrate = Math.round(voiceChannel.bitrate / 1000);
        const region = voiceChannel.rtcRegion || 'Automatique';
        
        // Récupérer les données du salon pour les utilisateurs bannis
        const autoVoiceData = loadAutoVoiceData();
        const guildId = voiceChannel.guild.id;
        const channelData = Object.values(autoVoiceData[guildId]?.userChannels || {}).find(
            data => data.channelId === voiceChannel.id
        );
        const bannedCount = channelData?.blacklistedUsers?.length || 0;
        const authorizedCount = channelData?.authorizedUsers?.length || 0;

        const embed = new EmbedBuilder()
            .setTitle('🎤 **Panneau de Configuration Vocal**')
            .setDescription(`
> **🏠 Propriétaire :** \`${owner.displayName}\`
> **📍 Salon :** \`${voiceChannel.name}\`
> 
> ${privacyStatus} • *${privacyDescription}*

## 🎯 **Bienvenue dans votre salon vocal personnel !**

Vous êtes maintenant le **propriétaire** de ce salon vocal. Utilisez les boutons ci-dessous pour personnaliser et gérer votre espace selon vos préférences.

### ✨ **Fonctionnalités disponibles :**
\`\`\`
👥 Gestion des Membres
   • Expulser des membres indésirables
   • Bannir/Débannir des utilisateurs
   
🔒 Contrôle d'Accès  
   • Basculer entre public/privé
   • Gérer les permissions spéciales
   
⚙️ Personnalisation
   • Modifier le nom du salon
   • Ajuster la limite d'utilisateurs
   • Configurer la qualité audio
\`\`\`

> 🔒 **Note importante :** Seul le **propriétaire** du salon peut utiliser ces commandes.
            `)
            .setColor('#5865F2')
            .addFields([
                {
                    name: '👥 **Membres Connectés**',
                    value: `\`\`\`yaml\nTotal: ${memberCount} ${memberCount === 1 ? 'personne' : 'personnes'}\n\`\`\`${memberCount > 0 ? `**Membres :** \`${membersList.length > 50 ? membersList.substring(0, 47) + '...' : membersList}\`` : '> *🔇 Salon actuellement vide*'}`,
                    inline: true
                },
                {
                    name: '⚙️ **Configuration du Salon**',
                    value: `\`\`\`yaml\nLimite: ${userLimit === 0 ? 'Illimitée' : userLimit + ' personnes'}\nQualité: ${bitrate} kbps\nRégion: ${region}\n\`\`\``,
                    inline: true
                },
                {
                    name: '🛡️ **Sécurité & Permissions**',
                    value: `\`\`\`yaml\nBannis: ${bannedCount} utilisateur${bannedCount > 1 ? 's' : ''}\nAutorisés: ${authorizedCount} permission${authorizedCount > 1 ? 's' : ''}\n\`\`\`**Statut :** ${privacyStatus.replace(/\*\*/g, '')}`,
                    inline: true
                }
            ])
            .setThumbnail(owner.displayAvatarURL({ dynamic: true }))
            .setFooter({ 
                text: `🎮 Système Auto Voice Channels • Dernière mise à jour`, 
                iconURL: voiceChannel.guild.iconURL({ dynamic: true }) 
            })
            .setTimestamp();

        // Première rangée - Gestion des membres
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`autovoice_kick_${voiceChannel.id}`)
                    .setLabel(memberCount <= 1 ? 'Aucun membre à expulser' : `Expulser (${memberCount - 1} membres)`)
                    .setEmoji(memberCount <= 1 ? '😴' : '🦵')
                    .setStyle(memberCount <= 1 ? ButtonStyle.Secondary : ButtonStyle.Danger)
                    .setDisabled(memberCount <= 1), // Désactiver s'il n'y a personne à expulser
                new ButtonBuilder()
                    .setCustomId(`autovoice_ban_${voiceChannel.id}`)
                    .setLabel(memberCount <= 1 ? 'Aucun membre à bannir' : `Bannir du salon`)
                    .setEmoji(memberCount <= 1 ? '😴' : '🔨')
                    .setStyle(memberCount <= 1 ? ButtonStyle.Secondary : ButtonStyle.Danger)
                    .setDisabled(memberCount <= 1), // Désactiver s'il n'y a personne à bannir
                new ButtonBuilder()
                    .setCustomId(`autovoice_unban_${voiceChannel.id}`)
                    .setLabel(bannedCount === 0 ? 'Aucun membre banni' : `Débannir (${bannedCount} bannis)`)
                    .setEmoji(bannedCount === 0 ? '✅' : '🔓')
                    .setStyle(bannedCount === 0 ? ButtonStyle.Secondary : ButtonStyle.Success)
                    .setDisabled(bannedCount === 0) // Désactiver s'il n'y a personne à débannir
            );

        // Deuxième rangée - Configuration et permissions
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`autovoice_privacy_${voiceChannel.id}`)
                    .setLabel(privacyButtonLabel)
                    .setEmoji(privacyButtonEmoji)
                    .setStyle(isPrivate ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`autovoice_permissions_${voiceChannel.id}`)
                    .setLabel(authorizedCount > 0 ? `Permissions (${authorizedCount} autorisés)` : 'Gérer les permissions')
                    .setEmoji(authorizedCount > 0 ? '🔑' : '🗝️')
                    .setStyle(authorizedCount > 0 ? ButtonStyle.Success : ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`autovoice_edit_${voiceChannel.id}`)
                    .setLabel('Modifier le salon')
                    .setEmoji('⚙️')
                    .setStyle(ButtonStyle.Secondary)
            );

        // Troisième rangée - Actions spéciales
        const row3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`autovoice_refresh_${voiceChannel.id}`)
                    .setLabel(`Actualiser (${memberCount} connectés)`)
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`autovoice_logs_${voiceChannel.id}`)
                    .setLabel('Voir les logs')
                    .setEmoji('📊')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`autovoice_delete_${voiceChannel.id}`)
                    .setLabel(memberCount > 1 ? `Supprimer (${memberCount} membres)` : 'Supprimer le salon')
                    .setEmoji(memberCount > 1 ? '⚠️' : '🗑️')
                    .setStyle(memberCount > 1 ? ButtonStyle.Danger : ButtonStyle.Secondary)
            );

        // Envoyer le panneau dans le chat textuel du salon vocal
        const panelMessage = await voiceChannel.send({ 
            embeds: [embed], 
            components: [row1, row2, row3] 
        });

        console.log(`[AUTO-VOICE] ✅ Panneau de configuration envoyé avec succès pour ${owner.displayName} (${memberCount} membres connectés)`);
        return panelMessage;

    } catch (error) {
        console.error('[AUTO-VOICE] ❌ Erreur lors de la création du panneau de gestion:', error);
        return null;
    }
}

// Exporter la fonction createManagementPanel pour utilisation dans les handlers
export { createManagementPanel };

export default {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        try {
            // Suppression du console.log DEBUG pour nettoyer les logs
            
            const autoVoiceData = loadAutoVoiceData();
            const guildId = newState.guild.id;
            
            // Initialiser les données du serveur si nécessaire
            if (!autoVoiceData[guildId]) {
                autoVoiceData[guildId] = {
                    masterChannels: [],
                    userChannels: {}
                };
            }

            // 📊 ENREGISTREMENT DES LOGS D'ACTIVITÉ VOCALE
            const member = newState.member || oldState.member;
            const timestamp = new Date();
            
            // Utilisateur rejoint un canal vocal
            if (!oldState.channelId && newState.channelId) {
                // Suppression du console.log DEBUG pour nettoyer les logs
                logVoiceActivity(newState.channelId, member.id, member.displayName, 'join', timestamp);
                
                // 🎙️ LOGS DISCORD EN TEMPS RÉEL - REJOINDRE
                const joinEmbed = createVoiceLogEmbed(member, 'join', newState.channel);
                // Suppression du console.log DEBUG pour nettoyer les logs
                const result = await sendVoiceLog(newState.client, guildId, joinEmbed);
                // Suppression du console.log DEBUG pour nettoyer les logs
                
                // 📈 SYSTÈME XP VOCAL - REJOINDRE
                try {
                    await voiceXPHandler.handleVoiceJoin(member, newState.channel);
                } catch (xpError) {
                    console.error('[XP-SYSTEM] ❌ Erreur lors de l\'entrée vocale XP:', xpError);
                }
            }
            
            // Utilisateur quitte un canal vocal
            if (oldState.channelId && !newState.channelId) {
                // Calculer la durée de la session pour les logs
                const logs = loadVoiceActivityLogs();
                const userLog = logs[oldState.channelId]?.[member.id];
                let sessionDuration = null;
                
                if (userLog && userLog.sessions.length > 0) {
                    const lastSession = userLog.sessions[userLog.sessions.length - 1];
                    if (lastSession && lastSession.joinTime && !lastSession.leaveTime) {
                        const joinTime = new Date(lastSession.joinTime);
                        sessionDuration = timestamp - joinTime;
                    }
                }
                
                logVoiceActivity(oldState.channelId, member.id, member.displayName, 'leave', timestamp);
                
                // 🎙️ LOGS DISCORD EN TEMPS RÉEL - QUITTER
                // Suppression du console.log DEBUG pour nettoyer les logs
                const leaveEmbed = createVoiceLogEmbed(member, 'leave', oldState.channel, { sessionDuration });
                // Suppression du console.log DEBUG pour nettoyer les logs
                const result = await sendVoiceLog(oldState.client, guildId, leaveEmbed);
                // Suppression du console.log DEBUG pour nettoyer les logs
                
                // 📈 SYSTÈME XP VOCAL - QUITTER
                try {
                    await voiceXPHandler.handleVoiceLeave(member, oldState.channel);
                } catch (xpError) {
                    console.error('[XP-SYSTEM] ❌ Erreur lors de la sortie vocale XP:', xpError);
                }
            }
            
            // Utilisateur change de canal vocal
            if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
                logVoiceActivity(oldState.channelId, member.id, member.displayName, 'leave', timestamp);
                logVoiceActivity(newState.channelId, member.id, member.displayName, 'join', timestamp);
                
                // 🎙️ LOGS DISCORD EN TEMPS RÉEL - CHANGEMENT
                const switchEmbed = createVoiceLogEmbed(member, 'switch', newState.channel, {
                    oldChannel: oldState.channel.name,
                    newChannel: newState.channel.name
                });
                await sendVoiceLog(newState.client, guildId, switchEmbed);
                
                // 📈 SYSTÈME XP VOCAL - CHANGEMENT DE CANAL
                try {
                    await voiceXPHandler.handleVoiceMove(member, oldState.channel, newState.channel);
                } catch (xpError) {
                    console.error('[XP-SYSTEM] ❌ Erreur lors du changement de canal XP:', xpError);
                }
            }

            // Configuration des salons maîtres (vous pouvez modifier ces IDs)
            const masterChannelNames = ['🎧 Özel Oda Oluştur', 'Create Voice Channel', 'Créer Salon Vocal'];
            
            // Trouver les salons maîtres dans ce serveur
            const masterChannels = newState.guild.channels.cache.filter(channel => 
                channel.type === ChannelType.GuildVoice && 
                masterChannelNames.some(name => channel.name.includes(name) || channel.name.toLowerCase().includes(name.toLowerCase()))
            );

            // Mettre à jour la liste des salons maîtres
            autoVoiceData[guildId].masterChannels = masterChannels.map(ch => ch.id);

            // 🎯 CRÉATION DE SALON VOCAL
            if (newState.channelId && masterChannels.has(newState.channelId)) {
                const joinedChannel = newState.channel;
                const member = newState.member;
                const userId = member.id;

                // Suppression du console.log pour nettoyer les logs

                 // Vérifier si l'utilisateur possède déjà un salon
                 const existingChannelId = autoVoiceData[guildId].userChannels[userId]?.channelId;
                 if (existingChannelId) {
                     const existingChannel = newState.guild.channels.cache.get(existingChannelId);
                     if (existingChannel) {
                         // Suppression du console.log pour nettoyer les logs
                         // Déplacer l'utilisateur vers son salon existant
                         try {
                             await member.voice.setChannel(existingChannel);
                             // Suppression du console.log pour nettoyer les logs
                             return;
                         } catch (error) {
                             console.error(`[AUTO-VOICE] ❌ Erreur lors du déplacement de ${member.displayName} vers le salon existant:`, error);
                         }
                     } else {
                         // Le salon n'existe plus, nettoyer les données
                         // Suppression du console.log pour nettoyer les logs
                         delete autoVoiceData[guildId].userChannels[userId];
                         saveAutoVoiceData(autoVoiceData);
                     }
                 }

                try {
                    // Créer un nouveau salon vocal
                    // Suppression du console.log pour nettoyer les logs
                    
                    // 🔄 Récupérer les paramètres de la catégorie parent pour synchronisation
                    const parentCategory = joinedChannel.parent;
                    let categoryPermissions = [];
                    let inheritedBitrate = 64000; // Valeur par défaut
                    let inheritedUserLimit = 0; // Valeur par défaut (illimité)
                    
                    if (parentCategory) {
                        // Suppression du console.log pour nettoyer les logs
                        
                        // Copier les permissions de la catégorie
                        categoryPermissions = parentCategory.permissionOverwrites.cache.map(overwrite => ({
                            id: overwrite.id,
                            type: overwrite.type,
                            allow: overwrite.allow.bitfield,
                            deny: overwrite.deny.bitfield
                        }));
                        
                        // Hériter du bitrate et de la limite d'utilisateurs si définis dans la catégorie
                        // (On peut utiliser les paramètres du salon maître comme référence)
                        inheritedBitrate = joinedChannel.bitrate || 64000;
                        inheritedUserLimit = joinedChannel.userLimit || 0;
                        
                        // Suppression du console.log pour nettoyer les logs
                    }
                    
                    // Créer les permissions personnalisées en combinant celles de la catégorie avec les permissions spéciales
                    const customPermissions = [
                        ...categoryPermissions,
                        // Permissions spéciales pour le propriétaire (priorité sur les permissions de catégorie)
                        {
                            id: userId,
                            allow: [
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.Connect,
                                PermissionFlagsBits.Speak,
                                PermissionFlagsBits.MuteMembers,
                                PermissionFlagsBits.DeafenMembers,
                                PermissionFlagsBits.MoveMembers,
                                PermissionFlagsBits.ManageChannels,
                                PermissionFlagsBits.ManageRoles
                            ],
                        },
                        // Permissions spéciales pour le bot (priorité sur les permissions de catégorie)
                        {
                            id: newState.client.user.id,
                            allow: [
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.Connect,
                                PermissionFlagsBits.Speak,
                                PermissionFlagsBits.MuteMembers,
                                PermissionFlagsBits.DeafenMembers,
                                PermissionFlagsBits.MoveMembers,
                                PermissionFlagsBits.ManageChannels,
                                PermissionFlagsBits.ManageRoles
                            ],
                        }
                    ];
                    
                    const newChannel = await newState.guild.channels.create({
                        name: `🎤 ${member.displayName}`,
                        type: ChannelType.GuildVoice,
                        parent: joinedChannel.parent,
                        position: joinedChannel.position + 1,
                        bitrate: inheritedBitrate,
                        userLimit: inheritedUserLimit,
                        permissionOverwrites: customPermissions
                    });

                    // Suppression des console.log pour nettoyer les logs

                    // Déplacer l'utilisateur vers le nouveau salon
                    // Suppression du console.log pour nettoyer les logs
                    await member.voice.setChannel(newChannel);
                    // Suppression du console.log pour nettoyer les logs

                    // Enregistrer les données
                    autoVoiceData[guildId].userChannels[userId] = {
                        channelId: newChannel.id,
                        ownerId: userId,
                        createdAt: Date.now(),
                        bannedUsers: [],
                        blacklistedUsers: []
                    };
                    saveAutoVoiceData(autoVoiceData);
                    // Suppression du console.log pour nettoyer les logs

                    // Envoyer le panneau de gestion
                    // Suppression du console.log pour nettoyer les logs
                    await createManagementPanel(newChannel, member);
                    // Suppression du console.log pour nettoyer les logs

                } catch (error) {
                    console.error(`[AUTO-VOICE] ❌ Erreur critique lors de la création du salon pour ${member.displayName}:`, error);
                }
            }

            // 🗑️ NETTOYAGE AUTOMATIQUE
            if (oldState.channelId && !newState.channelId) {
                // L'utilisateur a quitté un salon vocal
                const leftChannel = oldState.channel;
                
                // Vérifier si c'est un salon auto-créé
                const channelData = Object.values(autoVoiceData[guildId].userChannels).find(
                    data => data.channelId === leftChannel.id
                );

                if (channelData) {
                    // Vérifier si le salon est maintenant vide
                    if (leftChannel.members.size === 0) {
                        // Suppression du console.log pour nettoyer les logs
                        
                        try {
                            // Supprimer le salon
                            await leftChannel.delete();
                            // Suppression du console.log pour nettoyer les logs

                            // Nettoyer les données
                            const ownerId = channelData.ownerId;
                            delete autoVoiceData[guildId].userChannels[ownerId];
                            saveAutoVoiceData(autoVoiceData);
                            // Suppression du console.log pour nettoyer les logs
                            
                        } catch (error) {
                            console.error(`[AUTO-VOICE] ❌ Erreur lors de la suppression du salon "${leftChannel.name}":`, error);
                        }
                    }
                }
            }

            // 📈 SYSTÈME XP VOCAL - CHANGEMENTS D'ÉTAT (mute/deaf)
            // Gérer les changements d'état vocal uniquement si l'utilisateur reste dans le même canal
            if (oldState.channelId && newState.channelId && oldState.channelId === newState.channelId) {
                const stateChanged = (
                    oldState.selfMute !== newState.selfMute ||
                    oldState.selfDeaf !== newState.selfDeaf ||
                    oldState.serverMute !== newState.serverMute ||
                    oldState.serverDeaf !== newState.serverDeaf
                );
                
                if (stateChanged) {
                    try {
                        await voiceXPHandler.handleVoiceStateChange(oldState, newState);
                    } catch (xpError) {
                        console.error('[XP-SYSTEM] ❌ Erreur lors du changement d\'état vocal XP:', xpError);
                    }
                }
            }

        } catch (error) {
            console.error('[AUTO-VOICE] Erreur dans voiceStateUpdate:', error.message);
            console.error(error.stack);
        }
    }
};