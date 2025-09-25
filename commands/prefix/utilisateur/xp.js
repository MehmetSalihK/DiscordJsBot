import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import messageXPHandler from '../../../src/utils/messageXpHandler.js';
import voiceXPHandler from '../../../src/utils/voiceXpHandler.js';
import XPCalculator from '../../../src/utils/xpCalculator.js';
import xpDataManager from '../../../src/utils/xpDataManager.js';

export default {
    name: 'xp',
    aliases: ['level', 'niveau', 'exp'],
    description: '🎯 Commandes de gestion du système XP',
    usage: 'xp [profil|classement|config|reset|give] [options]',
    examples: [
        'xp',
        'xp profil @utilisateur',
        'xp classement',
        'xp classement vocal',
        'xp config show',
        'xp reset @utilisateur',
        'xp give @utilisateur 1000'
    ],

    async execute(message, args) {
        console.log('[XP-SYSTEM] 🔍 Début exécution commande XP prefix');
        console.log('[XP-SYSTEM] 🔍 Args:', args);
        const subcommand = args[0]?.toLowerCase();
        console.log('[XP-SYSTEM] 🔍 Subcommand:', subcommand);

        try {
            console.log('[XP-SYSTEM] 🔍 Entrée dans switch');
            switch (subcommand) {
                case 'profil':
                case 'profile':
                case 'p':
                    console.log('[XP-SYSTEM] 🔍 Appel handleProfileCommand');
                    await handleProfileCommand(message, args);
                    console.log('[XP-SYSTEM] ✅ handleProfileCommand terminé');
                    break;
                case 'classement':
                case 'leaderboard':
                case 'top':
                case 'lb':
                    console.log('[XP-SYSTEM] 🔍 Appel handleLeaderboardCommand');
                    await handleLeaderboardCommand(message, args);
                    console.log('[XP-SYSTEM] ✅ handleLeaderboardCommand terminé');
                    break;
                case 'config':
                case 'configuration':
                case 'cfg':
                    console.log('[XP-SYSTEM] 🔍 Appel handleConfigCommand');
                    await handleConfigCommand(message, args);
                    console.log('[XP-SYSTEM] ✅ handleConfigCommand terminé');
                    break;
                case 'reset':
                case 'clear':
                    console.log('[XP-SYSTEM] 🔍 Appel handleResetCommand');
                    await handleResetCommand(message, args);
                    console.log('[XP-SYSTEM] ✅ handleResetCommand terminé');
                    break;
                case 'give':
                case 'add':
                case 'donner':
                    console.log('[XP-SYSTEM] 🔍 Appel handleGiveCommand');
                    await handleGiveCommand(message, args);
                    console.log('[XP-SYSTEM] ✅ handleGiveCommand terminé');
                    break;
                case 'help':
                case 'aide':
                    console.log('[XP-SYSTEM] 🔍 Appel showHelp');
                    await showHelp(message);
                    console.log('[XP-SYSTEM] ✅ showHelp terminé');
                    break;
                default:
                    // Si aucune sous-commande, afficher le profil de l'utilisateur
                    console.log('[XP-SYSTEM] 🔍 Appel handleProfileCommand (default)');
                    await handleProfileCommand(message, []);
                    console.log('[XP-SYSTEM] ✅ handleProfileCommand (default) terminé');
                    break;
            }
        } catch (error) {
            console.error('[XP-SYSTEM] ❌ Erreur dans la commande XP prefix:');
            console.error('[XP-SYSTEM] ❌ Error object:', JSON.stringify(error, null, 2));
            console.error('[XP-SYSTEM] ❌ Error type:', typeof error);
            console.error('[XP-SYSTEM] ❌ Error message:', error?.message || 'No message');
            console.error('[XP-SYSTEM] ❌ Error name:', error?.name || 'No name');
            console.error('[XP-SYSTEM] ❌ Error stack:', error?.stack || 'No stack');
            console.error('[XP-SYSTEM] ❌ Subcommand:', subcommand);
            console.error('[XP-SYSTEM] ❌ Args:', args);
            
            // Log complet de l'erreur
            console.error('[XP-SYSTEM] ❌ ERREUR COMPLÈTE:', error);
            
            try {
                await message.reply('❌ Une erreur est survenue lors de l\'exécution de la commande.');
            } catch (replyError) {
                console.error('[XP-SYSTEM] ❌ Erreur lors de la réponse:', replyError);
            }
        }
    }
};

