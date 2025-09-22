export default {
    name: 'stop',
    aliases: ['arreter', 'arret'],
    description: 'Arrête la lecture et vide la queue',
    usage: '!stop',
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

        await client.queueManager.stop(fakeInteraction);
    }
};



