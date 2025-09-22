export default {
    name: 'volume',
    aliases: ['vol', 'v'],
    description: 'Ajuste le volume de la musique (1-100)',
    usage: '!volume <1-100>',
    category: 'music',
    
    async execute(message, args, client) {
        if (!args.length) {
            return message.reply('❌ Veuillez spécifier un volume entre 1 et 100 !');
        }

        const volume = parseInt(args[0]);
        
        if (isNaN(volume)) {
            return message.reply('❌ Le volume doit être un nombre !');
        }

        const fakeInteraction = {
            member: message.member,
            user: message.author,
            guild: message.guild,
            channel: message.channel,
            client: client,
            reply: async (options) => {
                if (typeof options === 'string') {
                    return message.reply(options);
                }
                return message.reply(options);
            }
        };

        await client.queueManager.setVolume(fakeInteraction, volume);
    }
};



