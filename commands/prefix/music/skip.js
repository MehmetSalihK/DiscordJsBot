export default {
    name: 'skip',
    aliases: ['s', 'next', 'passer'],
    description: 'Passe à la musique suivante',
    usage: '!skip',
    category: 'music',
    
    async execute(message, args, client) {
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

        await client.queueManager.skip(fakeInteraction);
    }
};



