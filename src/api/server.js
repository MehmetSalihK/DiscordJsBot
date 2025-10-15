import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DashboardAPI {
    constructor(client) {
        this.client = client;
        this.app = express();
        this.server = createServer(this.app);
        this.io = new SocketIOServer(this.server, {
            cors: {
                origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
                methods: ["GET", "POST", "PUT", "DELETE"],
                credentials: true
            }
        });
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupSocketIO();
    }
    
    setupMiddleware() {
        this.app.use(cors({
            origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
            credentials: true
        }));
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, '../../dashboard-frontend/dist')));
    }
    
    setupRoutes() {
        // Route de base
        this.app.get('/api/health', (_req, res) => {
            res.json({ 
                status: 'ok', 
                uptime: process.uptime(),
                bot: {
                    ready: this.client.isReady(),
                    guilds: this.client.guilds.cache.size,
                    users: this.client.users.cache.size
                }
            });
        });
        
        // Statistiques du bot
        this.app.get('/api/stats', (_req, res) => {
            const stats = this.getBotStats();
            res.json(stats);
        });
        
        // Liste des serveurs
        this.app.get('/api/servers', (_req, res) => {
            const servers = this.client.guilds.cache.map(guild => ({
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL(),
                memberCount: guild.memberCount,
                config: {
                    name: guild.name,
                    prefix: '!'
                }
            }));
            res.json(servers);
        });
        
        // Informations d'un serveur spécifique
        this.app.get('/api/guild/:guildId/overview', (req, res) => {
            const { guildId } = req.params;
            const guild = this.client.guilds.cache.get(guildId);
            
            if (!guild) {
                return res.status(404).json({ error: 'Serveur non trouvé' });
            }
            
            const overview = {
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL(),
                members: {
                    total: guild.memberCount,
                    online: guild.members.cache.filter(m => m.presence?.status === 'online').size,
                    bots: guild.members.cache.filter(m => m.user.bot).size
                },
                roles: {
                    count: guild.roles.cache.size
                },
                channels: {
                    total: guild.channels.cache.size,
                    text: guild.channels.cache.filter(c => c.type === 0).size,
                    voice: guild.channels.cache.filter(c => c.type === 2).size,
                    categories: guild.channels.cache.filter(c => c.type === 4).size
                },
                emojis: {
                    count: guild.emojis.cache.size
                },
                stickers: {
                    count: guild.stickers.cache.size
                }
            };
            
            res.json(overview);
        });
        
        // Membres d'un serveur
        this.app.get('/api/guild/:guildId/members', async (req, res) => {
            const { guildId } = req.params;
            const { limit = 100, search = '' } = req.query;
            const guild = this.client.guilds.cache.get(guildId);
            
            if (!guild) {
                return res.status(404).json({ error: 'Serveur non trouvé' });
            }
            
            try {
                await guild.members.fetch();
                let members = Array.from(guild.members.cache.values());
                
                // Filtrer par recherche si fournie
                if (search) {
                    const searchLower = search.toLowerCase();
                    members = members.filter(member => 
                        member.displayName.toLowerCase().includes(searchLower) ||
                        member.user.username.toLowerCase().includes(searchLower)
                    );
                }
                
                // Limiter les résultats
                members = members.slice(0, parseInt(limit));
                
                const memberData = members.map(member => ({
                    id: member.id,
                    username: member.user.username,
                    displayName: member.displayName,
                    avatar: member.user.displayAvatarURL(),
                    bot: member.user.bot,
                    status: member.presence?.status || 'offline',
                    roles: member.roles.cache.map(role => ({
                        id: role.id,
                        name: role.name
                    }))
                }));
                
                res.json(memberData);
            } catch (error) {
                console.error('Erreur lors de la récupération des membres:', error);
                res.status(500).json({ error: 'Erreur lors de la récupération des membres' });
            }
        });
        
        // Canaux d'un serveur
        this.app.get('/api/guild/:guildId/channels', (req, res) => {
            const { guildId } = req.params;
            const guild = this.client.guilds.cache.get(guildId);
            
            if (!guild) {
                return res.status(404).json({ error: 'Serveur non trouvé' });
            }
            
            const channels = {
                text: guild.channels.cache
                    .filter(c => c.type === 0)
                    .map(c => ({
                        id: c.id,
                        name: c.name,
                        category: c.parent?.name || null
                    })),
                voice: guild.channels.cache
                    .filter(c => c.type === 2)
                    .map(c => ({
                        id: c.id,
                        name: c.name,
                        category: c.parent?.name || null
                    }))
            };
            
            res.json(channels);
        });
        
        // Rôles d'un serveur
        this.app.get('/api/guild/:guildId/roles', (req, res) => {
            const { guildId } = req.params;
            const guild = this.client.guilds.cache.get(guildId);
            
            if (!guild) {
                return res.status(404).json({ error: 'Serveur non trouvé' });
            }
            
            const roles = guild.roles.cache.map(role => ({
                id: role.id,
                name: role.name,
                color: role.hexColor,
                position: role.position,
                permissions: role.permissions.toArray(),
                mentionable: role.mentionable,
                hoist: role.hoist
            }));
            
            res.json(roles);
        });
        
        // Modules et configuration (placeholder)
        this.app.get('/api/modules/:guildId', (_req, res) => {
            res.json({
                xp: { enabled: true },
                logs: { enabled: true },
                autoVoice: { enabled: true },
                security: { enabled: true }
            });
        });
        
        // Configuration XP (placeholder)
        this.app.get('/api/module/xp/:guildId', (_req, res) => {
            res.json({
                enabled: true,
                messageXp: { min: 15, max: 25 },
                voiceXp: { voiceChunkXP: 10, voiceChunkSeconds: 60 },
                levelUpMessage: true,
                levelUpChannel: null
            });
        });
        
        // Fallback pour le frontend
        this.app.get('*', (_req, res) => {
            res.sendFile(path.join(__dirname, '../../dashboard-frontend/dist/index.html'));
        });
    }
    
    setupSocketIO() {
        this.io.on('connection', (socket) => {
            console.log('📱 Client connecté au dashboard');
            
            // Envoyer les stats initiales
            socket.emit('stats', this.getBotStats());
            
            // Envoyer les logs initiaux (placeholder)
            socket.emit('logs.bootstrap', []);
            
            socket.on('disconnect', () => {
                console.log('📱 Client déconnecté du dashboard');
            });
        });
        
        // Envoyer les stats toutes les 5 secondes
        setInterval(() => {
            this.io.emit('stats', this.getBotStats());
        }, 5000);
    }
    
    getBotStats() {
        const memUsage = process.memoryUsage();
        
        return {
            uptime: process.uptime(),
            cpu: process.cpuUsage().user / 1000000, // Convertir en secondes
            ram: memUsage.heapUsed,
            servers: this.client.guilds.cache.size,
            users: this.client.users.cache.size,
            channels: this.client.channels.cache.size,
            commands: 0, // À implémenter selon votre système de commandes
            t: Date.now()
        };
    }
    
    start(port = 3001) {
        this.server.listen(port, () => {
            console.log(`🌐 Dashboard API démarré sur le port ${port}`);
            console.log(`📊 Interface: http://localhost:${port}`);
            console.log(`🔗 Frontend: http://localhost:5173`);
        });
    }
}

export default DashboardAPI;