/**
 * Affiche l'aide de la commande XP
 */
async function showHelp(message) {
    const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🎯 Aide - Commandes XP')
        .setDescription('Voici toutes les commandes disponibles pour le système XP :')
        .addFields(
            {
                name: '📊 Profil',
                value: '`xp` ou `xp profil [@utilisateur]`\nAffiche le profil XP d\'un utilisateur',
                inline: false
            },
            {
                name: '🏆 Classement',
                value: '`xp classement [global|message|vocal]`\nAffiche le classement du serveur',
                inline: false
            },
            {
                name: '⚙️ Configuration',
                value: '`xp config [show|edit|rewards|exclusions]`\nGère la configuration du système (Admin)',
                inline: false
            },
            {
                name: '🗑️ Reset',
                value: '`xp reset @utilisateur [all|message|voice]`\nRemet à zéro l\'XP d\'un utilisateur (Admin)',
                inline: false
            },
            {
                name: '🎁 Donner XP',
                value: '`xp give @utilisateur <montant> [message|voice]`\nDonne de l\'XP à un utilisateur (Admin)',
                inline: false
            }
        )
        .setTimestamp()
        .setFooter({
            text: `Système XP • ${message.guild.name}`,
            iconURL: message.guild.iconURL({ dynamic: true })
        });

    console.log('[XP-SYSTEM] 🔍 Embed créé, envoi de la réponse...');
    await message.reply({ embeds: [embed] });
    console.log('[XP-SYSTEM] ✅ Réponse envoyée avec succès');
}

/**
 * Gère la commande profil
 */
