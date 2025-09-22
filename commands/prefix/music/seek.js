export default {
    name: 'seek',
    description: 'Avance rapide dans la musique',
    category: 'music',
    usage: 'seek [secondes]',
    
    async execute(message, args, client) {
        // Simuler une interaction pour réutiliser la logique du queueManager
        const fakeInteraction = {
            user: message.author,
            member: message.member,
            guild: message.guild,
            channel: message.channel,
            options: {
                getInteger: (name) => {
                    if (name === 'secondes') {
                        const seconds = parseInt(args[0]);
                        return isNaN(seconds) ? 10 : Math.min(Math.max(seconds, 1), 300);
                    }
                    return null;
                }
            },
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
        
        await client.queueManager.seekForward(fakeInteraction);
    }
};