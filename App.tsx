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
  const [searchQuery, setSearchQuery] = useState('');

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
      default:
        return <Dashboard user={currentUser} />;
    }
  };

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar 
        currentView={currentView} 
        setView={setView} 
        user={currentUser} 
        onLogout={() => setCurrentUser(null)}
      />
      
      <main className="flex-1 min-w-0 h-screen overflow-y-auto relative">
        {/* Top Floating Command Palette */}
        <header className="sticky top-0 z-40 px-8 py-6 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto">
            <div className="glass px-6 py-3 rounded-2xl flex items-center gap-4 shadow-sm">
               <span className="text-slate-400">⌘</span>
               <input 
                 type="text" 
                 placeholder="Command palette..."
                 className="bg-transparent border-0 outline-none text-sm font-bold w-48 focus:w-80 transition-all text-slate-800"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && setView(View.Directory)}
               />
            </div>
          </div>
          
          <div className="flex items-center gap-4 pointer-events-auto">
             {/* Notification */}
             <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`w-12 h-12 rounded-2xl glass flex items-center justify-center transition-all ${showNotifications ? 'bg-emerald-600 text-white border-emerald-600' : 'text-slate-500 hover:text-emerald-600'}`}
                >
                  <span className="text-xl">🔔</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {showNotifications && (
                   <div className="absolute right-0 mt-4 w-80 bento-card bg-white z-50 animate-in zoom-in-95 origin-top-right">
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-50">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alerts</span>
                        <span className="text-[10px] font-bold text-emerald-600">All Captured</span>
                      </div>
                      <div className="space-y-4 max-h-60 overflow-y-auto">
                        {notifications.length > 0 ? notifications.map(n => (
                          <div key={n.id} className="text-xs">
                            <p className="font-bold text-slate-800">{n.title}</p>
                            <p className="text-slate-400 mt-1">{n.message}</p>
                          </div>
                        )) : (
                          <p className="text-xs text-slate-400 text-center py-4">System operating normally.</p>
                        )}
                      </div>
                   </div>
                )}
             </div>
             
             <div className="glass px-6 py-3 rounded-2xl flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
               <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Live: {currentUser.role} Mode</span>
             </div>
          </div>
        </header>

        <div className="px-8 pb-24">
          <div className="max-w-[1200px] mx-auto pt-4">
            {renderView()}
          </div>
        </div>
      </main>

      <AddEmployeeModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={handleRefresh}
      />
    </div>
  );
};

export default App;