async function handleProfileCommand(message, args) {
    console.log('[XP-SYSTEM] 🔍 Début handleProfileCommand');
    console.log('[XP-SYSTEM] 🔍 Args dans handleProfileCommand:', args);
    console.log('[XP-SYSTEM] 🔍 Message author:', message.author?.tag);
    
    let targetUser = message.author;
    
    // Vérifier si un utilisateur est mentionné
    if (message.mentions.users.size > 0) {
        targetUser = message.mentions.users.first();
    } else if (args[1]) {
        // Essayer de trouver l'utilisateur par ID ou nom
        try {
            targetUser = await message.guild.members.fetch(args[1]).then(member => member.user);
        } catch {
            // Si pas trouvé, chercher par nom
            const member = message.guild.members.cache.find(m => 
                m.displayName.toLowerCase().includes(args[1].toLowerCase()) ||
                m.user.username.toLowerCase().includes(args[1].toLowerCase())
            );
            if (member) targetUser = member.user;
        }
    }
    
    console.log('[XP-SYSTEM] 🔍 Target user:', targetUser?.tag);

    console.log('[XP-SYSTEM] 🔍 Tentative de fetch du member...');
    const member = await message.guild.members.fetch(targetUser.id);
    console.log('[XP-SYSTEM] 🔍 Member fetched:', member?.user?.tag);

    // Récupérer les statistiques
    console.log('[XP-SYSTEM] 🔍 Récupération des stats message...');
    const messageStats = await messageXPHandler.getUserStats(message.guild.id, targetUser.id);
    console.log('[XP-SYSTEM] 🔍 Message stats:', messageStats);
    
    console.log('[XP-SYSTEM] 🔍 Récupération des stats voice...');
    const voiceStats = await voiceXPHandler.getUserVoiceStats(message.guild.id, targetUser.id);
    console.log('[XP-SYSTEM] 🔍 Voice stats:', voiceStats);

    // Calculer l'XP total et le niveau global
    console.log('[XP-SYSTEM] 🔍 Calcul de l\'XP total...');
    const totalXp = messageStats.totalXp + voiceStats.totalXp;
    console.log('[XP-SYSTEM] 🔍 Total XP:', totalXp);
    
    console.log('[XP-SYSTEM] 🔍 Calcul du niveau global...');
    const globalLevelInfo = await XPCalculator.getUserLevelInfo(totalXp);
    console.log('[XP-SYSTEM] 🔍 Global level info:', globalLevelInfo);

    // Créer l'embed du profil
    console.log('[XP-SYSTEM] 🔍 Création de l\'embed...');
    console.log('[XP-SYSTEM] 🔍 member.displayName:', member?.displayName);
    console.log('[XP-SYSTEM] 🔍 targetUser.displayAvatarURL:', targetUser?.displayAvatarURL);
    console.log('[XP-SYSTEM] 🔍 message.guild.name:', message?.guild?.name);
    console.log('[XP-SYSTEM] 🔍 message.guild.iconURL:', message?.guild?.iconURL);
    
    let embed;
    try {
        embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle(`📊 Profil XP de ${member?.displayName || targetUser?.username || 'Utilisateur'}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields(
                {
                    name: '🌟 **Niveau Global**',
                    value: `\`\`\`yaml\nNiveau: ${globalLevelInfo.level}\nXP Total: ${XPCalculator.formatXP(totalXp)}\nProgression: ${Math.round(globalLevelInfo.progress)}%\`\`\``,
                    inline: true
                },
                {
                    name: '💬 **XP Messages**',
                    value: `\`\`\`fix\n${XPCalculator.formatXP(messageStats.totalXp)} XP\`\`\``,
                    inline: true
                },
                {
                    name: '🎤 **XP Vocal**',
                    value: `\`\`\`css\n${XPCalculator.formatXP(voiceStats.totalXp)} XP\n${Math.round(voiceStats.totalMinutes)} minutes\`\`\``,
                    inline: true
                }
            )
            .setTimestamp()
            .setFooter({
                text: `Système XP • ${message.guild.name}`,
                iconURL: message.guild.iconURL({ dynamic: true })
            });
        console.log('[XP-SYSTEM] 🔍 Embed de base créé avec succès');
    } catch (embedError) {
        console.error('[XP-SYSTEM] ❌ Erreur lors de la création de l\'embed de base:', embedError);
        throw embedError;
    }

    // Ajouter la barre de progression globale
    try {
        console.log('[XP-SYSTEM] 🔍 Génération de la barre de progression...');
        const progressBar = XPCalculator.generateProgressBar(
            globalLevelInfo.progress,
            20
        );
        console.log('[XP-SYSTEM] 🔍 Barre de progression générée:', progressBar);
        
        embed.addFields({
            name: '📈 Progression vers le niveau suivant',
            value: `\`${progressBar}\`\n${XPCalculator.formatXP(globalLevelInfo.xpInCurrentLevel)} / ${XPCalculator.formatXP(globalLevelInfo.xpToNextLevel)} XP`,
            inline: false
        });
        console.log('[XP-SYSTEM] 🔍 Barre de progression ajoutée à l\'embed');
    } catch (progressError) {
        console.error('[XP-SYSTEM] ❌ Erreur lors de l\'ajout de la barre de progression:', progressError);
    }

    // Ajouter des informations supplémentaires
    try {
        console.log('[XP-SYSTEM] 🔍 Ajout des informations d\'activité...');
        if (messageStats.lastMessageDate) {
            embed.addFields({
                name: '📅 Dernière activité',
                value: `**Message:** <t:${Math.floor(new Date(messageStats.lastMessageDate).getTime() / 1000)}:R>\n**Vocal:** ${voiceStats.lastVoiceDate ? `<t:${Math.floor(new Date(voiceStats.lastVoiceDate).getTime() / 1000)}:R>` : 'Jamais'}`,
                inline: false
            });
        }
        console.log('[XP-SYSTEM] 🔍 Informations d\'activité ajoutées');
    } catch (activityError) {
        console.error('[XP-SYSTEM] ❌ Erreur lors de l\'ajout des informations d\'activité:', activityError);
    }

    console.log('[XP-SYSTEM] 🔍 Envoi de la réponse...');
    await message.reply({ embeds: [embed] });
}

