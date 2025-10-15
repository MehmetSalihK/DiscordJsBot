import { Cpu, HardDrive, Users, Clock, Server, Activity } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { formatUptime } from '@/lib/utils';

type DashboardStats = {
  cpu: {
    usage: number;
    cores: number;
    load: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
  };
  uptime: number;
  servers: number;
  users: number;
};

export function DashboardPage() {
  // Données factices - à remplacer par des appels API réels
  const stats: DashboardStats = {
    cpu: {
      usage: 24.5,
      cores: 8,
      load: [0.5, 0.7, 0.6],
    },
    memory: {
      total: 16 * 1024, // 16GB en MB
      used: 8.2 * 1024,
      free: 7.8 * 1024,
    },
    uptime: 123456, // secondes
    servers: 5,
    users: 1250,
  };

  const memoryUsage = (stats.memory.used / stats.memory.total) * 100;
  const memoryTrend: 'up' | 'down' | 'neutral' = memoryUsage > 80 ? 'up' : memoryUsage > 50 ? 'neutral' : 'down';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Aperçu des performances et des statistiques de votre serveur
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Utilisation CPU"
          value={`${stats.cpu.usage.toFixed(1)}%`}
          description={`${stats.cpu.cores} cœurs`}
          icon={<Cpu className="h-5 w-5" />}
          trend={stats.cpu.usage > 80 ? 'up' : stats.cpu.usage > 50 ? 'neutral' : 'down'}
          trendValue="2.5% vs hier"
        />
        <StatCard
          title="Utilisation mémoire"
          value={`${memoryUsage.toFixed(1)}%`}
          description={`${(stats.memory.used / 1024).toFixed(1)} GB / ${(stats.memory.total / 1024).toFixed(1)} GB`}
          icon={<HardDrive className="h-5 w-5" />}
          trend={memoryTrend}
          trendValue={memoryTrend === 'up' ? '3.2%' : memoryTrend === 'down' ? '1.5%' : '0%'}
        />
        <StatCard
          title="Membres"
          value={stats.users.toLocaleString()}
          description="Utilisateurs actifs"
          icon={<Users className="h-5 w-5" />}
          trend="up"
          trendValue="5.8%"
        />
        <StatCard
          title="Temps de fonctionnement"
          value={formatUptime(stats.uptime)}
          description="Dernier redémarrage"
          icon={<Clock className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Activité récente</h2>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-4 space-y-4">
            {[
              { id: 1, text: 'Nouveau membre rejoint', time: '2 minutes', status: 'success' },
              { id: 2, text: 'Mise à jour des paramètres', time: '10 minutes', status: 'info' },
              { id: 3, text: 'Sauvegarde effectuée', time: '1 heure', status: 'info' },
              { id: 4, text: 'Nouveau serveur connecté', time: '3 heures', status: 'success' },
            ].map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <div className="h-2 w-2 mt-2 rounded-full bg-green-500" />
                <div>
                  <p className="text-sm font-medium">{item.text}</p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Serveurs connectés</h2>
            <Server className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-4 space-y-4">
            {[
              { id: 1, name: 'Serveur Principal', status: 'en ligne', members: 1250 },
              { id: 2, name: 'Communauté', status: 'en ligne', members: 843 },
              { id: 3, name: 'Support', status: 'hors ligne', members: 0 },
            ].map((server) => (
              <div key={server.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <div>
                    <p className="text-sm font-medium">{server.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {server.status} • {server.members} membres
                    </p>
                  </div>
                </div>
                <button className="text-sm text-primary hover:underline">
                  Voir
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
