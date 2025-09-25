import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { addWarning, getUserData, logSuccess, logError } from '../../../src/handlers/progressiveSuspensions.js';

export default {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Donner un avertissement à un utilisateur')
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('L\'utilisateur à avertir')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('raison')
                .setDescription('La raison de l\'avertissement')
                .setRequired(false)
                .setMaxLength(500))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction) {
        try {
            // Vérifier les permissions
            if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Permissions insuffisantes')
                    .setDescription('Vous n\'avez pas la permission de modérer les membres.')
                    .setTimestamp();
                
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
            
            // Récupérer les options
            const targetUser = interaction.options.getUser('utilisateur');
            const reason = interaction.options.getString('raison') || 'Aucune raison spécifiée';
            
            // Vérifier que l'utilisateur est dans le serveur
            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            if (!targetMember) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Membre non trouvé')
                    .setDescription('Cet utilisateur n\'est pas membre de ce serveur.')
                    .setTimestamp();
                
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
            
            // Vérifier qu'on ne peut pas s'avertir soi-même
            if (targetUser.id === interaction.user.id) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Action impossible')
                    .setDescription('Vous ne pouvez pas vous donner un avertissement à vous-même.')
                    .setTimestamp();
                
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
            
            // Vérifier qu'on ne peut pas avertir le bot
            if (targetUser.bot) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Action impossible')
                    .setDescription('Vous ne pouvez pas donner un avertissement à un bot.')
                    .setTimestamp();
                
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
            
            // Ajouter l'avertissement
            const userData = await addWarning(interaction.guild, targetUser, interaction.user, reason);
            
            // Créer l'embed de confirmation
            const confirmEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('⚠️ Avertissement donné')
                .setDescription(`${targetUser} a reçu un avertissement **(${userData.warnings}/3)**.`)
                .addFields(
                    { name: '📋 Raison', value: reason, inline: false },
                    { name: '👮 Modérateur', value: `${interaction.user}`, inline: true },
                    { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                )
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp()
                .setFooter({ text: 'Système de Suspensions Progressives' });
            
            // Ajouter un champ si c'est le 3ème avertissement
            if (userData.warnings >= 3) {
                confirmEmbed.addFields(
                    { name: '🚫 Suspension automatique', value: 'L\'utilisateur a été automatiquement suspendu niveau 1.', inline: false }
                );
                confirmEmbed.setColor('#FF6B6B');
            }
            
            await interaction.reply({ embeds: [confirmEmbed] });
            
            logSuccess(`Avertissement donné à ${targetUser.username} par ${interaction.user.username} - Raison: ${reason}`);
            
        } catch (error) {
            logError(`Erreur dans la commande slash warn: ${error.message}`);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Erreur')
                .setDescription('Une erreur est survenue lors de l\'exécution de la commande.')
                .setTimestamp();
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
};