
import React, { useState, useEffect } from 'react';
import { View, User } from '../types.ts';
import { dbService } from '../services/dbService.ts';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
  user: User;
  language: 'en' | 'ar';
  setLanguage: (lang: 'en' | 'ar') => void;
  onLogout: () => void;
  onToggleMobile?: () => void;
  onAddMember: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, user, language, setLanguage, onLogout, onToggleMobile, onAddMember }) => {
  const { t } = useTranslation();
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
    const interval = setInterval(checkConnection, 120000);
    return () => clearInterval(interval);
  }, []);
  
  const allItems = [
    { id: View.Dashboard, label: t('dashboard'), icon: 'layout-grid', roles: ['Admin', 'Manager', 'HR', 'Mandoob'] },
    { id: View.AdminCenter, label: t('adminCenter'), icon: 'shield', roles: ['Admin', 'HR'] },
    { id: View.Mandoob, label: language === 'ar' ? 'أعمال المندوب' : 'Mandoob PRO', icon: 'passport', roles: ['Admin', 'HR', 'Mandoob'] },
    { id: View.Profile, label: t('profile'), icon: 'user', roles: ['Employee', 'Manager', 'Admin', 'HR'] },
    { id: View.Attendance, label: t('attendance'), icon: 'map-pin', roles: ['Employee', 'Manager', 'Admin', 'HR'] },
    { id: View.Leaves, label: t('leaves'), icon: 'calendar', roles: ['Admin', 'Manager', 'Employee', 'HR'] },
    { id: View.Directory, label: t('directory'), icon: 'users', roles: ['Admin', 'Manager', 'HR'] },
    { id: View.Payroll, label: t('payroll'), icon: 'banknote', roles: ['Admin', 'HR'] },
    { id: View.Settlement, label: t('settlement'), icon: 'file-text', roles: ['Admin', 'HR'] },
    { id: View.Insights, label: t('insights'), icon: 'sparkles', roles: ['Admin', 'Manager', 'HR'] },
    { id: View.Compliance, label: t('compliance'), icon: 'scale', roles: ['Admin', 'HR'] },
    { id: View.Whitepaper, label: t('whitepaper'), icon: 'book-open', roles: ['Admin', 'HR'] },
  ];

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'layout-grid': return '📊';
      case 'shield': return '🛡️';
      case 'passport': return '🛂';
      case 'user': return '👤';
      case 'map-pin': return '📍';
      case 'calendar': return '📅';
      case 'users': return '👥';
      case 'banknote': return '💰';
      case 'file-text': return '📜';
      case 'sparkles': return '✨';
      case 'scale': return '⚖️';
      case 'book-open': return '📑';
      default: return '•';
    }
  };

  const filteredItems = allItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="w-72 bg-white border-e border-slate-200/60 h-screen sticky top-0 flex flex-col z-[80] shadow-[1px_0_0_0_rgba(0,0,0,0.02)]">
      <div className="p-8 pb-4 text-start">
        <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-3 tracking-tight">
          <span className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 text-lg">🇰🇼</span> 
          <span>Enterprise <span className="text-indigo-600">HR</span></span>
        </h1>
        
        <div 
          onClick={checkConnection}
          className="inline-flex items-center gap-2 mt-6 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
        >
          <div className={`w-2 h-2 rounded-full ${
            dbStatus.type === 'testing' ? 'bg-slate-300 animate-pulse' : 
            dbStatus.type === 'live' ? 'bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.4)]' : 'bg-rose-500'
          }`}></div>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            {dbStatus.type === 'testing' ? t('syncing') : 
             dbStatus.type === 'live' ? `${dbStatus.latency}ms Latency` : 'Offline'}
          </span>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto mt-6">
        {(user.role === 'Admin' || user.role === 'HR') && (
          <button
            onClick={onAddMember}
            className="w-full flex items-center gap-3.5 px-4 py-4 rounded-2xl text-sm font-black transition-all bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 mb-6 hover:bg-indigo-700 active:scale-95 group border border-indigo-500"
          >
            <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center transition-transform group-hover:rotate-90">
              <span className="text-white font-black text-lg">+</span>
            </div>
            <span className="tracking-tight uppercase text-[11px] font-extrabold">{t('addMember')}</span>
          </button>
        )}

        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all group ${
              currentView === item.id
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className={`text-lg transition-transform group-hover:scale-110 ${currentView === item.id ? '' : 'opacity-70'}`}>
              {getIcon(item.icon)}
            </span>
            <span className="tracking-tight text-start flex-1">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 space-y-3 mt-auto mb-4">
        {onToggleMobile && (
          <button 
            onClick={onToggleMobile}
            className="w-full py-3 bg-indigo-50 text-indigo-600 rounded-xl text-[11px] font-bold hover:bg-indigo-100 transition-all uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <span>📱</span> {t('switchToMobile')}
          </button>
        )}

        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setLanguage('en')}
            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${language === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
          >
            EN
          </button>
          <button 
            onClick={() => setLanguage('ar')}
            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${language === 'ar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
          >
            AR
          </button>
        </div>

        <div className="pt-4 border-t border-slate-100">
           <div className="flex items-center gap-3 mb-4 px-2 text-start">
             <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                {user.name[0]}
             </div>
             <div className="min-w-0 flex-1">
               <p className="text-xs font-bold text-slate-900 truncate leading-none">{language === 'ar' ? (user as any).nameArabic || user.name : user.name}</p>
               <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">{user.role}</p>
             </div>
           </div>
           <button 
             onClick={onLogout}
             className="w-full py-2.5 text-[11px] font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all uppercase tracking-wider"
           >
             {t('terminateSession')}
           </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