/**
 * Gère la commande classement
 */
async function handleLeaderboardCommand(message, args) {
    const type = args[1]?.toLowerCase() || 'global';
    
    let leaderboard = [];
    let title = '';
    let description = '';

    switch (type) {
        case 'message':
        case 'messages':
        case 'msg':
            leaderboard = await messageXPHandler.getLeaderboard(message.guild.id, 10);
            title = '🏆 Classement XP Messages';
            description = 'Top 10 des utilisateurs avec le plus d\'XP de messages';
            break;
        case 'voice':
        case 'vocal':
        case 'v':
            leaderboard = await voiceXPHandler.getVoiceLeaderboard(message.guild.id, 10);
            title = '🏆 Classement XP Vocal';
            description = 'Top 10 des utilisateurs avec le plus d\'XP vocal';
            break;
        case 'global':
        case 'total':
        case 'g':
        default:
            // Combiner les deux classements
            const messageLeaderboard = await messageXPHandler.getLeaderboard(message.guild.id, 50);
            const voiceLeaderboard = await voiceXPHandler.getVoiceLeaderboard(message.guild.id, 50);
            
            // Créer un map pour combiner les XP
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
            
            // Convertir en array et trier
            leaderboard = Array.from(combinedXp.values())
                .sort((a, b) => b.totalXp - a.totalXp)
                .slice(0, 10)
                .map(async user => ({
                    userId: user.userId,
                    totalXp: user.totalXp,
                    levelInfo: await XPCalculator.getUserLevelInfo(user.totalXp),
                    messageXp: user.messageXp,
                    voiceXp: user.voiceXp
                }));
            
            // Résoudre les promesses
            leaderboard = await Promise.all(leaderboard);
            
            title = '🏆 Classement XP Global';
            description = 'Top 10 des utilisateurs avec le plus d\'XP total (messages + vocal)';
            break;
    }

    if (leaderboard.length === 0) {
        await message.reply('📭 Aucune donnée XP trouvée pour ce serveur.');
        return;
    }

    const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp()
        .setFooter({
            text: `Système XP • ${message.guild.name}`,
            iconURL: message.guild.iconURL({ dynamic: true })
        });

    // Ajouter les utilisateurs au classement
    let leaderboardText = '';
    for (let i = 0; i < leaderboard.length; i++) {
        const user = leaderboard[i];
        const member = await message.guild.members.fetch(user.userId).catch(() => null);
        const displayName = member ? member.displayName : `Utilisateur ${user.userId}`;
        
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        
        if (type === 'global' || type === 'total' || type === 'g') {
            leaderboardText += `${medal} **${displayName}**\n`;
            leaderboardText += `   🌟 Niveau ${user.levelInfo.level} • ${XPCalculator.formatXP(user.totalXp)} XP\n`;
            leaderboardText += `   💬 ${XPCalculator.formatXP(user.messageXp)} • 🎤 ${XPCalculator.formatXP(user.voiceXp)}\n\n`;
        } else {
            leaderboardText += `${medal} **${displayName}**\n`;
            leaderboardText += `   🌟 Niveau ${user.levelInfo.level} • ${XPCalculator.formatXP(user.totalXp)} XP\n\n`;
        }
    }

    embed.setDescription(leaderboardText);

    await message.reply({ embeds: [embed] });
}

/**
 * Gère la commande config
 */
