
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
        setError('Registry Synchronized: Mock records injected for simulation.');
      } else {
        setError(`Seeding failed: ${result.error}`);
      }
    } catch (e) {
      setError("Critical: Mock synchronization crashed.");
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
    
    // Safety check to prevent "stuck" state if logic hangs
    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError("Network Timeout: Registry unreachable. Try Maintenance reset.");
      }
    }, 8000);

    if (password !== '12345') {
      setError('Security Alert: Authentication failed for provided credentials.');
      setLoading(false);
      clearTimeout(timeoutId);
      return;
    }

    // High-priority bypass for demo
    if (normalizedInput === 'faisal') {
      onLogin({ id: '00000000-0000-0000-0000-000000000000', name: 'Dr. Faisal Al-Sabah', email: 'admin@enterprise-hr.kw', role: 'Admin' });
      clearTimeout(timeoutId);
      return;
    }

    try {
      const dbEmployee = await dbService.getEmployeeByName(username);
      if (dbEmployee) {
        onLogin({
          id: dbEmployee.id,
          name: dbEmployee.name,
          email: `${normalizedInput.replace(/\s+/g, '')}@enterprise-hr.kw`,
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
        setError(`Identity verification failed. User "${username}" not recognized.`);
      }
    } catch (err: any) {
      setError("System Latency: Database synchronization error.");
    } finally {
      setLoading(false);
      clearTimeout(timeoutId);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden selection:bg-emerald-100">
      <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-emerald-500/10 rounded-full blur-[140px] animate-mesh pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[140px] animate-mesh pointer-events-none" style={{ animationDelay: '-7s' }}></div>
      
      <div className="w-full max-w-[1100px] h-[750px] bg-white/70 backdrop-blur-2xl rounded-[64px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] relative z-10 overflow-hidden flex flex-col md:flex-row border border-white/50 animate-fade-in">
        
        <div className="hidden md:flex md:w-[45%] bg-slate-900 relative p-16 flex-col justify-between overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 opacity-90"></div>
           <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
           
           <div className="relative z-10">
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-emerald-500/10 backdrop-blur-xl rounded-2xl border border-emerald-500/20 mb-12">
                <span className="text-xl">🇰🇼</span>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Official HR Portal</span>
              </div>
              <h2 className="text-6xl font-black text-white leading-[1.1] tracking-tighter mb-8">
                Talent <br/><span className="text-emerald-500">Intelligence</span>
              </h2>
           </div>

           <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4 p-6 bg-white/5 rounded-[32px] border border-white/10 backdrop-blur-md">
                 <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-3xl">🛡️</div>
                 <div>
                    <p className="text-xs text-white font-black uppercase tracking-widest">PAM & MGRP Ready</p>
                    <p className="text-[10px] text-slate-400 font-medium">Quota tracking synchronized</p>
                 </div>
              </div>
           </div>
        </div>

        <div className="flex-1 p-10 md:p-20 bg-white/40 flex flex-col justify-center relative">
          <div className="max-w-md mx-auto w-full">
            <div className="mb-14">
              <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-4">{t.loginTitle}</h1>
              <p className="text-slate-400 font-medium text-lg">{t.loginSubtitle}</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-8">
              {error && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 text-[12px] font-bold p-6 rounded-[28px] flex items-center gap-4 animate-in slide-in-from-top-2 duration-300">
                  <span className="w-6 h-6 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black">!</span>
                  {error}
                </div>
              )}
              
              <div className="space-y-3">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest pl-3">{t.identifier}</label>
                <input 
                  required
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Faisal"
                  className="w-full bg-white border border-slate-200 rounded-[30px] px-8 py-6 focus:ring-8 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-200 text-lg shadow-sm"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest pl-3">{t.passcode}</label>
                <input 
                  required
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••"
                  className="w-full bg-white border border-slate-200 rounded-[30px] px-8 py-6 focus:ring-8 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-200 text-lg shadow-sm"
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-black text-white font-black py-7 rounded-[32px] transition-all disabled:opacity-50 active:scale-[0.97] shadow-2xl shadow-slate-900/10 mt-10 flex items-center justify-center gap-5 group text-[13px] uppercase tracking-[0.25em]"
              >
                {loading ? (
                  <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    {t.secureLogin} 
                    <span className="group-hover:translate-x-2 transition-transform text-xl">→</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-20 pt-10 border-t border-slate-100 flex items-center justify-between">
               <button 
                 onClick={() => setShowSystemConsole(!showSystemConsole)}
                 className="text-[10px] font-black text-slate-300 hover:text-slate-900 transition-colors py-2 px-1 uppercase tracking-widest"
               >
                 {t.maintenance}
               </button>
               <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Server v.402 Online</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {showSystemConsole && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-xl border-t border-white/10 p-12 z-[100] animate-in slide-in-from-bottom duration-500 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
           <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="text-left flex-1">
                <h3 className="text-white font-black text-2xl mb-3 flex items-center gap-4">
                   <span className="p-2 bg-amber-500/20 text-amber-500 rounded-xl">⚠️</span> 
                   Maintenance Panel
                </h3>
              </div>
              <div className="flex gap-6 w-full md:w-auto">
                <button 
                  onClick={handleSeed}
                  disabled={isSeeding}
                  className="flex-1 md:flex-none px-12 py-5 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                >
                  {isSeeding ? 'Synchronizing...' : t.syncMock}
                </button>
                <button 
                  onClick={() => setShowSystemConsole(false)}
                  className="px-12 py-5 bg-white/10 text-slate-400 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-white/20 hover:text-white transition-all active:scale-95 border border-white/5"
                >
                  {t.dismiss}
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Login;
