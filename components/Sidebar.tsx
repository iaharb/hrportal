
import React from 'react';
import { View, User } from '../types.ts';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
  user: User;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, user, onLogout }) => {
  const allItems = [
    { id: View.Dashboard, label: 'Dashboard', icon: '📊', roles: ['Admin', 'Manager', 'HR'] },
    { id: View.Profile, label: 'My Workspace', icon: '👤', roles: ['Employee', 'Manager', 'Admin', 'HR'] },
    { id: View.Attendance, label: 'Geo Attendance', icon: '📍', roles: ['Employee', 'Manager', 'Admin', 'HR'] },
    { id: View.Leaves, label: 'Leave Hub', icon: '📅', roles: ['Admin', 'Manager', 'Employee', 'HR'] },
    { id: View.Directory, label: 'Employee Directory', icon: '👥', roles: ['Admin', 'Manager', 'HR'] },
    { id: View.Payroll, label: 'Payroll Processing', icon: '💰', roles: ['Admin', 'HR'] },
    { id: View.Settlement, label: 'Final Settlement', icon: '📜', roles: ['Admin', 'HR'] },
    { id: View.Insights, label: 'AI Insights', icon: '✨', roles: ['Admin', 'Manager', 'HR'] },
    { id: View.Compliance, label: 'PAM Compliance', icon: '⚖️', roles: ['Admin', 'HR'] },
  ];

  const filteredItems = allItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="w-72 bg-white border-r border-slate-200 h-screen sticky top-0 flex flex-col">
      <div className="p-8 border-b border-slate-100">
        <h1 className="text-2xl font-black text-emerald-800 flex items-center gap-2">
          <span className="p-2 bg-emerald-50 rounded-xl">🇰🇼</span> HR Portal
        </h1>
        <p className="text-[10px] text-slate-400 font-black tracking-[0.2em] uppercase mt-2">National Talent Management</p>
      </div>
      
      <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-sm font-bold transition-all ${
              currentView === item.id
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-6 space-y-4">
        <div className="bg-slate-50 rounded-[24px] p-5">
           <div className="flex items-center gap-3 mb-3">
             <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs uppercase">
                {user.name[0]}
             </div>
             <div className="min-w-0 flex-1">
               <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
               <p className="text-[10px] text-slate-400 font-bold uppercase">{user.role}</p>
             </div>
           </div>
           <button 
             onClick={onLogout}
             className="w-full py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-500 hover:text-rose-600 hover:border-rose-100 transition-all uppercase tracking-widest"
           >
             Log Out
           </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
