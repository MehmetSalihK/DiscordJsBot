export default {
    name: 'pause',
    aliases: ['pausar'],
    description: 'Met en pause la lecture actuelle',
    usage: '!pause',
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

        await client.queueManager.pause(fakeInteraction);
    }
};



