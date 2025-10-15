import { startDashboardServer } from '../src/dashboard/server.js';

// Démarrage autonome du backend dashboard sans le bot Discord
const port = Number(process.env.DASHBOARD_PORT) || 3002;
const clientMock = {
  guilds: { cache: new Map() },
  users: { cache: new Map() },
};

console.log(`🚀 Lancement du backend dashboard autonome sur http://localhost:${port}`);
startDashboardServer(clientMock, port);