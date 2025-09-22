export default {
    name: 'speed',
    description: 'Active/désactive l\'effet accéléré (nightcore)',
    category: 'music',
    usage: 'speed',
    
    async execute(message, args, client) {
        // Simuler une interaction pour réutiliser la logique du queueManager
        const fakeInteraction = {
            user: message.author,
            member: message.member,
            guild: message.guild,
            channel: message.channel,
            deferReply: async () => {},
            editReply: async (content) => {
                if (typeof content === 'string') {
                    return message.reply(content);
                }
                return message.reply(content);
            },
            reply: async (content) => {
                if (typeof content === 'string') {
                    return message.reply(content);
                }
                return message.reply(content);
            }
        };
        
        await client.queueManager.toggleFilter(fakeInteraction, 'nightcore');
    }
};