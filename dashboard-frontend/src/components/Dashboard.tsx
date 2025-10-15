import { FiCpu, FiServer, FiUsers, FiClock, FiActivity } from 'react-icons/fi';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip } from 'recharts';
import StatCard from './StatCard';

type Stats = { 
  ram: number; 
  cpu: number; 
  uptime: number; 
  servers: number; 
  users: number 
};

const formatUptime = (seconds: number) => {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
};

const Dashboard = ({ 
  stats, 
  statsHistory 
}: { 
  stats: Stats | null; 
  statsHistory: Array<{ t: number; cpu: number; ram: number; servers: number; users: number }> 
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Utilisation CPU" 
          value={`${stats?.cpu?.toFixed(1) || '0'}%`} 
          icon={<FiCpu className="w-6 h-6 text-indigo-500" />}
          color="bg-indigo-500"
          trend="up"
          trendValue="2.5%"
        />
        <StatCard 
          title="Utilisation RAM" 
          value={`${(stats?.ram || 0).toFixed(1)} MB`} 
          icon={<FiServer className="w-6 h-6 text-blue-500" />}
          color="bg-blue-500"
          trend="down"
          trendValue="1.2%"
        />
        <StatCard 
          title="Membres" 
          value={stats?.users?.toLocaleString() || '0'} 
          icon={<FiUsers className="w-6 h-6 text-green-500" />}
          color="bg-green-500"
          trend="up"
          trendValue="5.8%"
        />
        <StatCard 
          title="Temps de fonctionnement" 
          value={stats ? formatUptime(stats.uptime) : '0s'} 
          icon={<FiClock className="w-6 h-6 text-purple-500" />}
          color="bg-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Utilisation des ressources</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={statsHistory}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="t" 
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()} 
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <RTooltip 
                  labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                  formatter={(value) => [`${value}%`, 'CPU']}
                />
                <Area 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke="#6366F1" 
                  fillOpacity={1} 
                  fill="url(#colorCpu)" 
                  name="CPU" 
                />
                <Area 
                  type="monotone" 
                  dataKey="ram" 
                  stroke="#3B82F6" 
                  fillOpacity={1} 
                  fill="url(#colorRam)" 
                  name="RAM" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Activité récente</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 mr-3">
                  <FiActivity className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">Nouveau membre rejoint</p>
                  <p className="text-sm text-gray-500">Il y a 5 minutes</p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Info
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