async function handleConfigCommand(message, args) {
    // Vérifier les permissions
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await message.reply('❌ Vous devez avoir la permission "Gérer le serveur" pour utiliser cette commande.');
        return;
    }

    const action = args[1]?.toLowerCase() || 'show';
    
    switch (action) {
        case 'show':
        case 'afficher':
            await showConfig(message);
            break;
        case 'edit':
        case 'modifier':
            await message.reply('🚧 Interface d\'édition en cours de développement. Utilisez les fichiers JSON pour le moment.');
            break;
        case 'rewards':
        case 'recompenses':
            await message.reply('🚧 Interface de gestion des récompenses en cours de développement.');
            break;
        case 'exclusions':
            await message.reply('🚧 Interface de gestion des exclusions en cours de développement.');
            break;
        default:
            await message.reply('❌ Action non reconnue. Utilisez: `show`, `edit`, `rewards`, ou `exclusions`.');
    }
}

/**
 * Affiche la configuration actuelle
 */
async function showConfig(message) {
    try {
        const config = await xpDataManager.getLevelConfig();
        
        const embed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('⚙️ Configuration du Système XP')
            .addFields(
                {
                    name: '🔧 Paramètres Généraux',
                    value: `**Activé:** ${config.enabled ? '✅' : '❌'}\n**Mode de progression:** ${config.levelThresholds.mode === 'arithmetic' ? 'Arithmétique' : 'Personnalisé'}`,
                    inline: true
                },
                {
                    name: '💬 XP Messages',
                    value: `**XP par message:** ${config.messageXp.minXp}-${config.messageXp.maxXp}\n**Cooldown:** ${config.messageXp.cooldownSeconds}s\n**Longueur min:** ${config.messageXp.minLength} caractères`,
                    inline: true
                },
                {
                    name: '🎤 XP Vocal',
                    value: `**XP par chunk:** ${config.voiceXp.voiceChunkXP}\n**Durée chunk:** ${config.voiceXp.voiceChunkSeconds}s\n**Ignorer AFK:** ${config.voiceXp.ignoreAfkChannel ? '✅' : '❌'}`,
                    inline: true
                },
                {
                    name: '🎁 Récompenses',
                    value: `**Nombre de rôles:** ${config.roleRewards.length}\n**Messages level-up:** ${config.levelUpMessages.enabled ? '✅' : '❌'}\n**Envoi en DM:** ${config.levelUpMessages.sendInDM ? '✅' : '❌'}`,
                    inline: true
                },
                {
                    name: '🚫 Exclusions',
                    value: `**Canaux exclus:** ${config.excludedChannels.length}\n**Rôles exclus:** ${config.excludedRoles.length}`,
                    inline: true
                }
            )
            .setTimestamp()
            .setFooter({
                text: `Système XP • ${message.guild.name}`,
                iconURL: message.guild.iconURL({ dynamic: true })
            });

        await message.reply({ embeds: [embed] });
    } catch (error) {
        console.error('[XP-PREFIX] ❌ Erreur dans showConfig:', error);
        await message.reply('❌ Une erreur est survenue lors de la récupération de la configuration.');
    }
}

/**
 * Gère la commande reset
 */
async function handleResetCommand(message, args) {
    // Vérifier les permissions
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await message.reply('❌ Vous devez avoir la permission "Gérer le serveur" pour utiliser cette commande.');
        return;
    }

    if (!message.mentions.users.size && !args[1]) {
        await message.reply('❌ Vous devez mentionner un utilisateur ou fournir son ID.\nUsage: `xp reset @utilisateur [all|message|voice]`');
        return;
    }

    let targetUser;
    if (message.mentions.users.size > 0) {
        targetUser = message.mentions.users.first();
    } else {
        try {
            targetUser = await message.guild.members.fetch(args[1]).then(member => member.user);
        } catch {
            await message.reply('❌ Utilisateur introuvable.');
            return;
        }
    }

    const type = args[2]?.toLowerCase() || 'all';

    try {
        let resetMessage = '';
        
        switch (type) {
            case 'message':
            case 'messages':
            case 'msg':
                await messageXPHandler.resetUserXP(message.guild.id, targetUser.id);
                resetMessage = '💬 XP de messages remis à zéro';
                break;
            case 'voice':
            case 'vocal':
            case 'v':
                await voiceXPHandler.resetUserVoiceXP(message.guild.id, targetUser.id);
                resetMessage = '🎤 XP vocal remis à zéro';
                break;
            case 'all':
            case 'tout':
            case 'total':
            default:
                await messageXPHandler.resetUserXP(message.guild.id, targetUser.id);
                await voiceXPHandler.resetUserVoiceXP(message.guild.id, targetUser.id);
                resetMessage = '🌟 Tout l\'XP remis à zéro';
                break;
        }

        const embed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('🗑️ Reset XP Effectué')
            .setDescription(`${resetMessage} pour **${targetUser.displayName}**.`)
            .setTimestamp()
            .setFooter({
                text: `Action effectuée par ${message.author.displayName}`,
                iconURL: message.author.displayAvatarURL({ dynamic: true })
            });

        await message.reply({ embeds: [embed] });

        console.log(`[XP-SYSTEM] 🗑️ Reset XP (${type}) pour ${targetUser.tag} par ${message.author.tag}`);

    } catch (error) {
        console.error('[XP-SYSTEM] ❌ Erreur lors du reset:', error);
        await message.reply('❌ Une erreur est survenue lors du reset de l\'XP.');
    }
}

