import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } from 'discord.js';
import messageXPHandler from '../../../src/utils/messageXpHandler.js';
import voiceXPHandler from '../../../src/utils/voiceXpHandler.js';
import XPCalculator from '../../../src/utils/xpCalculator.js';

export default {
    category: 'utilisateur',
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
        ),

    async execute(interaction) {
        console.log('[XP-SLASH] 🔍 Début exécution commande XP slash');

        try {
            const subcommand = interaction.options.getSubcommand();
            console.log('[XP-SLASH] 🔍 Sous-commande:', subcommand);

            switch (subcommand) {
                case 'profil':
                    await handleProfileCommand(interaction);
                    break;
                case 'classement':
                    await handleLeaderboardCommand(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Sous-commande non reconnue.',
                        flags: MessageFlags.Ephemeral
                    });
            }
        } catch (error) {
            console.error('[XP-SLASH] ❌ Erreur dans la commande XP:', error);

            const errorMessage = {
                content: '❌ Une erreur est survenue lors de l\'exécution de la commande XP.',
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

// Fonction pour gérer le profil
async function handleProfileCommand(interaction) {
    console.log('[XP-SLASH] 🔍 Début handleProfileCommand');

    try {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('utilisateur') || interaction.user;
        console.log('[XP-SLASH] 🔍 Target user:', targetUser.tag);

        const member = await interaction.guild.members.fetch(targetUser.id);

        // Récupérer les statistiques réelles
        const messageStats = await messageXPHandler.getUserStats(interaction.guild.id, targetUser.id);
        const voiceStats = await voiceXPHandler.getUserVoiceStats(interaction.guild.id, targetUser.id);

        // Calculer l'XP total et le niveau global
        const totalXp = messageStats.totalXp + voiceStats.totalXp;
        const globalLevelInfo = await XPCalculator.getUserLevelInfo(totalXp);

        // Créer l'embed du profil
        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle(`📊 Profil XP de ${member.displayName}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields([
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
            ])
            .setFooter({
                text: `Système XP • ${interaction.guild.name}`,
                iconURL: interaction.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

        // Ajouter la barre de progression
        try {
            const progressBar = XPCalculator.generateProgressBar(globalLevelInfo.progress, 20);
            embed.addFields({
                name: '📈 Progression vers le niveau suivant',
                value: `\`${progressBar}\`\n${XPCalculator.formatXP(globalLevelInfo.xpInCurrentLevel)} / ${XPCalculator.formatXP(globalLevelInfo.xpToNextLevel)} XP`,
                inline: false
            });
        } catch (progressError) {
            console.error('[XP-SLASH] ❌ Erreur barre de progression:', progressError);
        }

        await interaction.editReply({ embeds: [embed] });
        console.log('[XP-SLASH] ✅ Profil affiché avec succès');

    } catch (error) {
        console.error('[XP-SLASH] ❌ Erreur dans handleProfileCommand:', error);

        const errorMessage = {
            content: '❌ Une erreur est survenue lors de la récupération du profil XP.',
            flags: MessageFlags.Ephemeral
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
}

// Fonction pour gérer le classement
async function handleLeaderboardCommand(interaction) {
    console.log('[XP-SLASH] 🔍 Début handleLeaderboardCommand');

    try {
        await interaction.deferReply();

        const type = interaction.options.getString('type') || 'global';
        console.log('[XP-SLASH] 🔍 Type de classement:', type);

        let leaderboard = [];
        let title = '';
        let description = '';

        // Récupérer les données selon le type
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
            default:
                // Combiner les deux classements
                const messageLeaderboard = await messageXPHandler.getLeaderboard(interaction.guild.id, 50);
                const voiceLeaderboard = await voiceXPHandler.getVoiceLeaderboard(interaction.guild.id, 50);

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

                leaderboard = await Promise.all(leaderboard);
                title = '🏆 Classement XP Global';
                description = 'Top 10 des utilisateurs avec le plus d\'XP total';
                break;
        }

        const embed = new EmbedBuilder()
            .setColor(0xf1c40f)
            .setTitle(title)
            .setDescription(description)
            .setFooter({
                text: `Page 1/1 • ${interaction.guild.name}`,
                iconURL: interaction.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

        if (leaderboard.length === 0) {
            embed.addFields({
                name: '📊 **Top Utilisateurs**',
                value: '```\n🥇 Aucun utilisateur trouvé\n🥈 Commencez à discuter !\n🥉 Gagnez de l\'XP en étant actif\n```',
                inline: false
            });
        } else {
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
        }

        // Créer les boutons pour le type de classement
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

        await interaction.editReply({
            embeds: [embed],
            components: [row]
        });

        console.log('[XP-SLASH] ✅ Classement affiché avec succès');

    } catch (error) {
        console.error('[XP-SLASH] ❌ Erreur dans handleLeaderboardCommand:', error);

        const errorMessage = {
            content: '❌ Une erreur est survenue lors de la génération du classement.',
            flags: MessageFlags.Ephemeral
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
}