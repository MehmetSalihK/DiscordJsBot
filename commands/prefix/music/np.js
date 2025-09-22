export default {
    name: 'np',
    aliases: ['nowplaying', 'current', 'actuel'],
    description: 'Affiche la musique actuellement en cours de lecture',
    usage: '!np',
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

        await client.queueManager.nowPlaying(fakeInteraction);
    }
};



