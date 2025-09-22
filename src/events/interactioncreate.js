import { MessageFlags } from 'discord.js';

export default {
    name: 'interactionCreate',
    async execute(interaction, client) {
        try {
            // Gestion des commandes slash
            if (interaction.isChatInputCommand()) {
                const command = client.slashCommands.get(interaction.commandName);
                if (!command) {
                    await interaction.reply({ content: 'Commande introuvable.', flags: MessageFlags.Ephemeral });
                    return;
                }
                await command.execute(interaction, client);
            } 
            // Gestion des boutons
            else if (interaction.isButton()) {
                const id = interaction.customId || '';
                
                // Gestion des boutons d'aide, logs, serveur info, XP
                if (id.startsWith('help_')) {
                    const { handleHelpButton } = await import('../handlers/buttonHandlers.js');
                    return handleHelpButton(interaction, client);
                }
                if (id.startsWith('logs_')) {
                    const { handleLogsButton } = await import('../handlers/buttonHandlers.js');
                    return handleLogsButton(interaction, client);
                }
                if (id.startsWith('srv_')) {
                    const { handleServerInfoButton } = await import('../handlers/buttonHandlers.js');
                    return handleServerInfoButton(interaction, client);
                }
                if (id.startsWith('xp_')) {
                    const { handleXPButton } = await import('../handlers/buttonHandlers.js');
                    return handleXPButton(interaction, client);
                }
                
                // Gestion des boutons AutoRole
                if (id.startsWith('autorole_')) {
                    const { handleAutoRoleInteraction } = await import('../modules/autorole/interactions.js');
                    return handleAutoRoleInteraction(interaction);
                }
                
                // Gestion des boutons de réaction
                if (id.startsWith('buttonreact_')) {
                    const { handleButtonReactInteraction } = await import('../modules/buttonreact/interactions.js');
                    await handleButtonReactInteraction(interaction);
                    return;
                }
                
                // Gestion des boutons de musique
                if (id.startsWith('music_') || id.startsWith('queue_') || id.startsWith('search_')) {
                    await client.musicButtonHandler.handleButtonInteraction(interaction);
                    return;
                }
                
                // Anciens boutons (compatibilité)
                switch (interaction.customId) {
                    case 'help_button':
                        const { handleHelpButton } = await import('../handlers/buttonHandlers.js');
                        await handleHelpButton(interaction);
                        break;
                    case 'logs_button':
                        const { handleLogsButton } = await import('../handlers/buttonHandlers.js');
                        await handleLogsButton(interaction);
                        break;
                    case 'server_info_button':
                        const { handleServerInfoButton } = await import('../handlers/buttonHandlers.js');
                        await handleServerInfoButton(interaction);
                        break;
                    case 'xp_button':
                        const { handleXPButton } = await import('../handlers/buttonHandlers.js');
                        await handleXPButton(interaction);
                        break;
                }
            }
            // Gestion des menus de sélection
            else if (interaction.isStringSelectMenu()) {
                if (interaction.customId.startsWith('autorole_')) {
                    const { handleAutoRoleInteraction } = await import('../modules/autorole/interactions.js');
                    return handleAutoRoleInteraction(interaction);
                }
            }
            // Gestion des modals
            else if (interaction.isModalSubmit()) {
                if (interaction.customId === 'xp_levels_modal') {
                    const { handleXPModal } = await import('../handlers/buttonHandlers.js');
                    return handleXPModal(interaction, client);
                }
                
                // Gestion des modales AutoRole
                if (interaction.customId.startsWith('autorole_')) {
                    const { handleAutoRoleInteraction } = await import('../modules/autorole/interactions.js');
                    return handleAutoRoleInteraction(interaction);
                }
                
                // Ancien modal (compatibilité)
                if (interaction.customId === 'xp_modal') {
                    const { handleXPModal } = await import('../handlers/buttonHandlers.js');
                    await handleXPModal(interaction);
                }
            }
        } catch (error) {
            console.error('❌ Erreur lors du traitement d\'une interaction:', error);
            const reply = {
                content: '❌ Une erreur est survenue lors de l\'exécution de cette commande.',
                flags: MessageFlags.Ephemeral
            };
            
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply(reply);
            } else {
                await interaction.reply(reply);
            }
        }
    }
};