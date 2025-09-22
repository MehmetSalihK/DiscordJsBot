export default {
    name: 'queue',
    aliases: ['q', 'list', 'liste'],
    description: 'Affiche la liste d\'attente des musiques',
    usage: '!queue [page]',
    category: 'music',
    
    async execute(message, args, client) {
        const page = args.length ? parseInt(args[0]) || 1 : 1;

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

        await client.queueManager.showQueue(fakeInteraction, page);
    }
};



