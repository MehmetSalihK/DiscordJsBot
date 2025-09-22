export default {
    name: 'loop',
    aliases: ['repeat', 'boucle'],
    description: 'Active/désactive la boucle (off, track, queue)',
    usage: '!loop <off|track|queue>',
    category: 'music',
    
    async execute(message, args, client) {
        if (!args.length) {
            return message.reply('❌ Veuillez spécifier un mode de boucle : `off`, `track`, ou `queue` !');
        }

        const mode = args[0].toLowerCase();

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

        await client.queueManager.setLoop(fakeInteraction, mode);
    }
};



