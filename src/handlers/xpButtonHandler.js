import { Collection } from 'discord.js';
import messageXPHandler from '../utils/messageXpHandler.js';
import voiceXPHandler from '../utils/voiceXpHandler.js';
import XPCalculator from '../utils/xpCalculator.js';
import XPEmbeds from '../utils/xpEmbeds.js';

// Cache pour les données de pagination
const paginationCache = new Collection();

/**
 * Gère les interactions de boutons XP
 */
export async function handleXPButtonInteraction(interaction) {
    try {
        const customId = interaction.customId;
        
        // Gestion des boutons de classement XP
        if (customId.startsWith('leaderboard_')) {
            await handleLeaderboardButton(interaction);
        }
        // Gestion des boutons de configuration XP
        else if (customId.startsWith('config_')) {
            await handleConfigButton(interaction);
        }
        else {
            console.warn(`[XP-BUTTONS] ⚠️ Bouton XP non géré: ${customId}`);
            await interaction.reply({ content: '❌ Cette interaction n\'est pas encore implémentée.', ephemeral: true });
        }
    } catch (error) {
        console.error('[XP-BUTTONS] ❌ Erreur lors du traitement du bouton XP:', error);
        
        const errorMessage = '❌ Une erreur est survenue lors du traitement de votre demande.';
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
}

/**
 * Gère les boutons de navigation du classement
 */
async function handleLeaderboardButton(interaction) {
    await interaction.deferUpdate();
    
    const [, action, type] = interaction.customId.split('_');
    const messageId = interaction.message.id;
    
    // Récupérer ou créer les données de pagination
    let paginationData = paginationCache.get(messageId);
    if (!paginationData) {
        paginationData = {
            type: type || 'global',
            page: 1,
            totalPages: 1,
            lastUpdate: Date.now()
        };
    }

    // Nettoyer les anciennes données de pagination (plus de 10 minutes)
    const now = Date.now();
    for (const [id, data] of paginationCache) {
        if (now - data.lastUpdate > 600000) { // 10 minutes
            paginationCache.delete(id);
        }
    }

    try {
        let newPage = paginationData.page;
        
        // Déterminer la nouvelle page selon l'action
        switch (action) {
            case 'first':
                newPage = 1;
                break;
            case 'prev':
                newPage = Math.max(1, paginationData.page - 1);
                break;
            case 'next':
                newPage = Math.min(paginationData.totalPages, paginationData.page + 1);
                break;
            case 'last':
                newPage = paginationData.totalPages;
                break;
            case 'refresh':
                // Garder la même page mais actualiser les données
                break;
            case 'type':
                // Changer le type de classement
                paginationData.type = type;
                newPage = 1;
                break;
        }

        // Récupérer les données du classement
        const leaderboardData = await getLeaderboardData(interaction.guild, paginationData.type, newPage);
        
        if (!leaderboardData || leaderboardData.leaderboard.length === 0) {
            await interaction.followUp({ content: '📭 Aucune donnée XP trouvée pour ce serveur.', ephemeral: true });
            return;
        }

        // Mettre à jour les données de pagination
        paginationData.page = newPage;
        paginationData.totalPages = leaderboardData.totalPages;
        paginationData.lastUpdate = now;
        paginationCache.set(messageId, paginationData);

        // Créer l'embed du classement
        const embed = XPEmbeds.createLeaderboardEmbed(
            leaderboardData.leaderboard,
            paginationData.type,
            newPage,
            leaderboardData.totalPages,
            interaction.guild
        );

        // Ajouter les entrées du classement
        let leaderboardText = '';
        for (let i = 0; i < leaderboardData.leaderboard.length; i++) {
            const user = leaderboardData.leaderboard[i];
            const member = await interaction.guild.members.fetch(user.userId).catch(() => null);
            const entry = XPEmbeds.formatLeaderboardEntry(user, (newPage - 1) * 10 + i, paginationData.type, member);
            leaderboardText += entry;
        }

        embed.setDescription(leaderboardText);

        // Créer les boutons
        const navigationButtons = XPEmbeds.createLeaderboardButtons(newPage, leaderboardData.totalPages, paginationData.type);
        const typeButtons = XPEmbeds.createLeaderboardTypeButtons(paginationData.type);

        await interaction.editReply({
            embeds: [embed],
            components: [typeButtons, navigationButtons]
        });

    } catch (error) {
        console.error('[XP-BUTTONS] ❌ Erreur lors de la gestion du bouton de classement:', error);
        await interaction.followUp({ content: '❌ Une erreur est survenue lors de la mise à jour du classement.', ephemeral: true });
    }
}

/**
 * Récupère les données du classement avec pagination
 */
async function getLeaderboardData(guild, type, page = 1) {
    const itemsPerPage = 10;
    const offset = (page - 1) * itemsPerPage;

    try {
        let leaderboard = [];
        let totalItems = 0;

        switch (type) {
            case 'message':
                leaderboard = await messageXPHandler.getLeaderboard(guild.id, 1000);
                totalItems = leaderboard.length;
                leaderboard = leaderboard.slice(offset, offset + itemsPerPage);
                break;
                
            case 'voice':
                leaderboard = await voiceXPHandler.getVoiceLeaderboard(guild.id, 1000);
                totalItems = leaderboard.length;
                leaderboard = leaderboard.slice(offset, offset + itemsPerPage);
                break;
                
            case 'global':
            default:
                // Combiner les classements
                const messageLeaderboard = await messageXPHandler.getLeaderboard(guild.id, 1000);
                const voiceLeaderboard = await voiceXPHandler.getVoiceLeaderboard(guild.id, 1000);
                
                const combinedXp = new Map();
                
                messageLeaderboard.forEach(user => {
                    combinedXp.set(user.userId, {
                        userId: user.userId,
                        messageXp: user.totalXp,
                        voiceXp: 0,
                        totalXp: user.totalXp
                    });
                });
                
                voiceLeaderboard.forEach(user => {
                    if (combinedXp.has(user.userId)) {
                        const existing = combinedXp.get(user.userId);
                        existing.voiceXp = user.totalXp;
                        existing.totalXp = existing.messageXp + user.totalXp;
                    } else {
                        combinedXp.set(user.userId, {
                            userId: user.userId,
                            messageXp: 0,
                            voiceXp: user.totalXp,
                            totalXp: user.totalXp
                        });
                    }
                });
                
                const sortedUsers = Array.from(combinedXp.values())
                    .sort((a, b) => b.totalXp - a.totalXp);
                
                totalItems = sortedUsers.length;
                const paginatedUsers = sortedUsers.slice(offset, offset + itemsPerPage);
                
                // Ajouter les informations de niveau
                leaderboard = await Promise.all(paginatedUsers.map(async user => ({
                    userId: user.userId,
                    totalXp: user.totalXp,
                    levelInfo: await XPCalculator.getUserLevelInfo(user.totalXp),
                    messageXp: user.messageXp,
                    voiceXp: user.voiceXp
                })));
                break;
        }

        const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

        return {
            leaderboard,
            totalPages,
            currentPage: page,
            totalItems
        };

    } catch (error) {
        console.error('[XP-BUTTONS] ❌ Erreur lors de la récupération des données de classement:', error);
        return null;
    }
}

/**
 * Gère les boutons de configuration
 */
async function handleConfigButton(interaction) {
    // Vérifier les permissions
    if (!interaction.member.permissions.has('ManageGuild')) {
        await interaction.reply({ content: '❌ Vous devez avoir la permission "Gérer le serveur" pour utiliser cette fonctionnalité.', ephemeral: true });
        return;
    }

    await interaction.deferReply({ ephemeral: true });

    const [, section] = interaction.customId.split('_');

    try {
        switch (section) {
            case 'general':
                await interaction.editReply({ content: '🚧 Configuration générale en cours de développement.' });
                break;
            case 'message':
                await interaction.editReply({ content: '🚧 Configuration XP messages en cours de développement.' });
                break;
            case 'voice':
                await interaction.editReply({ content: '🚧 Configuration XP vocal en cours de développement.' });
                break;
            case 'rewards':
                await interaction.editReply({ content: '🚧 Configuration des récompenses en cours de développement.' });
                break;
            case 'exclusions':
                await interaction.editReply({ content: '🚧 Configuration des exclusions en cours de développement.' });
                break;
            default:
                await interaction.editReply({ content: '❌ Section de configuration inconnue.' });
        }
    } catch (error) {
        console.error('[XP-BUTTONS] ❌ Erreur lors de la gestion du bouton de configuration:', error);
        await interaction.editReply({ content: '❌ Une erreur est survenue lors de l\'accès à la configuration.' });
    }
}

/**
 * Nettoie le cache de pagination périodiquement
 */
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [id, data] of paginationCache) {
        if (now - data.lastUpdate > 600000) { // 10 minutes
            paginationCache.delete(id);
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        console.log(`[XP-BUTTONS] 🧹 Cache de pagination nettoyé: ${cleaned} entrées supprimées`);
    }
}, 300000); // Nettoyer toutes les 5 minutes