/**
 * Gère la commande give
 */
async function handleGiveCommand(message, args) {
    // Vérifier les permissions
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await message.reply('❌ Vous devez avoir la permission "Gérer le serveur" pour utiliser cette commande.');
        return;
    }

    if (!message.mentions.users.size && !args[1]) {
        await message.reply('❌ Vous devez mentionner un utilisateur.\nUsage: `xp give @utilisateur <montant> [message|voice]`');
        return;
    }

    let targetUser;
    if (message.mentions.users.size > 0) {
        targetUser = message.mentions.users.first();
    } else {
        try {
            targetUser = await message.guild.members.fetch(args[1]).then(member => member.user);
        } catch {
            await message.reply('❌ Utilisateur introuvable.');
            return;
        }
    }

    const amount = parseInt(args[2]);
    if (!amount || amount < 1 || amount > 1000000) {
        await message.reply('❌ Montant invalide. Utilisez un nombre entre 1 et 1,000,000.');
        return;
    }

    const type = args[3]?.toLowerCase() || 'message';

    try {
        let result;
        let typeText = '';

        if (type === 'voice' || type === 'vocal' || type === 'v') {
            // Simuler l'attribution d'XP vocal
            const sessionKey = `${message.guild.id}_${targetUser.id}`;
            result = await voiceXPHandler.awardVoiceXP(sessionKey, amount);
            typeText = '🎤 XP vocal';
        } else {
            // Attribuer l'XP de message
            const userKey = `${message.guild.id}_${targetUser.id}`;
            result = await messageXPHandler.awardXP(userKey, amount);
            typeText = '💬 XP de messages';
        }

        const embed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('🎁 XP Attribué')
            .setDescription(`**${XPCalculator.formatXP(amount)}** ${typeText} attribué à **${targetUser.displayName}**.`)
            .addFields({
                name: '📊 Nouveau total',
                value: `**XP Total:** ${XPCalculator.formatXP(result.totalXp)}\n**Niveau:** ${result.levelInfo.level}`,
                inline: true
            })
            .setTimestamp()
            .setFooter({
                text: `Action effectuée par ${message.author.displayName}`,
                iconURL: message.author.displayAvatarURL({ dynamic: true })
            });

        if (result.levelUp) {
            embed.addFields({
                name: '🎉 Level Up !',
                value: `**${targetUser.displayName}** a atteint le niveau **${result.levelInfo.level}** !`,
                inline: false
            });
        }

        await message.reply({ embeds: [embed] });

        console.log(`[XP-SYSTEM] 🎁 ${amount} XP (${type}) donné à ${targetUser.tag} par ${message.author.tag}`);

    } catch (error) {
        console.error('[XP-SYSTEM] ❌ Erreur lors de l\'attribution d\'XP:', error);
        await message.reply('❌ Une erreur est survenue lors de l\'attribution de l\'XP.');
    }
}