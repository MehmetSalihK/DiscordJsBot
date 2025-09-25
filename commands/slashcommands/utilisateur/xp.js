import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } from 'discord.js';
import messageXPHandler from '../../../src/utils/messageXpHandler.js';
import voiceXPHandler from '../../../src/utils/voiceXpHandler.js';
import XPCalculator from '../../../src/utils/xpCalculator.js';
import xpDataManager from '../../../src/utils/xpDataManager.js';

export default {
    data: new SlashCommandBuilder()
        .setName('xp')
        .setDescription('🎯 Commandes de gestion du système XP')
        .addSubcommand(subcommand =>
            subcommand
                .setName('profil')
                .setDescription('📊 Afficher le profil XP d\'un utilisateur')
                .addUserOption(option =>
                    option
                        .setName('utilisateur')
                        .setDescription('L\'utilisateur dont vous voulez voir le profil')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('classement')
                .setDescription('🏆 Afficher le classement XP du serveur')
                .addStringOption(option =>
                    option
                        .setName('type')
                        .setDescription('Type de classement à afficher')
                        .setRequired(false)
                        .addChoices(
                            { name: '💬 Messages', value: 'message' },
                            { name: '🎤 Vocal', value: 'voice' },
                            { name: '🌟 Global', value: 'global' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('⚙️ Configurer le système XP')
                .addStringOption(option =>
                    option
                        .setName('action')
                        .setDescription('Action à effectuer')
                        .setRequired(true)
                        .addChoices(
                            { name: '📋 Afficher la configuration', value: 'show' },
                            { name: '🔧 Modifier les paramètres', value: 'edit' },
                            { name: '🎁 Gérer les récompenses', value: 'rewards' },
                            { name: '🚫 Gérer les exclusions', value: 'exclusions' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('🗑️ Remettre à zéro l\'XP d\'un utilisateur')
                .addUserOption(option =>
                    option
                        .setName('utilisateur')
                        .setDescription('L\'utilisateur dont vous voulez reset l\'XP')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('type')
                        .setDescription('Type d\'XP à reset')
                        .setRequired(false)
                        .addChoices(
                            { name: '💬 Messages uniquement', value: 'message' },
                            { name: '🎤 Vocal uniquement', value: 'voice' },
                            { name: '🌟 Tout l\'XP', value: 'all' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('give')
                .setDescription('🎁 Donner de l\'XP à un utilisateur')
                .addUserOption(option =>
                    option
                        .setName('utilisateur')
                        .setDescription('L\'utilisateur à qui donner l\'XP')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('montant')
                        .setDescription('Montant d\'XP à donner')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(1000000)
                )
                .addStringOption(option =>
                    option
                        .setName('type')
                        .setDescription('Type d\'XP à donner')
                        .setRequired(false)
                        .addChoices(
                            { name: '💬 XP Messages', value: 'message' },
                            { name: '🎤 XP Vocal', value: 'voice' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('import')
                .setDescription('📥 Importer des données XP depuis un autre bot')
                .addAttachmentOption(option =>
                    option
                        .setName('fichier')
                        .setDescription('Fichier JSON contenant les données XP')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('export')
                .setDescription('📤 Exporter les données XP du serveur')
        ),

    async execute(interaction) {
        console.log('[XP-SLASH] 🔍 Début exécution commande XP slash');
        console.log('[XP-SLASH] 🔍 Interaction user:', interaction.user?.tag);
        console.log('[XP-SLASH] 🔍 Guild:', interaction.guild?.name);
        
        try {
            console.log('[XP-SLASH] 🔍 Récupération de la sous-commande...');
            const subcommand = interaction.options.getSubcommand();
            console.log('[XP-SLASH] 🔍 Sous-commande:', subcommand);
            switch (subcommand) {
                case 'profil':
                    console.log('[XP-SYSTEM] 🔍 Exécution handleProfileCommand');
                    await handleProfileCommand(interaction);
                    break;
                case 'classement':
                    await handleLeaderboardCommand(interaction);
                    break;
                case 'config':
                    await handleConfigCommand(interaction);
                    break;
                case 'reset':
                    await handleResetCommand(interaction);
                    break;
                case 'give':
                    await handleGiveCommand(interaction);
                    break;
                case 'import':
                    await handleImportCommand(interaction);
                    break;
                case 'export':
                    await handleExportCommand(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Sous-commande non reconnue.',
                        flags: MessageFlags.Ephemeral
                    });
            }
        } catch (error) {
            console.error('[XP-SYSTEM] ❌ Erreur dans la commande XP:', error);
            
            const errorMessage = {
                content: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
                flags: MessageFlags.Ephemeral
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    }
};

/**
 * Gère la commande profil
 */
async function handleProfileCommand(interaction) {
    console.log('[XP-SLASH] 🔍 Début handleProfileCommand');
    try {
        const targetUser = interaction.options.getUser('utilisateur') || interaction.user;
        console.log('[XP-SLASH] 🔍 Target user:', targetUser.id);
        
        const member = await interaction.guild.members.fetch(targetUser.id);
        console.log('[XP-SLASH] 🔍 Member fetched:', member.displayName);

        // Récupérer les statistiques
        console.log('[XP-SLASH] 🔍 Récupération des stats message...');
        console.log('[XP-SLASH] 🔍 messageXPHandler:', typeof messageXPHandler);
        const messageStats = await messageXPHandler.getUserStats(interaction.guild.id, targetUser.id);
        console.log('[XP-SLASH] 🔍 Message stats:', messageStats);
        
        console.log('[XP-SLASH] 🔍 Récupération des stats voice...');
        console.log('[XP-SLASH] 🔍 voiceXPHandler:', typeof voiceXPHandler);
        const voiceStats = await voiceXPHandler.getUserVoiceStats(interaction.guild.id, targetUser.id);
        console.log('[XP-SLASH] 🔍 Voice stats:', voiceStats);

        // Calculer l'XP total et le niveau global
        console.log('[XP-SLASH] 🔍 Calcul de l\'XP total...');
        const totalXp = messageStats.totalXp + voiceStats.totalXp;
        console.log('[XP-SLASH] 🔍 Total XP:', totalXp);
        
        console.log('[XP-SLASH] 🔍 Calcul du niveau global...');
        const globalLevelInfo = await XPCalculator.getUserLevelInfo(totalXp);
        console.log('[XP-SLASH] 🔍 Global level info:', globalLevelInfo);

        // Créer l'embed du profil
        console.log('[XP-SLASH] 🔍 Création de l\'embed...');
        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle(`📊 Profil XP de ${member.displayName}`)
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
                text: `Système XP • ${interaction.guild.name}`,
                iconURL: interaction.guild.iconURL({ dynamic: true })
            });

        // Ajouter la barre de progression globale
        const progressBar = XPCalculator.generateProgressBar(
            globalLevelInfo.xpInCurrentLevel,
            globalLevelInfo.xpToNextLevel,
            20
        );
        
        embed.addFields({
            name: '📈 Progression vers le niveau suivant',
            value: `\`${progressBar}\`\n${XPCalculator.formatXP(globalLevelInfo.xpInCurrentLevel)} / ${XPCalculator.formatXP(globalLevelInfo.xpToNextLevel)} XP`,
            inline: false
        });

        // Ajouter des informations supplémentaires
        if (messageStats.lastMessageDate) {
            embed.addFields({
                name: '📅 Dernière activité',
                value: `**Message:** <t:${Math.floor(new Date(messageStats.lastMessageDate).getTime() / 1000)}:R>\n**Vocal:** ${voiceStats.lastVoiceDate ? `<t:${Math.floor(new Date(voiceStats.lastVoiceDate).getTime() / 1000)}:R>` : 'Jamais'}`,
                inline: false
            });
        }

        console.log('[XP-SLASH] 🔍 Envoi de la réponse...');
        await interaction.reply({ embeds: [embed] });
        console.log('[XP-SLASH] ✅ Réponse envoyée avec succès');
        
    } catch (error) {
        console.error('[XP-SLASH] ❌ Erreur dans handleProfileCommand:', error);
        console.error('[XP-SLASH] ❌ Stack trace:', error.stack);
        
        const errorMessage = {
            content: '❌ Une erreur est survenue lors de la récupération du profil XP.',
            flags: MessageFlags.Ephemeral
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
}

/**
 * Gère la commande classement
 */
async function handleLeaderboardCommand(interaction) {
    const type = interaction.options.getString('type') || 'global';
    
    await interaction.deferReply();

    let leaderboard = [];
    let title = '';
    let description = '';

    switch (type) {
        case 'message':
            leaderboard = await messageXPHandler.getLeaderboard(interaction.guild.id, 10);
            title = '🏆 Classement XP Messages';
            description = 'Top 10 des utilisateurs avec le plus d\'XP de messages';
            break;
        case 'voice':
            leaderboard = await voiceXPHandler.getVoiceLeaderboard(interaction.guild.id, 10);
            title = '🏆 Classement XP Vocal';
            description = 'Top 10 des utilisateurs avec le plus d\'XP vocal';
            break;
        case 'global':
            // Combiner les deux classements
            const messageLeaderboard = await messageXPHandler.getLeaderboard(interaction.guild.id, 50);
            const voiceLeaderboard = await voiceXPHandler.getVoiceLeaderboard(interaction.guild.id, 50);
            
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
        await interaction.editReply({
            content: '📭 Aucune donnée XP trouvée pour ce serveur.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp()
        .setFooter({
            text: `Système XP • ${interaction.guild.name}`,
            iconURL: interaction.guild.iconURL({ dynamic: true })
        });

    // Ajouter les utilisateurs au classement
    let leaderboardText = '';
    for (let i = 0; i < leaderboard.length; i++) {
        const user = leaderboard[i];
        const member = await interaction.guild.members.fetch(user.userId).catch(() => null);
        const displayName = member ? member.displayName : `Utilisateur ${user.userId}`;
        
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        
        if (type === 'global') {
            leaderboardText += `${medal} **${displayName}**\n`;
            leaderboardText += `   🌟 Niveau ${user.levelInfo.level} • ${XPCalculator.formatXP(user.totalXp)} XP\n`;
            leaderboardText += `   💬 ${XPCalculator.formatXP(user.messageXp)} • 🎤 ${XPCalculator.formatXP(user.voiceXp)}\n\n`;
        } else {
            leaderboardText += `${medal} **${displayName}**\n`;
            leaderboardText += `   🌟 Niveau ${user.levelInfo.level} • ${XPCalculator.formatXP(user.totalXp)} XP\n\n`;
        }
    }

    embed.setDescription(leaderboardText);

    // Ajouter des boutons pour changer de type
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('leaderboard_global')
                .setLabel('🌟 Global')
                .setStyle(type === 'global' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('leaderboard_message')
                .setLabel('💬 Messages')
                .setStyle(type === 'message' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('leaderboard_voice')
                .setLabel('🎤 Vocal')
                .setStyle(type === 'voice' ? ButtonStyle.Primary : ButtonStyle.Secondary)
        );

    await interaction.editReply({ embeds: [embed], components: [row] });
}

/**
 * Gère la commande config
 */
async function handleConfigCommand(interaction) {
    console.log('[XP-SLASH] 🔍 Début handleConfigCommand');
    
    try {
        // Vérifier les permissions
        console.log('[XP-SLASH] 🔍 Vérification des permissions...');
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            console.log('[XP-SLASH] ❌ Permissions insuffisantes');
            await interaction.reply({
                content: '❌ Vous devez avoir la permission "Gérer le serveur" pour utiliser cette commande.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        console.log('[XP-SLASH] 🔍 Récupération de l\'action...');
        const action = interaction.options.getString('action');
        console.log('[XP-SLASH] 🔍 Action:', action);
    
        console.log('[XP-SLASH] 🔍 Entrée dans switch action...');
        switch (action) {
            case 'show':
                console.log('[XP-SLASH] 🔍 Appel showConfig...');
                await showConfig(interaction);
                break;
            case 'edit':
                console.log('[XP-SLASH] 🔍 Appel editConfig...');
                await editConfig(interaction);
                break;
            case 'rewards':
                console.log('[XP-SLASH] 🔍 Appel manageRewards...');
                await manageRewards(interaction);
                break;
            case 'exclusions':
                console.log('[XP-SLASH] 🔍 Appel manageExclusions...');
                await manageExclusions(interaction);
                break;
            default:
                console.log('[XP-SLASH] ❌ Action non reconnue:', action);
                await interaction.reply({
                    content: '❌ Action non reconnue.',
                    flags: MessageFlags.Ephemeral
                });
        }
        
        console.log('[XP-SLASH] ✅ handleConfigCommand terminé');
        
    } catch (error) {
        console.error('[XP-SLASH] ❌ Erreur dans handleConfigCommand:', error);
        console.error('[XP-SLASH] ❌ Stack trace:', error.stack);
        
        const errorMessage = {
            content: '❌ Une erreur est survenue lors de la configuration.',
            flags: MessageFlags.Ephemeral
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
}

/**
 * Affiche la configuration actuelle
 */
async function showConfig(interaction) {
    console.log('[XP-SLASH] 🔍 Début showConfig');
    
    try {
        console.log('[XP-SLASH] 🔍 Récupération de la config via xpDataManager...');
        const config = await xpDataManager.getLevelConfig();
        console.log('[XP-SLASH] 🔍 Config récupérée:', config ? 'OK' : 'NULL');
    
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
                text: `Système XP • ${interaction.guild.name}`,
                iconURL: interaction.guild.iconURL({ dynamic: true })
            });

        console.log('[XP-SLASH] 🔍 Envoi de la réponse...');
        await interaction.reply({ embeds: [embed] });
        console.log('[XP-SLASH] ✅ showConfig terminé avec succès');
        
    } catch (error) {
        console.error('[XP-SLASH] ❌ Erreur dans showConfig:', error);
        console.error('[XP-SLASH] ❌ Stack trace:', error.stack);
        
        const errorMessage = {
            content: '❌ Une erreur est survenue lors de la récupération de la configuration.',
            flags: MessageFlags.Ephemeral
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
}

/**
 * Interface d'édition de la configuration
 */
async function editConfig(interaction) {
    // Cette fonction sera étendue avec des modals pour l'édition
    await interaction.reply({
        content: '🚧 Interface d\'édition en cours de développement. Utilisez les fichiers JSON pour le moment.',
        flags: MessageFlags.Ephemeral
    });
}

/**
 * Gestion des récompenses de rôles
 */
async function manageRewards(interaction) {
    // Cette fonction sera étendue avec une interface de gestion des récompenses
    await interaction.reply({
        content: '🚧 Interface de gestion des récompenses en cours de développement.',
        flags: MessageFlags.Ephemeral
    });
}

/**
 * Gestion des exclusions
 */
async function manageExclusions(interaction) {
    // Cette fonction sera étendue avec une interface de gestion des exclusions
    await interaction.reply({
        content: '🚧 Interface de gestion des exclusions en cours de développement.',
        flags: MessageFlags.Ephemeral
    });
}

/**
 * Gère la commande reset
 */
async function handleResetCommand(interaction) {
    // Vérifier les permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
            content: '❌ Vous devez avoir la permission "Gérer le serveur" pour utiliser cette commande.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const targetUser = interaction.options.getUser('utilisateur');
    const type = interaction.options.getString('type') || 'all';

    await interaction.deferReply();

    try {
        let resetMessage = '';
        
        switch (type) {
            case 'message':
                await messageXPHandler.resetUserXP(interaction.guild.id, targetUser.id);
                resetMessage = '💬 XP de messages remis à zéro';
                break;
            case 'voice':
                await voiceXPHandler.resetUserVoiceXP(interaction.guild.id, targetUser.id);
                resetMessage = '🎤 XP vocal remis à zéro';
                break;
            case 'all':
                await messageXPHandler.resetUserXP(interaction.guild.id, targetUser.id);
                await voiceXPHandler.resetUserVoiceXP(interaction.guild.id, targetUser.id);
                resetMessage = '🌟 Tout l\'XP remis à zéro';
                break;
        }

        const embed = new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('🗑️ Reset XP Effectué')
            .setDescription(`${resetMessage} pour **${targetUser.displayName}**.`)
            .setTimestamp()
            .setFooter({
                text: `Action effectuée par ${interaction.user.displayName}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            });

        await interaction.editReply({ embeds: [embed] });

        console.log(`[XP-SYSTEM] 🗑️ Reset XP (${type}) pour ${targetUser.tag} par ${interaction.user.tag}`);

    } catch (error) {
        console.error('[XP-SYSTEM] ❌ Erreur lors du reset:', error);
        await interaction.editReply({
            content: '❌ Une erreur est survenue lors du reset de l\'XP.',
            flags: MessageFlags.Ephemeral
        });
    }
}

/**
 * Gère la commande give
 */
async function handleGiveCommand(interaction) {
    // Vérifier les permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
            content: '❌ Vous devez avoir la permission "Gérer le serveur" pour utiliser cette commande.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const targetUser = interaction.options.getUser('utilisateur');
    const amount = interaction.options.getInteger('montant');
    const type = interaction.options.getString('type') || 'message';

    await interaction.deferReply();

    try {
        let result;
        let typeText = '';

        if (type === 'voice') {
            // Simuler l'attribution d'XP vocal
            const sessionKey = `${interaction.guild.id}_${targetUser.id}`;
            result = await voiceXPHandler.awardVoiceXP(sessionKey, amount);
            typeText = '🎤 XP vocal';
        } else {
            // Attribuer l'XP de message
            const userKey = `${interaction.guild.id}_${targetUser.id}`;
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
                text: `Action effectuée par ${interaction.user.displayName}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            });

        if (result.levelUp) {
            embed.addFields({
                name: '🎉 Level Up !',
                value: `**${targetUser.displayName}** a atteint le niveau **${result.levelInfo.level}** !`,
                inline: false
            });
        }

        await interaction.editReply({ embeds: [embed] });

        console.log(`[XP-SYSTEM] 🎁 ${amount} XP (${type}) donné à ${targetUser.tag} par ${interaction.user.tag}`);

    } catch (error) {
        console.error('[XP-SYSTEM] ❌ Erreur lors de l\'attribution d\'XP:', error);
        await interaction.editReply({
            content: '❌ Une erreur est survenue lors de l\'attribution de l\'XP.',
            flags: MessageFlags.Ephemeral
        });
    }
}

/**
 * Gère la commande import
 */
async function handleImportCommand(interaction) {
    // Vérifier les permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
            content: '❌ Vous devez avoir la permission "Administrateur" pour utiliser cette commande.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    await interaction.reply({
        content: '🚧 Fonctionnalité d\'import en cours de développement.',
        flags: MessageFlags.Ephemeral
    });
}

/**
 * Gère la commande export
 */
async function handleExportCommand(interaction) {
    // Vérifier les permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
            content: '❌ Vous devez avoir la permission "Administrateur" pour utiliser cette commande.',
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    await interaction.reply({
        content: '🚧 Fonctionnalité d\'export en cours de développement.',
        flags: MessageFlags.Ephemeral
    });
}