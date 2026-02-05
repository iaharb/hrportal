
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './components/Dashboard.tsx';
import EmployeeDirectory from './components/EmployeeDirectory.tsx';
import AiInsights from './components/AiInsights.tsx';
import ComplianceView from './components/ComplianceView.tsx';
import ProfileView from './components/ProfileView.tsx';
import LeaveManagement from './components/LeaveManagement.tsx';
import PayrollView from './components/PayrollView.tsx';
import SettlementView from './components/SettlementView.tsx';
import AttendanceView from './components/AttendanceView.tsx';
import AdminCenter from './components/AdminCenter.tsx';
import AddEmployeeModal from './components/AddEmployeeModal.tsx';
import Login from './components/Login.tsx';
import { View, User, Notification } from './types.ts';
import { dbService } from './services/dbService.ts';
import { translations } from './translations.ts';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setView] = useState<View>(View.Dashboard);
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const t = translations[language];

  // Logic to resolve CamelCase translation key from kebab-case View enum
  const getViewTitle = (view: string) => {
    const key = view.includes('-') 
      ? view.split('-').map((s, i) => i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)).join('')
      : view;
    return (t as any)[key] || view;
  };

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'Employee') {
        setView(View.Profile);
      } else {
        setView(View.Dashboard);
      }
      fetchNotifications();
    }
  }, [currentUser]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    if (currentUser) {
      try {
        const data = await dbService.getNotifications(currentUser.id);
        setNotifications(data);
      } catch (e) {
        console.error("Notif fetch failed", e);
      }
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    fetchNotifications();
  };

  const renderView = () => {
    if (!currentUser) return null;

    switch (currentView) {
      case View.Dashboard:
        return <Dashboard user={currentUser} onNavigate={setView} key={`dash-${refreshKey}`} />;
      case View.Directory:
        return <EmployeeDirectory user={currentUser} onAddClick={() => setIsModalOpen(true)} key={`dir-${refreshKey}`} language={language} />;
      case View.Insights:
        return <AiInsights key={`ai-${refreshKey}`} />;
      case View.Compliance:
        return <ComplianceView key={`comp-${refreshKey}`} />;
      case View.Profile:
        return <ProfileView user={currentUser} key={`profile-${refreshKey}`} />;
      case View.Leaves:
        return <LeaveManagement user={currentUser} key={`leaves-${refreshKey}`} />;
      case View.Payroll:
        return <PayrollView user={currentUser} key={`pay-${refreshKey}`} />;
      case View.Settlement:
        return <SettlementView key={`settle-${refreshKey}`} />;
      case View.Attendance:
        return <AttendanceView user={currentUser} key={`attend-${refreshKey}`} />;
      case View.AdminCenter:
        return <AdminCenter key={`admin-${refreshKey}`} />;
      default:
        return <Dashboard user={currentUser} onNavigate={setView} />;
    }
  };

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} language={language} />;
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div 
      className={`flex min-h-screen bg-[#F8FAFC] selection:bg-emerald-100 font-sans`}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <Sidebar 
        currentView={currentView} 
        setView={setView} 
        user={currentUser} 
        language={language}
        setLanguage={setLanguage}
        onLogout={() => setCurrentUser(null)}
      />
      
      <main className="flex-1 min-w-0">
        <div className="h-full px-12 py-10 max-w-[1600px] mx-auto">
          <div className="flex items-center justify-between mb-16">
            <div className="space-y-1">
              <nav className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">
                <span className="hover:text-emerald-600 transition-colors cursor-pointer" onClick={() => setView(View.Dashboard)}>{t.enterprise}</span>
                <span className="text-slate-200">/</span>
                <span className="text-emerald-600">{getViewTitle(currentView)}</span>
              </nav>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                {getViewTitle(currentView)}
              </h1>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="relative" ref={notificationRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`w-14 h-14 rounded-3xl flex items-center justify-center border transition-all active:scale-95 ${
                    showNotifications ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-400 border-slate-200 hover:border-emerald-500/30 shadow-sm'
                  }`}
                >
                  <span className="text-2xl">🔔</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 text-white text-[11px] font-black rounded-full border-4 border-[#F8FAFC] flex items-center justify-center animate-bounce">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>

              <div className="bg-white px-6 py-3 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 h-14">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">
                  {currentUser.role === 'Admin' ? 'Global Controller' : `${currentUser.department} Scope`}
                </span>
              </div>
            </div>
          </div>

          <div className="pb-32">
            {renderView()}
          </div>
        </div>
      </main>

      {(currentUser.role === 'Admin' || currentUser.role === 'Manager') && (
        <div className={`fixed bottom-12 z-50 ${language === 'ar' ? 'left-12' : 'right-12'}`}>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-900 text-white px-10 py-5 rounded-[32px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] hover:bg-black hover:scale-105 transition-all flex items-center justify-center gap-4 active:scale-95 group overflow-hidden relative"
          >
            <span className="font-black text-[12px] uppercase tracking-widest relative z-10">{t.addMember}</span>
            <span className="text-3xl font-light relative z-10 transition-transform group-hover:rotate-90">+</span>
          </button>
        </div>
      )}

      <AddEmployeeModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        language={language}
        onSuccess={handleRefresh}
      />
    </div>
  );
};

export default App;
