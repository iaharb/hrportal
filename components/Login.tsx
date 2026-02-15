
import React, { useState } from 'react';
import { User, UserRole } from '../types.ts';
import { MOCK_EMPLOYEES } from '../constants.tsx';
import { dbService } from '../services/dbService.ts';
import { isSupabaseConfigured } from '../services/supabaseClient.ts';
import { translations } from '../translations.ts';

interface LoginProps {
  onLogin: (user: User) => void;
  language: 'en' | 'ar';
}

const Login: React.FC<LoginProps> = ({ onLogin, language }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [error, setError] = useState('');
  const [showSystemConsole, setShowSystemConsole] = useState(false);
  const t = translations[language];

  const handleSeed = async () => {
    setIsSeeding(true);
    setError('');
    try {
      const result = await dbService.seedDatabase();
      if (result.success) {
        setError('Environment synchronized with mock registry.');
      } else {
        setError(`Sync error: ${result.error}`);
      }
    } catch (e) {
      setError("Critical: Database proxy error.");
    } finally {
      setIsSeeding(false);
    }
  };

  const determineRole = (position: string): UserRole => {
    const pos = position.toLowerCase();
    if (pos.includes('hr') || pos.includes('personnel')) return 'HR';
    if (pos.includes('director') || pos.includes('ceo')) return 'Admin';
    if (pos.includes('manager') || pos.includes('head')) return 'Manager';
    return 'Employee';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const normalizedInput = username.toLowerCase().trim();
    
    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError("Network Timeout: Connection lost.");
      }
    }, 10000);

    if (password !== '12345') {
      setError('Invalid identity credentials.');
      setLoading(false);
      clearTimeout(timeoutId);
      return;
    }

    // Fixed Faisal's ID to match seeded data (ending in 0001)
    if (normalizedInput === 'faisal') {
      onLogin({ 
        id: '00000000-0000-0000-0000-000000000001', 
        name: 'Dr. Faisal Al-Sabah', 
        email: 'admin@enterprise-hr.kw', 
        role: 'Admin',
        department: 'Executive'
      });
      clearTimeout(timeoutId);
      return;
    }

    try {
      const dbEmployee = await dbService.getEmployeeByName(username);
      if (dbEmployee) {
        onLogin({
          id: dbEmployee.id,
          name: dbEmployee.name,
          email: `${normalizedInput}@enterprise-hr.kw`,
          role: determineRole(dbEmployee.position),
          department: dbEmployee.department
        });
        clearTimeout(timeoutId);
        return;
      }

      const mock = MOCK_EMPLOYEES.find(emp => {
        const fullName = emp.name.toLowerCase();
        const firstName = emp.name.split(' ')[0].toLowerCase();
        return fullName === normalizedInput || firstName === normalizedInput;
      });

      if (mock) {
        onLogin({
          id: mock.id,
          name: mock.name,
          email: `${mock.name.split(' ')[0].toLowerCase()}@enterprise-hr.kw`,
          role: determineRole(mock.position),
          department: mock.department
        });
      } else {
        setError(`Authentication failed for user "${username}".`);
      }
    } catch (err: any) {
      setError("Database synchronization latency error.");
    } finally {
      setLoading(false);
      clearTimeout(timeoutId);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center p-6 relative overflow-hidden selection:bg-indigo-100">
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="w-full max-w-[1000px] bg-white rounded-[48px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.06)] relative z-10 overflow-hidden flex flex-col md:flex-row border border-slate-200/50">
        
        {/* Branding Panel */}
        <div className="hidden md:flex md:w-[42%] bg-slate-900 relative p-12 flex-col justify-between overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 opacity-95"></div>
           
           <div className="relative z-10">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center text-xl mb-12 shadow-inner">
                🇰🇼
              </div>
              <h2 className="text-4xl font-extrabold text-white leading-tight tracking-tight mb-4">
                Redefining <br/><span className="text-indigo-400">Workforce</span> <br/>Intelligence.
              </h2>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">
                Empowering the Kuwaiti private sector with AI-driven compliance and data management.
              </p>
           </div>

           <div className="relative z-10">
              <div className="p-5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
                 <p className="text-[10px] text-indigo-300 font-extrabold uppercase tracking-widest mb-1">Status</p>
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
                    <span className="text-xs text-white font-bold">Government Link Secure</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Form Panel */}
        <div className="flex-1 p-10 md:p-16 bg-white flex flex-col justify-center">
          <div className="max-w-sm mx-auto w-full">
            <div className="mb-10 text-center md:text-start">
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">{t.loginTitle}</h1>
              <p className="text-slate-400 font-medium text-sm">Welcome back. Enter your credentials to proceed.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-bold p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
                  <span className="text-lg">⚠️</span>
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t.identifier}</label>
                <input 
                  required
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Faisal"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none font-semibold text-slate-800 placeholder:text-slate-300 shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t.passcode}</label>
                <input 
                  required
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none font-semibold text-slate-800 placeholder:text-slate-300 shadow-sm"
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-5 rounded-2xl transition-all disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-indigo-600/20 mt-4 flex items-center justify-center gap-3 uppercase text-[11px] tracking-widest"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    {t.secureLogin} 
                    <span className="text-lg">→</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
               <button 
                 onClick={() => setShowSystemConsole(!showSystemConsole)}
                 className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
               >
                 Maintenance Mode
               </button>
               <span className="text-[10px] text-slate-300 font-medium">Build v4.0.2 Stable</span>
            </div>
          </div>
        </div>
      </div>

      {showSystemConsole && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 p-8 z-[100] animate-in slide-in-from-bottom duration-500">
           <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-start">
                <h3 className="text-slate-900 font-extrabold text-lg flex items-center gap-3">
                   <span className="p-2 bg-amber-100 text-amber-600 rounded-xl text-sm">⚠️</span> 
                   Developer Maintenance Panel
                </h3>
                <p className="text-slate-500 text-xs mt-1">Synchronize the environment with mock data for simulation purposes.</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={handleSeed}
                  disabled={isSeeding}
                  className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-black active:scale-95 disabled:opacity-50"
                >
                  {isSeeding ? 'Synchronizing...' : 'Seed Database'}
                </button>
                <button 
                  onClick={() => setShowSystemConsole(false)}
                  className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200 active:scale-95"
                >
                  Close Panel
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Login;
