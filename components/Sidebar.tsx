import React, { useState } from 'react';
import { View, User } from '../types';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
  user: User;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, user, onLogout }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const allItems = [
    { id: View.Dashboard, label: 'Dashboard', icon: '📊', roles: ['Admin', 'Manager'] },
    { id: View.Profile, label: 'Workspace', icon: '👤', roles: ['Employee'] },
    { id: View.Leaves, label: 'Leaves', icon: '📅', roles: ['Admin', 'Manager', 'Employee'] },
    { id: View.Directory, label: 'Directory', icon: '👥', roles: ['Admin', 'Manager'] },
    { id: View.Insights, label: 'AI Strategy', icon: '✨', roles: ['Admin', 'Manager'] },
    { id: View.Compliance, label: 'Compliance', icon: '⚖️', roles: ['Admin'] },
  ];

  const filteredItems = allItems.filter(item => item.roles.includes(user.role));

  return (
    <div 
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className={`h-screen sticky top-0 bg-white border-r border-slate-100 flex flex-col transition-all duration-300 z-50 ${isExpanded ? 'w-64 shadow-2xl' : 'w-20'}`}
    >
      <div className="p-5 h-20 flex items-center overflow-hidden">
        <div className="min-w-[40px] h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
          <span className="text-xl">🇰🇼</span>
        </div>
        <div className={`ml-4 whitespace-nowrap transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
          <h1 className="text-lg font-black text-slate-900 tracking-tighter">HR PORTAL</h1>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Kuwaitization MS</p>
        </div>
      </div>
      
      <nav className="flex-1 px-3 space-y-1 mt-6">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center h-12 rounded-xl transition-all group relative ${
              currentView === item.id
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="min-w-[56px] flex items-center justify-center text-xl">
              {item.icon}
              {currentView === item.id && !isExpanded && (
                <div className="absolute left-0 w-1 h-6 bg-emerald-600 rounded-r-full"></div>
              )}
            </div>
            <span className={`whitespace-nowrap font-bold text-sm transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      <div className="p-3 mt-auto">
        <div className={`flex items-center rounded-2xl bg-slate-50 p-2 transition-all overflow-hidden ${isExpanded ? 'px-3' : 'px-1'}`}>
          <div className="min-w-[40px] h-10 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center font-black text-xs shadow-sm">
             {user.name[0]}
          </div>
          <div className={`ml-3 flex-1 min-w-0 transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-[10px] font-black text-slate-900 truncate uppercase">{user.name}</p>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{user.role}</p>
          </div>
          {isExpanded && (
            <button 
              onClick={onLogout}
              className="ml-2 p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
              title="Logout"
            >
              🚪
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;