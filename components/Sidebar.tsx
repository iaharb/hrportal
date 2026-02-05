
import React, { useState, useEffect } from 'react';
import { View, User } from '../types.ts';
import { translations } from '../translations.ts';
import { dbService } from '../services/dbService.ts';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
  user: User;
  language: 'en' | 'ar';
  setLanguage: (lang: 'en' | 'ar') => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, user, language, setLanguage, onLogout }) => {
  const t = translations[language];
  const [dbStatus, setDbStatus] = useState<{ type: 'testing' | 'live' | 'mock', latency?: number }>({ type: 'testing' });

  const checkConnection = async () => {
    setDbStatus({ type: 'testing' });
    const test = await dbService.testConnection();
    setDbStatus({ 
      type: test.success ? 'live' : 'mock',
      latency: test.latency 
    });
  };

  useEffect(() => {
    checkConnection();
    // Auto-recheck every 2 minutes
    const interval = setInterval(checkConnection, 120000);
    return () => clearInterval(interval);
  }, []);
  
  const allItems = [
    { id: View.Dashboard, label: t.dashboard, icon: '📊', roles: ['Admin', 'Manager', 'HR'] },
    { id: View.AdminCenter, label: t.adminCenter, icon: '🛡️', roles: ['Admin', 'HR'] },
    { id: View.Profile, label: t.profile, icon: '👤', roles: ['Employee', 'Manager', 'Admin', 'HR'] },
    { id: View.Attendance, label: t.attendance, icon: '📍', roles: ['Employee', 'Manager', 'Admin', 'HR'] },
    { id: View.Leaves, label: t.leaves, icon: '📅', roles: ['Admin', 'Manager', 'Employee', 'HR'] },
    { id: View.Directory, label: t.directory, icon: '👥', roles: ['Admin', 'Manager', 'HR'] },
    { id: View.Payroll, label: t.payroll, icon: '💰', roles: ['Admin', 'HR'] },
    { id: View.Settlement, label: t.settlement, icon: '📜', roles: ['Admin', 'HR'] },
    { id: View.Insights, label: t.insights, icon: '✨', roles: ['Admin', 'Manager', 'HR'] },
    { id: View.Compliance, label: t.compliance, icon: '⚖️', roles: ['Admin', 'HR'] },
  ];

  const filteredItems = allItems.filter(item => item.roles.includes(user.role));

  return (
    <div className={`w-72 bg-white border-${language === 'ar' ? 'l' : 'r'} border-slate-200 h-screen sticky top-0 flex flex-col z-[80]`}>
      <div className="p-8 border-b border-slate-100">
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
          <span className="p-2 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20">🇰🇼</span> 
          Qubus <span className="text-emerald-600">HR</span>
        </h1>
        <button 
          onClick={checkConnection}
          className="flex items-center gap-2 mt-4 group cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className={`w-2 h-2 rounded-full ${
            dbStatus.type === 'testing' ? 'bg-slate-300 animate-pulse' : 
            dbStatus.type === 'live' ? (dbStatus.latency && dbStatus.latency > 500 ? 'bg-amber-400' : 'bg-emerald-500 animate-pulse') : 'bg-rose-500'
          }`}></div>
          <p className="text-[9px] text-slate-400 font-black tracking-[0.2em] uppercase opacity-80 flex items-center gap-2">
            {dbStatus.type === 'testing' ? 'Syncing...' : 
             dbStatus.type === 'live' ? `Registry Link: ${dbStatus.latency}ms` : 'Registry Offline'}
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">🔄</span>
          </p>
        </button>
      </div>
      
      <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-[20px] text-sm font-black transition-all group ${
              currentView === item.id
                ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10 scale-[1.02]'
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className={`text-xl transition-transform group-hover:scale-110 ${currentView === item.id ? '' : 'grayscale'}`}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-6 space-y-4">
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button 
            onClick={() => setLanguage('en')}
            className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${language === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
          >
            ENGLISH
          </button>
          <button 
            onClick={() => setLanguage('ar')}
            className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${language === 'ar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
          >
            عربي
          </button>
        </div>

        <div className="bg-slate-50 rounded-[32px] p-6 border border-slate-100">
           <div className="flex items-center gap-4 mb-5">
             <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black text-sm shadow-md">
                {user.name[0]}
             </div>
             <div className="min-w-0 flex-1">
               <p className="text-xs font-black text-slate-900 truncate tracking-tight">{user.name}</p>
               <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{user.role}</p>
             </div>
           </div>
           <button 
             onClick={onLogout}
             className="w-full py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-500 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50/50 transition-all uppercase tracking-[0.2em] shadow-sm"
           >
             {t.terminateSession}
           </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
