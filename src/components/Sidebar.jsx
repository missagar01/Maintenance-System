import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Wrench, 
  ClipboardList, 
  BarChart3,
  LogOut,
  X,
  User,
  Key,
  Bell
} from 'lucide-react';
import useAuthStore from '../store/authStore';

const Sidebar = ({ onClose }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
console.log("User Page Access:", user.page);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Define all possible menu items
  const allMenuItems = [
  { 
    path: "/dashboard", 
    icon: LayoutDashboard, 
    label: "Dashboard"
  },
  { 
    path: "/machines", 
    icon: Wrench, 
    label: "Machines"
  },
  { 
    path: "/assign-task", 
    icon: ClipboardList, 
    label: "Assign Task"
  },
  { 
    path: "/tasks", 
    icon: ClipboardList, 
    label: "Tasks"
  },
  { 
    path: "/reports", 
    icon: BarChart3, 
    label: "Reports"
  },
  { 
    path: "/license", 
    icon: Key, 
    label: "License"
  },
  { 
    path: "/store-in", 
    icon: BarChart3, 
    label: "Store In" // Also in one user's page access
  },
];


  // Get allowed pages from user.page (column D)
  const allowedPages = user?.page ? user.page.split(',').map(page => page.trim()) : [];

  // Filter menu items based on:
  // 1. User's role (if requiredRole is specified)
  // 2. Page access from column D (if specified)
  const filteredMenuItems = allMenuItems.filter(item => {
    // Always show Dashboard
    
    
    // Check if page is in allowedPages (from column D)
    const pageAllowed = allowedPages.length === 0 || allowedPages.includes(item.label);
    
    // Check role requirement if specified
    const roleAllowed = !item.requiredRole || user?.role === item.requiredRole;
    
    return pageAllowed && roleAllowed;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-5 border-b border-indigo-800">
        <h1 className="text-xl font-bold flex items-center gap-2 text-white">
          <Wrench size={24} />
          <span>MaintenancePro</span>
        </h1>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md text-indigo-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
          >
            <span className="sr-only">Close sidebar</span>
            <X className="h-6 w-6" />
          </button>
        )}
      </div>
      
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {filteredMenuItems.map((item) => (
          <NavLink 
            key={item.path}
            to={item.path} 
            className={({ isActive }) => 
              `flex items-center py-2.5 px-4 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-indigo-800 text-white' 
                  : 'text-indigo-100 hover:bg-indigo-800 hover:text-white'
              }`
            }
            onClick={onClose}
          >
            <item.icon className="mr-3" size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-indigo-800">
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex items-center space-x-2 cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center">
              <User size={20} className="text-indigo-600" />
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-white">{user?.id || 'Guest'}</p>
              <p className="text-xs text-white">{user?.role === 'admin' ? 'Administrator' : 'Maintenance Team'}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            handleLogout();
            onClose?.();
          }}
          className="flex items-center py-2.5 px-4 rounded-lg text-indigo-100 hover:bg-indigo-800 hover:text-white cursor-pointer transition-colors w-full"
        >
          <LogOut className="mr-3" size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;