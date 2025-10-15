import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { 
  Home as HomeIcon, 
  Server as ServerIcon, 
  Settings as SettingsIcon, 
  BarChart2 as BarChartIcon, 
  Shield as ShieldIcon, 
  Users as UsersIcon, 
  MessageSquare as MessageSquareIcon,
  User as UserIcon
} from 'lucide-react';

interface User {
  username: string;
  role?: string;
}

interface SidebarProps {
  user?: User;
}

const Sidebar = ({ user }: SidebarProps) => {
  const navItems = [
    { name: 'Tableau de bord', icon: <HomeIcon size={18} />, path: '/' },
    { name: 'Serveurs', icon: <ServerIcon size={18} />, path: '/servers' },
    { name: 'Statistiques', icon: <BarChartIcon size={18} />, path: '/stats' },
    { name: 'Modération', icon: <ShieldIcon size={18} />, path: '/moderation' },
    { name: 'Membres', icon: <UsersIcon size={18} />, path: '/members' },
    { name: 'Logs', icon: <MessageSquareIcon size={18} />, path: '/logs' },
    { name: 'Paramètres', icon: <SettingsIcon size={18} />, path: '/settings' },
  ];

  return (
    <motion.div
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white shadow-lg z-50"
    >
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
          Dashboard
        </h1>
      </div>

      <nav className="mt-8">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-6 py-3 text-gray-300 hover:bg-gray-800 transition-colors ${isActive ? 'bg-gray-800 border-l-4 border-purple-500' : ''}`
            }
          >
            <span className="mr-3">{item.icon}</span>
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="absolute bottom-0 w-full p-4 bg-gray-800">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
            {user?.username?.charAt(0).toUpperCase() || <UserIcon size={20} />}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-white">{user?.username || 'Utilisateur'}</p>
            <p className="text-xs text-gray-400">{user?.role || 'Utilisateur'}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Sidebar;
