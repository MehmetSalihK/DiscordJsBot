import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';

export default {
    name: 'cc',
    description: '🎤 Configurer le système de salons vocaux automatiques',
    usage: '!cc',
    category: 'admin',
    permissions: ['ManageChannels'],
    
    async execute(message, args) {
        try {
            // Vérifier les permissions
            if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('❌ Permissions insuffisantes')
                    .setDescription('Vous devez avoir la permission **Gérer les salons** pour utiliser cette commande.')
                    .setTimestamp();
                
                return await message.reply({ embeds: [errorEmbed] });
            }

            // Récupérer tous les salons vocaux du serveur
            const voiceChannels = message.guild.channels.cache.filter(channel => 
                channel.type === ChannelType.GuildVoice &&
                channel.permissionsFor(message.guild.members.me).has([
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.ManageChannels
                ])
            );

            if (voiceChannels.size === 0) {
                const noChannelsEmbed = new EmbedBuilder()
                    .setColor('#FF6B35')
                    .setTitle('⚠️ Aucun salon vocal disponible')
                    .setDescription('Aucun salon vocal n\'a été trouvé ou le bot n\'a pas les permissions nécessaires.')
                    .setTimestamp();
                
                return await message.reply({ embeds: [noChannelsEmbed] });
            }

            // Créer le menu de sélection
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('cc_master_channel_select')
                .setPlaceholder('🎯 Choisissez le salon vocal maître')
                .setMinValues(1)
                .setMaxValues(1);

            // Ajouter les options au menu (limité à 25 options max)
            const channelOptions = voiceChannels.first(25).map(channel => ({
                label: channel.name.length > 100 ? channel.name.substring(0, 97) + '...' : channel.name,
                description: `👥 ${channel.members.size} membres connectés`,
                value: channel.id,
                emoji: '🎤'
            }));

            selectMenu.addOptions(channelOptions);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setColor('#00D4FF')
                .setTitle('🎤 Configuration des Salons Vocaux Automatiques')
                .setDescription(`
                **Bienvenue dans le système de salons vocaux automatiques !**
                
                🎯 **Étape 1:** Sélectionnez un salon vocal maître
                🔧 **Fonctionnement:** Quand un utilisateur rejoint le salon maître, un nouveau salon personnel sera créé automatiquement
                
                **Fonctionnalités incluses:**
                🦵 Expulser des utilisateurs
                🔨 Bannir/débannir des utilisateurs  
                🚫 Liste noire personnalisée
                🔑 Gestion des permissions
                ✏️ Modification du salon (nom, limite, bitrate)
                
                **Sélectionnez le salon vocal maître ci-dessous:**
                `)
                .addFields(
                    { 
                        name: '📊 Salons vocaux disponibles', 
                        value: `${voiceChannels.size} salon(s) vocal(aux) trouvé(s)`, 
                        inline: true 
                    },
                    { 
                        name: '🤖 Permissions du bot', 
                        value: '✅ Gérer les salons\n✅ Voir les salons', 
                        inline: true 
                    }
                )
                .setFooter({ 
                    text: 'Système Auto-VC • Développé pour votre serveur', 
                    iconURL: message.client.user.displayAvatarURL() 
                })
                .setTimestamp();

            await message.reply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('[AUTO-VC] Erreur dans la commande !cc:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Erreur système')
                .setDescription('Une erreur est survenue lors de l\'exécution de la commande. Veuillez réessayer.')
                .setTimestamp();
            
            await message.reply({ embeds: [errorEmbed] });
        }
    }
};