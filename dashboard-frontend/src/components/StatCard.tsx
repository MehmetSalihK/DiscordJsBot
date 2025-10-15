import { motion } from 'framer-motion';

const StatCard = ({ title, value, icon, color, trend, trendValue }: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}) => {
  const trendColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    neutral: 'text-gray-500'
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→'
  };

  return (
    <motion.div 
      className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
      whileHover={{ y: -2 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">
            {value}
          </p>
          {trend && (
            <div className={`mt-2 flex items-center text-sm ${trendColors[trend] || 'text-gray-500'}`}>
              <span className="font-medium">{trendIcons[trend]} {trendValue}</span>
              <span className="ml-1 text-xs">vs hier</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
};

export default StatCard;
