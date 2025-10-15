import { FiBell, FiSearch, FiMenu } from 'react-icons/fi';
import { motion } from 'framer-motion';

const Header = ({ toggleSidebar }: { toggleSidebar: () => void }) => {
  return (
    <header className="fixed top-0 right-0 left-64 bg-white shadow-sm z-40">
      <div className="flex items-center justify-between px-6 h-16">
        <div className="flex items-center">
          <button 
            onClick={toggleSidebar}
            className="md:hidden text-gray-500 hover:text-gray-700 mr-4"
          >
            <FiMenu size={24} />
          </button>
          
          <div className="relative max-w-md w-full hidden md:block">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="p-1 rounded-full text-gray-500 hover:text-gray-700 focus:outline-none">
            <span className="sr-only">Notifications</span>
            <div className="relative">
              <FiBell size={20} />
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
            </div>
          </button>
          
          <div className="ml-3 relative">
            <div className="flex items-center space-x-2 cursor-pointer">
              <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-medium">
                {me?.username?.charAt(0) || 'U'}
              </div>
              <span className="hidden md:block text-sm font-medium text-gray-700">
                {me?.username || 'Utilisateur'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
