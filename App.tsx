
import React, { useState, useEffect } from 'react';
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
import AddEmployeeModal from './components/AddEmployeeModal.tsx';
import Login from './components/Login.tsx';
import { View, User, Notification } from './types.ts';
import { dbService } from './services/dbService.ts';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setView] = useState<View>(View.Dashboard);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

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
      const data = await dbService.getNotifications(currentUser.id);
      setNotifications(data);
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
        return <Dashboard user={currentUser} key={`dash-${refreshKey}`} />;
      case View.Directory:
        return <EmployeeDirectory user={currentUser} onAddClick={() => setIsModalOpen(true)} key={`dir-${refreshKey}`} />;
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
      default:
        return <Dashboard user={currentUser} />;
    }
  };

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="flex min-h-screen bg-slate-50 selection:bg-emerald-100">
      <Sidebar 
        currentView={currentView} 
        setView={setView} 
        user={currentUser} 
        onLogout={() => setCurrentUser(null)}
      />
      
      <main className="flex-1 min-w-0">
        <div className="h-full p-10 max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div>
              <nav className="flex items-center gap-3 text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
                <span>System</span>
                <span className="text-slate-300">/</span>
                <span className="text-emerald-600">{currentView}</span>
              </nav>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                {currentView === View.Dashboard ? (currentUser.role === 'Manager' ? 'Department Hub' : 'Kuwaitization Dashboard') : 
                 currentView === View.Profile ? 'Personal Workspace' :
                 currentView === View.Leaves ? 'Leave Hub' :
                 currentView === View.Payroll ? 'Financial Center' :
                 currentView === View.Settlement ? 'Termination & Settlement' :
                 currentView === View.Attendance ? 'Geofenced Presence' :
                 currentView.replace('-', ' ')}
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all relative ${
                    showNotifications ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-200'
                  }`}
                >
                  <span className="text-xl">🔔</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>

              <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 h-12">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-bold text-slate-600">
                  {currentUser.role === 'Admin' ? 'Global Admin Mode' : `${currentUser.department} Scope`}
                </span>
              </div>
            </div>
          </div>

          <div className="pb-24">
            {renderView()}
          </div>
        </div>
      </main>

      {(currentUser.role === 'Admin' || currentUser.role === 'Manager') && (
        <div className="fixed bottom-10 right-10 z-50">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 text-white w-14 h-14 md:w-auto md:px-6 md:py-4 rounded-[24px] shadow-2xl shadow-emerald-600/30 hover:bg-emerald-700 hover:scale-105 transition-all flex items-center justify-center gap-3 active:scale-95 group"
          >
            <span className="font-bold text-sm hidden md:inline">Hire National Talent</span>
            <span className="text-2xl font-light">+</span>
          </button>
        </div>
      )}

      <AddEmployeeModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={handleRefresh}
      />
    </div>
  );
};

export default App;
