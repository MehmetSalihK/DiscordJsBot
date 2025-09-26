import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags, AttachmentBuilder } from 'discord.js';
import messageXPHandler from '../../../src/utils/messageXpHandler.js';
import voiceXPHandler from '../../../src/utils/voiceXpHandler.js';
import XPCalculator from '../../../src/utils/xpCalculator.js';
import xpDataManager from '../../../src/utils/xpDataManager.js';
import { LeaderboardGenerator } from '../../../src/utils/leaderboardGenerator.js';
const leaderboardGenerator = new LeaderboardGenerator();

const xpCommand = {
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
                    await this.handleProfileCommand(interaction);
                    break;
                case 'classement':
                    await this.handleLeaderboardCommand(interaction);
                    break;
                case 'config':
                    await this.handleConfigCommand(interaction);
                    break;
                case 'reset':
                    await this.handleResetCommand(interaction);
                    break;
                case 'give':
                    await this.handleGiveCommand(interaction);
                    break;
                case 'import':
                    await this.handleImportCommand(interaction);
                    break;
                case 'export':
                    await this.handleExportCommand(interaction);
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
    },
    
    /**
     * Gère la commande classement
     */
    handleLeaderboardCommand: async function(interaction) {
        const type = interaction.options.getString('type') || 'global';
        
        await interaction.deferReply();
        
        try {
            let leaderboard = [];
            let title = '';
            let description = '';
            let leaderboardType = type;

            // Récupérer les données du classement en fonction du type
            switch (type) {
                case 'message':
                    leaderboard = await messageXPHandler.getLeaderboard(interaction.guild.id, 10);
                    title = 'Classement XP Messages';
                    description = 'Top 10 des utilisateurs avec le plus d\'XP de messages';
                    break;
                    
                case 'voice':
                    leaderboard = await voiceXPHandler.getVoiceLeaderboard(interaction.guild.id, 10);
                    title = 'Classement XP Vocal';
                    description = 'Top 10 des utilisateurs avec le plus d\'XP vocal';
                    break;
                    
                case 'global':
                    // Combiner les deux classements
                    const messageLeaderboard = await messageXPHandler.getLeaderboard(interaction.guild.id, 50);
                    const voiceLeaderboard = await voiceXPHandler.getVoiceLeaderboard(interaction.guild.id, 50);
                    
                    // Créer un map pour combiner les XP
                    const combinedXp = new Map();
                    
                    // Ajouter les XP des messages
                    for (const user of messageLeaderboard) {
                        const levelInfo = await XPCalculator.getUserLevelInfo(user.totalXp);
                        combinedXp.set(user.userId, {
                            userId: user.userId,
                            messageXp: user.totalXp,
                            voiceXp: 0,
                            totalXp: user.totalXp,
                            level: levelInfo.level,
                            progress: levelInfo.progress,
                            levelInfo: levelInfo
                        });
                    }
                    
                    // Ajouter les XP vocaux
                    for (const user of voiceLeaderboard) {
                        const levelInfo = await XPCalculator.getUserLevelInfo(user.totalXp);
                        if (combinedXp.has(user.userId)) {
                            const existing = combinedXp.get(user.userId);
                            existing.voiceXp = user.totalXp;
                            existing.totalXp += user.totalXp;
                            // Mettre à jour le niveau et la progression avec le total combiné
                            const newLevelInfo = await XPCalculator.getUserLevelInfo(existing.totalXp);
                            existing.level = newLevelInfo.level;
                            existing.progress = newLevelInfo.progress;
                        } else {
                            combinedXp.set(user.userId, {
                                userId: user.userId,
                                messageXp: 0,
                                voiceXp: user.totalXp,
                                totalXp: user.totalXp,
                                level: levelInfo.level,
                                progress: levelInfo.progress,
                                levelInfo: levelInfo
                            });
                        }
                    }
                    
                    // Convertir en tableau et trier par XP total
                    leaderboard = Array.from(combinedXp.values())
                        .sort((a, b) => b.totalXp - a.totalXp)
                        .slice(0, 10);
                    
                    title = 'Classement XP Global';
                    description = 'Top 10 des utilisateurs avec le plus d\'XP total';
                    break;
            }
            
            if (leaderboard.length === 0) {
                await interaction.editReply({
                    content: '📭 Aucune donnée XP trouvée pour ce serveur.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }
            
            // Récupérer les informations des membres pour les avatars et noms d'utilisateur
            const leaderboardWithUsers = [];
            
            for (const entry of leaderboard) {
                try {
                    const member = await interaction.guild.members.fetch(entry.userId);
                    leaderboardWithUsers.push({
                        ...entry,
                        username: member.displayName,
                        avatarURL: member.user.displayAvatarURL({ format: 'png', dynamic: true, size: 256 })
                    });
                } catch (error) {
                    console.error(`Erreur lors de la récupération des informations du membre ${entry.userId}:`, error);
                    // Utiliser des valeurs par défaut si le membre n'est pas trouvé
                    leaderboardWithUsers.push({
                        ...entry,
                        username: `Utilisateur ${entry.userId}`,
                        avatarURL: null,
                        level: entry.level || 0,
                        progress: entry.progress || 0,
                        xp: entry.totalXp || 0
                    });
                }
            }
            
            try {
                console.log('[XP-SYSTEM] 🔍 Tentative de génération de l\'image du classement...');
                // Générer l'image du classement
                const imageBuffer = await leaderboardGenerator.generate(
                    leaderboardWithUsers.map(entry => ({
                        ...entry,
                        xp: entry.totalXp,
                        level: entry.level || 0,
                        progress: entry.progress || 0,
                        avatarURL: entry.avatarURL
                    })),
                    title,
                    leaderboardType
                );
                
                if (!imageBuffer || imageBuffer.length === 0) {
                    throw new Error('Le buffer de l\'image est vide');
                }
                
                console.log('[XP-SYSTEM] ✅ Image du classement générée avec succès');
                
                // Créer un fichier joint avec l'image générée
                const attachment = new AttachmentBuilder(imageBuffer, { name: 'leaderboard.png' });
                
                // Créer l'embed avec l'image
                const embed = new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(description)
                    .setImage('attachment://leaderboard.png')
                    .setColor(0x5865F2)
                    .setTimestamp();
                    
                // Ajouter des boutons pour changer de type de classement
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('leaderboard_global')
                            .setLabel('🌟 Global')
                            .setStyle(leaderboardType === 'global' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('leaderboard_message')
                            .setLabel('💬 Messages')
                            .setStyle(leaderboardType === 'message' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('leaderboard_voice')
                            .setLabel('🎤 Vocal')
                            .setStyle(leaderboardType === 'voice' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                    );
                
                // Envoyer le message avec l'image et les boutons
                await interaction.editReply({ 
                    content: null,
                    embeds: [embed],
                    components: [row],
                    files: [attachment]
                });
            } catch (genError) {
                console.error('[XP-SYSTEM] ❌ Erreur lors de la génération de l\'image du classement:', genError);
                
                // En cas d'échec de génération d'image, envoyer un classement textuel
                const embed = new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(description + '\n\n*Impossible de générer l\'image du classement. Affichage textuel à la place.*')
                    .setColor(0x5865F2);
                
                // Ajouter chaque entrée au classement textuel
                leaderboardWithUsers.forEach((entry, index) => {
                    embed.addFields({
                        name: `#${index + 1} - ${entry.username}`,
                        value: `Niveau ${entry.level} • ${entry.totalXp} XP`,
                        inline: false
                    });
                });
                
                // Ajouter des boutons pour changer de type de classement
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('leaderboard_global')
                            .setLabel('🌟 Global')
                            .setStyle(leaderboardType === 'global' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('leaderboard_message')
                            .setLabel('💬 Messages')
                            .setStyle(leaderboardType === 'message' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('leaderboard_voice')
                            .setLabel('🎤 Vocal')
                            .setStyle(leaderboardType === 'voice' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                    );
                
                await interaction.editReply({ 
                    content: null,
                    embeds: [embed],
                    components: [row]
                });
            }
            
        } catch (error) {
            console.error('Erreur lors de la génération du classement:', error);
            
            // En cas d'erreur, envoyer un message d'erreur
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Erreur')
                .setDescription('Une erreur est survenue lors de la génération du classement. Veuillez réessayer plus tard.')
                .setColor(0xFF0000);
                
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed] });
            }
        }
    },
    
    /**
     * Gère la commande profil
     */
    handleProfileCommand: async function(interaction) {
        console.log('[XP-SLASH] 🔍 Début handleProfileCommand');
        
        // Vérifier si l'interaction est déjà traitée
        if (interaction.replied || interaction.deferred) {
            console.log('[XP-SLASH] ⚠️ Interaction déjà traitée');
            return;
        }

        try {
            // Différer la réponse pour éviter les timeouts
            await interaction.deferReply();
            
            const targetUser = interaction.options.getUser('utilisateur') || interaction.user;
            console.log('[XP-SLASH] 🔍 Target user:', targetUser.id);
            
            const member = await interaction.guild.members.fetch(targetUser.id).catch(err => {
                console.error('[XP-SLASH] ❌ Erreur lors de la récupération du membre:', err);
                throw new Error('Impossible de récupérer les informations du membre.');
            });
            
            console.log('[XP-SLASH] 🔍 Member fetched:', member.displayName);

            // Récupérer les statistiques
            console.log('[XP-SLASH] 🔍 Récupération des stats...');
            let messageStats, voiceStats;
            
            try {
                console.log('[XP-SLASH] 🔍 Récupération des stats message...');
                messageStats = await messageXPHandler.getUserStats(interaction.guild.id, targetUser.id);
                console.log('[XP-SLASH] 🔍 Message stats:', messageStats);
                
                console.log('[XP-SLASH] 🔍 Récupération des stats vocales...');
                voiceStats = await voiceXPHandler.getUserVoiceStats(interaction.guild.id, targetUser.id);
                console.log('[XP-SLASH] 🔍 Voice stats:', voiceStats);
            } catch (statsError) {
                console.error('[XP-SLASH] ❌ Erreur lors de la récupération des stats:', statsError);
                throw new Error('Une erreur est survenue lors de la récupération des statistiques.');
            }

            // Calculer l'XP total et le niveau global
            console.log('[XP-SLASH] 🔍 Calcul de l\'XP total...');
            const totalXp = (messageStats?.totalXp || 0) + (voiceStats?.totalXp || 0);
            console.log('[XP-SLASH] 🔍 Total XP:', totalXp);
            
            console.log('[XP-SLASH] 🔍 Calcul du niveau global...');
            const globalLevelInfo = await XPCalculator.getUserLevelInfo(totalXp);
            console.log('[XP-SLASH] 🔍 Global level info:', globalLevelInfo);

            // Créer l'embed du profil
            console.log('[XP-SLASH] 🔍 Création de l\'embed...');
            let embed;
            try {
                console.log('[XP-SLASH] 🔍 Création de l\'objet embed...');
                embed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle(`📊 Profil XP de ${member.displayName}`);
                
                console.log('[XP-SLASH] 🔍 Configuration de la miniature...');
                const avatarURL = targetUser.displayAvatarURL({ dynamic: true, size: 1024 });
                console.log('[XP-SLASH] 🔍 URL de l\'avatar:', avatarURL);
                embed.setThumbnail(avatarURL);
                
                console.log('[XP-SLASH] 🔍 Préparation des champs...');
                const fields = [
                    {
                        name: '🌟 **Niveau Global**',
                        value: `\`\`\`yaml\nNiveau: ${globalLevelInfo.level}\nXP Total: ${totalXp.toLocaleString('fr-FR')}\nProgression: ${Math.round(globalLevelInfo.progress * 100)}%\`\`\``,
                        inline: true
                    },
                    {
                        name: '💬 **XP Messages**',
                        value: `\`\`\`fix\n${(messageStats?.totalXp || 0).toLocaleString('fr-FR')} XP\`\`\``,
                        inline: true
                    },
                    {
                        name: '🎤 **XP Vocal**',
                        value: `\`\`\`css\n${(voiceStats?.totalXp || 0).toLocaleString('fr-FR')} XP\n${Math.round(voiceStats?.totalMinutes || 0)} minutes\`\`\``,
                        inline: true
                    }
                ];
                
                console.log('[XP-SLASH] 🔍 Ajout des champs à l\'embed...');
                embed.addFields(fields);
                
                // Ajouter la barre de progression
                try {
                    const progress = globalLevelInfo.progress;
                    const progressBar = XPCalculator.generateProgressBar(progress, 20);
                    const xpInCurrentLevel = globalLevelInfo.xpInCurrentLevel || 0;
                    const xpToNextLevel = (globalLevelInfo.nextLevelXp || 0) - (globalLevelInfo.currentLevelXp || 0);
                    
                    const progressField = {
                        name: '📈 Progression vers le niveau suivant',
                        value: `\`${progressBar}\`\n${XPCalculator.formatXP(xpInCurrentLevel)} / ${XPCalculator.formatXP(xpToNextLevel)} XP`,
                        inline: false
                    };
                    
                    embed.addFields(progressField);
                    console.log('[XP-SLASH] ✅ Barre de progression ajoutée');
                } catch (progressError) {
                    console.error('[XP-SLASH] ❌ Erreur lors de l\'ajout de la barre de progression:', progressError);
                }
                
                // Ajouter les informations d'activité
                try {
                    if (messageStats?.lastMessageDate) {
                        const lastMessageTime = Math.floor(new Date(messageStats.lastMessageDate).getTime() / 1000);
                        const lastVoiceTime = voiceStats?.lastVoiceDate ? 
                            `<t:${Math.floor(new Date(voiceStats.lastVoiceDate).getTime() / 1000)}:R>` : 'Jamais';
                        
                        const activityField = {
                            name: '📅 Dernière activité',
                            value: `**Message:** <t:${lastMessageTime}:R>\n**Vocal:** ${lastVoiceTime}`,
                            inline: false
                        };
                        
                        embed.addFields(activityField);
                        console.log('[XP-SLASH] ✅ Activités ajoutées');
                    }
                } catch (activityError) {
                    console.error('[XP-SLASH] ❌ Erreur lors de l\'ajout des activités:', activityError);
                }
                
                // Configurer le footer
                const guildName = interaction.guild?.name || 'Serveur inconnu';
                const guildIcon = interaction.guild?.iconURL({ dynamic: true });
                const footer = { text: `Système XP • ${guildName}` };
                if (guildIcon) footer.iconURL = guildIcon;
                embed.setFooter(footer).setTimestamp();
                
                console.log('[XP-SLASH] ✅ Embed créé avec succès');
                
                // Envoyer la réponse
                await interaction.editReply({ embeds: [embed] });
                console.log('[XP-SLASH] ✅ Réponse envoyée avec succès');
                
            } catch (embedError) {
                console.error('[XP-SLASH] ❌ Erreur lors de la création de l\'embed:', embedError);
                throw new Error('Une erreur est survenue lors de la création du profil.');
            }
            
        } catch (error) {
            console.error('[XP-SLASH] ❌ Erreur dans handleProfileCommand:', error);
            
            const errorMessage = {
                content: `❌ ${error.message || 'Une erreur est survenue lors de la récupération du profil XP.'}`,
                flags: MessageFlags.Ephemeral
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply(errorMessage).catch(console.error);
            } else {
                await interaction.reply(errorMessage).catch(console.error);
            }
        }
    },

    /**
     * Gère la commande config
     */
    handleConfigCommand: async function(interaction) {
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
                    await this.showConfig(interaction);
                    break;
                case 'edit':
                    console.log('[XP-SLASH] 🔍 Appel editConfig...');
                    await this.editConfig(interaction);
                    break;
                case 'rewards':
                    console.log('[XP-SLASH] 🔍 Appel manageRewards...');
                    await this.manageRewards(interaction);
                    break;
                case 'exclusions':
                    console.log('[XP-SLASH] 🔍 Appel manageExclusions...');
                    await this.manageExclusions(interaction);
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
    },
    
    /**
     * Affiche la configuration actuelle
     */
    showConfig: async function(interaction) {
        const config = await xpDataManager.getConfig(interaction.guild.id);
        console.log('[XP-SLASH] 🔍 Début showConfig');
        console.log('[XP-SLASH] 🔍 Config récupérée:', config ? 'OK' : 'NULL');

        try {
    
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
    },
    
    /**
     * Interface d'édition de la configuration
     */
    editConfig: async function(interaction) {
        // Cette fonction sera étendue avec des modals pour l'édition
        await interaction.reply({
            content: '🚧 Interface d\'édition en cours de développement. Utilisez les fichiers JSON pour le moment.',
            flags: MessageFlags.Ephemeral
        });
    },
    
    /**
     * Gestion des récompenses de rôles
     */
    manageRewards: async function(interaction) {
        const type = interaction.options.getString('type') || 'all';
        const targetUser = interaction.options.getUser('utilisateur');
        let resetMessage = '';
        
        try {
            await interaction.deferReply();
            
            if (!targetUser) {
                return interaction.editReply({
                    content: '❌ Veuillez spécifier un utilisateur.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
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
                .setColor(0x57F287)
                .setTitle('✅ Reset XP Effectué')
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
            
            const errorMessage = interaction.replied || interaction.deferred 
                ? { content: '❌ Une erreur est survenue lors du reset de l\'XP.', flags: MessageFlags.Ephemeral }
                : { content: '❌ Une erreur est survenue lors du reset de l\'XP.', flags: MessageFlags.Ephemeral };
                
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    },
    
    /**
     * Gère la commande give
     */
    handleGiveCommand: async function(interaction) {
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
            
            const errorMessage = interaction.replied || interaction.deferred 
                ? { content: '❌ Une erreur est survenue lors de l\'attribution de l\'XP.', flags: MessageFlags.Ephemeral }
                : { content: '❌ Une erreur est survenue lors de l\'attribution de l\'XP.', flags: MessageFlags.Ephemeral };
                
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    },
    
    /**
     * Gère la commande import
     */
    handleImportCommand: async function(interaction) {
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
    },
    
    /**
     * Gère la commande export
     */
    handleExportCommand: async function(interaction) {
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
    },
    
    // Ajout d'une méthode vide pour éviter les erreurs de syntaxe
    // Cette méthode sera implémentée ultérieurement
    handleResetCommand: async function(interaction) {
        await interaction.reply({
            content: '🚧 Fonctionnalité de réinitialisation en cours de développement.',
            flags: MessageFlags.Ephemeral
        });
    }
};

export default xpCommand;