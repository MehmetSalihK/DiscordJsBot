export default {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // Gestion des commandes slash
        if (interaction.isChatInputCommand()) {
            const command = client.slashCommands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error('❌ Erreur lors de l\'exécution de la commande slash:', error);
                const reply = {
                    content: '❌ Une erreur est survenue lors de l\'exécution de cette commande.',
                    flags: 64 // MessageFlags.Ephemeral
                };
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply(reply);
                } else {
                    await interaction.reply(reply);
                }
            }
        }

        // Gestion des boutons du panel de musique
        if (interaction.isButton() && interaction.customId.startsWith('music_')) {
            try {
                await client.queueManager.handlePanelInteraction(interaction);
            } catch (error) {
                console.error('❌ Erreur lors de l\'interaction avec le panel de musique:', error);
                const reply = {
                    content: '❌ Une erreur est survenue lors de l\'interaction avec le panel.',
                    flags: 64 // MessageFlags.Ephemeral
                };
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply(reply);
                } else {
                    await interaction.reply(reply);
                }
            }
        }

        // Gestion des autres boutons (existants)
        if (interaction.isButton()) {
            const { handleHelpButton, handleLogsButton, handleServerInfoButton, handleXPButton } = await import('../handlers/buttonHandlers.js');
            
            switch (interaction.customId) {
                case 'help_button':
                    await handleHelpButton(interaction);
                    break;
                case 'logs_button':
                    await handleLogsButton(interaction);
                    break;
                case 'server_info_button':
                    await handleServerInfoButton(interaction);
                    break;
                case 'xp_button':
                    await handleXPButton(interaction);
                    break;
            }
        }

        // Gestion des modals
        if (interaction.isModalSubmit()) {
            const { handleXPModal } = await import('../handlers/buttonHandlers.js');
            
            if (interaction.customId === 'xp_modal') {
                await handleXPModal(interaction);
            }
        }
    }
};