import logger from '../utils/logger.js';
import { handleLinkDetection, checkExpiredPunishments } from '../handlers/linkModerationHandler.js';
import messageXPHandler from '../utils/messageXpHandler.js';
import XPCalculator from '../utils/xpCalculator.js';
import xpDataManager from '../utils/xpDataManager.js';

export default {
    name: 'messageCreate',
    async execute(message, client) {
        try {
            console.log('[MESSAGE-DEBUG] 📨 Message reçu de:', message.author.username, 'contenu:', message.content.substring(0, 50));
            
            // Ignorer les messages du bot
            if (message.author.bot) {
                console.log('[MESSAGE-DEBUG] 🤖 Message de bot ignoré');
                return;
            }

            // Ignorer les messages en DM
            if (!message.guild) {
                console.log('[MESSAGE-DEBUG] 💬 Message DM ignoré');
                return;
            }

            // Vérifier les punitions expirées toutes les 5 minutes
            if (Math.random() < 0.01) { // 1% de chance à chaque message
                checkExpiredPunishments(client);
            }

            // Détecter les liens dans le message
            await handleLinkDetection(message, client);

            // Traiter l'XP du message
            try {
                console.log('[MESSAGE-DEBUG] 🎯 Appel du messageXPHandler pour:', message.author.username);
                const xpResult = await messageXPHandler.processMessage(message);
                console.log('[MESSAGE-DEBUG] 📊 Résultat XP:', xpResult);
                
                if (xpResult && xpResult.levelUp) {
                    console.log('[MESSAGE-DEBUG] 🎉 Level up détecté !');
                    await handleLevelUp(message, xpResult);
                }
            } catch (xpError) {
                console.error('[XP-SYSTEM] ❌ Erreur lors du traitement de l\'XP:', xpError);
            }

        } catch (error) {
            logger.error('Erreur lors du traitement d\'un message:', error);
        }
    }
};

/**
 * Gère les notifications de level up
 */
async function handleLevelUp(message, xpResult) {
    try {
        const config = await xpDataManager.getLevelConfig();
        const { levelUp, levelInfo } = xpResult;
        
        // Vérifier si les notifications sont activées
        if (!config.levelUpMessages.enabled) return;

        // Créer l'embed de level up
        const embed = {
            color: 0x00ff00,
            title: '🎉 Félicitations !',
            description: config.levelUpMessages.message
                .replace('{user}', `<@${message.author.id}>`)
                .replace('{level}', levelInfo.level)
                .replace('{xp}', XPCalculator.formatXP(levelInfo.totalXp)),
            fields: [
                {
                    name: '📊 Progression',
                    value: `**Niveau:** ${levelInfo.level}\n**XP Total:** ${XPCalculator.formatXP(levelInfo.totalXp)}\n**Prochain niveau:** ${XPCalculator.formatXP(levelInfo.xpForNext)} XP`,
                    inline: true
                }
            ],
            thumbnail: {
                url: message.author.displayAvatarURL({ dynamic: true })
            },
            timestamp: new Date().toISOString(),
            footer: {
                text: `Système XP • ${message.guild.name}`,
                icon_url: message.guild.iconURL({ dynamic: true })
            }
        };

        // Ajouter la barre de progression
        if (config.levelUpMessages.showProgressBar) {
            const progressBar = XPCalculator.generateProgressBar(
                levelInfo.xpInCurrentLevel,
                levelInfo.xpToNextLevel,
                20
            );
            embed.fields.push({
                name: '📈 Progression vers le niveau suivant',
                value: `\`${progressBar}\` ${Math.round(levelInfo.progress)}%`,
                inline: false
            });
        }

        // Vérifier les récompenses de rôle
        const roleReward = await checkRoleReward(message.member, levelInfo.level);
        if (roleReward) {
            embed.fields.push({
                name: '🎁 Récompense débloquée !',
                value: `Vous avez reçu le rôle **${roleReward.name}** !`,
                inline: false
            });
        }

        // Envoyer le message selon la configuration
        if (config.levelUpMessages.sendInDM) {
            try {
                await message.author.send({ embeds: [embed] });
            } catch (error) {
                // Si l'envoi en DM échoue, envoyer dans le canal
                await message.channel.send({ embeds: [embed] });
            }
        } else {
            await message.channel.send({ embeds: [embed] });
        }

        console.log(`[XP-SYSTEM] 🎉 ${message.author.tag} a atteint le niveau ${levelInfo.level} !`);

    } catch (error) {
        console.error('[XP-SYSTEM] ❌ Erreur lors de la notification de level up:');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        console.error('LevelInfo:', levelInfo);
        console.error('User:', message.author.tag);
    }
}

/**
 * Vérifie et attribue les récompenses de rôle
 */
async function checkRoleReward(member, level) {
    try {
        const config = await xpDataManager.getLevelConfig();
        
        // Trouver la récompense de rôle pour ce niveau
        const roleReward = config.roleRewards.find(reward => reward.level === level);
        if (!roleReward) return null;

        // Vérifier si le rôle existe
        const role = member.guild.roles.cache.get(roleReward.roleId);
        if (!role) {
            console.error(`[XP-SYSTEM] ❌ Rôle de récompense introuvable: ${roleReward.roleId}`);
            return null;
        }

        // Vérifier si l'utilisateur a déjà le rôle
        if (member.roles.cache.has(roleReward.roleId)) {
            return null;
        }

        // Attribuer le rôle
        await member.roles.add(role, `Récompense XP - Niveau ${level}`);
        
        console.log(`[XP-SYSTEM] 🎁 Rôle "${role.name}" attribué à ${member.displayName} (niveau ${level})`);
        
        return {
            name: role.name,
            level: level
        };

    } catch (error) {
        console.error('[XP-SYSTEM] ❌ Erreur lors de l\'attribution du rôle de récompense:', error);
        return null;
    }
}