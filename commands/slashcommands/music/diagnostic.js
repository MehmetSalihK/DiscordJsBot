import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('diagnostic')
    .setDescription('Vérifie l\'état vocal du bot et les permissions');

export async function execute(interaction) {
    try {
        const guild = interaction.guild;
        const member = interaction.member;
        const botMember = guild.members.me;
        
        // Vérifier si l'utilisateur est dans un salon vocal
        const userVoiceChannel = member.voice.channel;
        const botVoiceChannel = botMember.voice.channel;
        
        const embed = new EmbedBuilder()
            .setColor('#4CAF50')
            .setTitle('🔧 Diagnostic vocal du bot')
            .setTimestamp();
        
        let diagnosticText = '';
        
        // État de l'utilisateur
        diagnosticText += `**👤 Utilisateur :**\n`;
        diagnosticText += `• Salon vocal : ${userVoiceChannel ? `${userVoiceChannel.name}` : '❌ Aucun'}\n\n`;
        
        // État du bot
        diagnosticText += `**🤖 Bot :**\n`;
        diagnosticText += `• Salon vocal : ${botVoiceChannel ? `${botVoiceChannel.name}` : '❌ Aucun'}\n`;
        
        if (botVoiceChannel) {
            diagnosticText += `• En sourdine serveur : ${botMember.voice.serverMute ? '🔇 Oui' : '✅ Non'}\n`;
            diagnosticText += `• En sourdine auto : ${botMember.voice.selfMute ? '🔇 Oui' : '✅ Non'}\n`;
            diagnosticText += `• Sourd serveur : ${botMember.voice.serverDeaf ? '🔇 Oui' : '✅ Non'}\n`;
            diagnosticText += `• Sourd auto : ${botMember.voice.selfDeaf ? '🔇 Oui' : '✅ Non'}\n`;
        }
        
        // Permissions dans le salon vocal de l'utilisateur
        if (userVoiceChannel) {
            diagnosticText += `\n**🔑 Permissions dans ${userVoiceChannel.name} :**\n`;
            const permissions = botMember.permissionsIn(userVoiceChannel);
            diagnosticText += `• Se connecter : ${permissions.has('Connect') ? '✅' : '❌'}\n`;
            diagnosticText += `• Parler : ${permissions.has('Speak') ? '✅' : '❌'}\n`;
            diagnosticText += `• Utiliser l'activité vocale : ${permissions.has('UseVAD') ? '✅' : '❌'}\n`;
            diagnosticText += `• Gérer les messages : ${permissions.has('ManageMessages') ? '✅' : '❌'}\n`;
        }
        
        // Recommandations
        diagnosticText += `\n**💡 Recommandations :**\n`;
        if (!userVoiceChannel) {
            diagnosticText += `• Rejoignez un salon vocal avant d'utiliser les commandes de musique\n`;
        }
        if (botMember.voice.serverMute) {
            diagnosticText += `• ⚠️ Le bot est en sourdine serveur - désactivez la sourdine\n`;
        }
        if (botMember.voice.selfMute) {
            diagnosticText += `• ⚠️ Le bot s'est mis en sourdine - utilisez /unmute ou redémarrez\n`;
        }
        if (userVoiceChannel && !botMember.permissionsIn(userVoiceChannel).has('Speak')) {
            diagnosticText += `• ❌ Le bot n'a pas la permission de parler dans ce salon\n`;
        }
        
        embed.setDescription(diagnosticText);
        
        await interaction.reply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Erreur lors du diagnostic:', error);
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff6b6b')
            .setTitle('❌ Erreur')
            .setDescription('Une erreur s\'est produite lors du diagnostic.')
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], flags: 64 // MessageFlags.Ephemeral });
    }
}



