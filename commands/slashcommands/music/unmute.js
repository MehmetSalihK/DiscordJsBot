import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('unmutebot')
    .setDescription('Désactive la sourdine du bot');

export async function execute(interaction) {
    try {
        const guild = interaction.guild;
        const botMember = guild.members.me;
        const botVoiceChannel = botMember.voice.channel;
        
        if (!botVoiceChannel) {
            const embed = new EmbedBuilder()
                .setColor('#ff6b6b')
                .setTitle('❌ Erreur')
                .setDescription('Le bot n\'est pas connecté à un salon vocal.')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [embed], flags: 64 }); // MessageFlags.Ephemeral
        }
        
        // Désactiver la sourdine auto
        if (botMember.voice.selfMute) {
            await botMember.voice.setSelfMute(false);
        }
        
        // Note: La sourdine serveur ne peut pas être désactivée par le bot lui-même
        // Elle doit être désactivée manuellement par un modérateur
        
        const embed = new EmbedBuilder()
            .setColor('#4CAF50')
            .setTitle('🔊 Sourdine désactivée')
            .setDescription('La sourdine automatique du bot a été désactivée.')
            .addFields(
                { 
                    name: '💡 Note', 
                    value: 'Si le bot est toujours en sourdine, un modérateur doit le désactiver manuellement (clic droit sur le bot → Désactiver la sourdine).' 
                }
            )
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Erreur lors de la désactivation de la sourdine:', error);
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff6b6b')
            .setTitle('❌ Erreur')
            .setDescription('Une erreur s\'est produite lors de la désactivation de la sourdine.')
            .setTimestamp();
        
        await interaction.reply({ embeds: [errorEmbed], flags: 64 }); // MessageFlags.Ephemeral
    }
}




