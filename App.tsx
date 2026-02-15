
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
import Whitepaper from './components/Whitepaper.tsx';
import MandoobDashboard from './components/MandoobDashboard.tsx';
import EmployeeModal from './components/AddEmployeeModal.tsx';
import IntelligentTicker from './components/IntelligentTicker.tsx';
import Login from './components/Login.tsx';
import MobileApp from './mobile/App.tsx';
import MobileLogin from './mobile/Login.tsx';
import { View, User, Notification, Employee } from './types.ts';
import { dbService } from './services/dbService.ts';
import { useTranslation } from 'react-i18next';

const ScopeDirectoryModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  user: User; 
  language: string; 
}> = ({ isOpen, onClose, user, language }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const isAr = language === 'ar';

  useEffect(() => {
    if (isOpen) {
      dbService.getEmployees().then(data => {
        if (user.role === 'Admin') {
          setEmployees(data);
        } else {
          // Rule: Departments scopes include their members + always the CEO for oversight
          setEmployees(data.filter(e => {
             const isCEO = e.position.toLowerCase().includes('ceo');
             const isInDept = e.department === user.department;
             return isCEO || isInDept;
          }));
        }
      });
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="bg-white rounded-[40px] w-full max-w-lg shadow-2xl relative z-10 overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center text-start">
           <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{isAr ? 'هيكل النطاق الوظيفي' : 'Scope Directory Structure'}</h3>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">Registry Context: {user.department || 'Global'}</p>
           </div>
           <button onClick={onClose} className="text-slate-400 font-bold text-2xl hover:text-slate-600 transition-colors">×</button>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
           {employees.sort((a,b) => {
             const pA = a.position.toLowerCase();
             const pB = b.position.toLowerCase();
             if (pA.includes('ceo')) return -1;
             if (pB.includes('ceo')) return 1;
             return 0;
           }).map((emp) => (
             <div key={emp.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:border-indigo-200 transition-all text-start">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs relative">
                   {emp.faceToken ? <img src={emp.faceToken} className="w-full h-full object-cover rounded-xl grayscale" /> : emp.name[0]}
                   {emp.position.toLowerCase().includes('ceo') && (
                     <div className="absolute -top-1 -right-1 text-[8px]">👑</div>
                   )}
                </div>
                <div>
                   <p className="text-sm font-black text-slate-800 leading-none">{isAr && emp.nameArabic ? emp.nameArabic : emp.name}</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase mt-1.5">
                     {isAr && emp.positionArabic ? emp.positionArabic : emp.position}
                     <span className="ms-2 opacity-40">•</span>
                     <span className="ms-2">{isAr && emp.departmentArabic ? emp.departmentArabic : emp.department}</span>
                   </p>
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setView] = useState<View>(View.Dashboard);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScopeModalOpen, setIsScopeModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>(window.innerWidth < 1024 ? 'mobile' : 'desktop');
  const notificationRef = useRef<HTMLDivElement>(null);

  const language = i18n.language as 'en' | 'ar';

  const setLanguage = (lang: 'en' | 'ar') => {
    i18n.changeLanguage(lang);
  };

  const getViewTitle = (view: View) => {
    switch (view) {
      case View.Dashboard: return t('dashboard');
      case View.Directory: return t('directory');
      case View.Insights: return t('insights');
      case View.Compliance: return t('compliance');
      case View.Profile: return t('profile');
      case View.Leaves: return t('leaves');
      case View.Payroll: return t('payroll');
      case View.Settlement: return t('settlement');
      case View.Attendance: return t('attendance');
      case View.AdminCenter: return t('adminCenter');
      case View.Whitepaper: return t('whitepaper');
      case View.Mandoob: return language === 'ar' ? 'أعمال المندوب' : 'Mandoob Dashboard';
      default: return '';
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && viewMode === 'desktop') {
        setViewMode('mobile');
      } else if (window.innerWidth >= 1024 && viewMode === 'mobile' && !localStorage.getItem('force_mobile')) {
        setViewMode('desktop');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

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

  const handleEditEmployee = (emp: Employee) => {
    setEmployeeToEdit(emp);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEmployeeToEdit(null);
  };

  const toggleViewMode = () => {
    const nextMode = viewMode === 'desktop' ? 'mobile' : 'desktop';
    setViewMode(nextMode);
    if (nextMode === 'mobile') {
      localStorage.setItem('force_mobile', 'true');
    } else {
      localStorage.removeItem('force_mobile');
    }
  };

  if (viewMode === 'mobile') {
    if (!currentUser) {
      return (
        <MobileLogin 
          onLogin={setCurrentUser} 
          language={language} 
          setLanguage={setLanguage} 
          onSwitchToDesktop={() => {
            localStorage.removeItem('force_mobile');
            setViewMode('desktop');
          }}
        />
      );
    }
    return (
      <MobileApp 
        user={currentUser} 
        language={language} 
        setLanguage={setLanguage} 
        onLogout={() => setCurrentUser(null)}
        onSwitchToDesktop={() => {
          localStorage.removeItem('force_mobile');
          setViewMode('desktop');
        }}
      />
    );
  }

  if (!currentUser) {
    return (
      <div className="relative min-h-screen" dir={language === 'ar' ? 'rtl' : 'ltr'}>
         <Login onLogin={setCurrentUser} language={language} />
         <button 
           onClick={() => setViewMode('mobile')}
           className={`fixed top-6 ${language === 'ar' ? 'left-6' : 'right-6'} z-[100] bg-slate-900/90 backdrop-blur-md text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-xl border border-white/10`}
         >
           📱 {language === 'ar' ? 'خدمة الهاتف' : 'Mobile ESS'}
         </button>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case View.Dashboard:
        return <Dashboard user={currentUser} onNavigate={setView} key={`dash-${refreshKey}`} language={language} />;
      case View.Directory:
        return <EmployeeDirectory user={currentUser} onAddClick={() => setIsModalOpen(true)} onEditClick={handleEditEmployee} key={`dir-${refreshKey}`} language={language} />;
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
      case View.Whitepaper:
        return <Whitepaper key={`wp-${refreshKey}`} />;
      case View.Mandoob:
        return <MandoobDashboard key={`mandoob-${refreshKey}`} />;
      default:
        return <Dashboard user={currentUser} onNavigate={setView} language={language} />;
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div 
      className={`flex min-h-screen bg-[#F8FAFC] selection:bg-indigo-100 font-sans animate-in fade-in duration-500`}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <Sidebar 
        currentView={currentView} 
        setView={setView} 
        user={currentUser} 
        language={language}
        setLanguage={setLanguage}
        onLogout={() => setCurrentUser(null)}
        onToggleMobile={toggleViewMode}
        onAddMember={() => { setEmployeeToEdit(null); setIsModalOpen(true); }}
      />
      
      <main className="flex-1 min-w-0">
        <div className="h-full px-12 py-8 max-w-[1500px] mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span className="hover:text-indigo-600 transition-colors cursor-pointer" onClick={() => setView(View.Dashboard)}>{t('enterprise')}</span>
                <span className="text-slate-300">/</span>
                <span className="text-indigo-600">{getViewTitle(currentView)}</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {getViewTitle(currentView)}
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative" ref={notificationRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all active:scale-95 ${
                    showNotifications ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <span className="text-xl">🔔</span>
                  {unreadCount > 0 && (
                    <span className={`absolute -top-1 ${language === 'ar' ? '-left-1' : '-right-1'} w-5 h-5 bg-rose-500 text-white text-[9px] font-black rounded-full border-2 border-[#F8FAFC] flex items-center justify-center`}>
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>

              <button 
                onClick={() => setIsScopeModalOpen(true)}
                className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 h-11 hover:bg-slate-50 transition-all group"
              >
                <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.3)] animate-pulse group-hover:scale-125 transition-transform"></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  {currentUser.role === 'Admin' ? 'Global Admin' : `${currentUser.department} Scope`}
                </span>
              </button>
            </div>
          </div>

          <IntelligentTicker />

          <div className="pb-24">
            {renderView()}
          </div>
        </div>
      </main>

      <EmployeeModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        language={language}
        onSuccess={handleRefresh}
        employeeToEdit={employeeToEdit}
      />

      <ScopeDirectoryModal
        isOpen={isScopeModalOpen}
        onClose={() => setIsScopeModalOpen(false)}
        user={currentUser}
        language={language}
      />
    </div>
  );
};

export default App;
