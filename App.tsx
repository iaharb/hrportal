
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import EmployeeDirectory from './components/EmployeeDirectory';
import AiInsights from './components/AiInsights';
import ComplianceView from './components/ComplianceView';
import ProfileView from './components/ProfileView';
import LeaveManagement from './components/LeaveManagement';
import AddEmployeeModal from './components/AddEmployeeModal';
import Login from './components/Login';
import { View, User, Notification } from './types';
import { dbService } from './services/dbService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setView] = useState<View>(View.Dashboard);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Set default view based on role after login
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
      case View.Dashboard:
        return <Dashboard user={currentUser} key={`dash-${refreshKey}`} />;
      case View.Leaves:
        return <LeaveManagement user={currentUser} key={`leaves-${refreshKey}`} />;
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
          {/* Top Bar */}
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
                 currentView.replace('-', ' ')}
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Notification Center */}
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

                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                    <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-[32px] shadow-2xl z-50 overflow-hidden animate-in zoom-in-95 slide-in-from-top-2 origin-top-right">
                      <div className="p-5 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                        <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Alerts Center</p>
                        <button onClick={() => setNotifications([])} className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors">Clear All</button>
                      </div>
                      <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
                        {notifications.length > 0 ? (
                          notifications.map((notif) => (
                            <div key={notif.id} className="p-4 hover:bg-slate-50 transition-colors group">
                               <div className="flex gap-3">
                                 <span className="text-lg">
                                   {notif.category === 'leave_start' ? '📅' : '🔙'}
                                 </span>
                                 <div>
                                   <p className="text-xs font-bold text-slate-800">{notif.title}</p>
                                   <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{notif.message}</p>
                                 </div>
                               </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-10 text-center">
                             <p className="text-2xl mb-2 opacity-20">🎉</p>
                             <p className="text-[10px] font-black text-slate-400 uppercase">All caught up!</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
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

      {/* Database Interaction Trigger - Only for Admin/Manager */}
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
