
import React, { useState } from 'react';
import { User, UserRole } from '../types.ts';
import { MOCK_EMPLOYEES } from '../constants.tsx';
import { dbService } from '../services/dbService.ts';
import { isSupabaseConfigured } from '../services/supabaseClient.ts';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [error, setError] = useState('');
  const [showSystemConsole, setShowSystemConsole] = useState(false);

  const handleSeed = async () => {
    setIsSeeding(true);
    setError('');
    const result = await dbService.seedDatabase();
    if (result.success) {
      setError('System Synchronized: Workforce records and policy constants updated.');
    } else {
      setError(`Seeding failed: ${result.error || 'Check connectivity'}. Ensure SQL schema is applied.`);
    }
    setIsSeeding(false);
  };

  const determineRole = (position: string): UserRole => {
    const pos = position.toLowerCase();
    if (pos.includes('hr') || pos.includes('personnel') || pos.includes('payroll')) return 'HR';
    if (pos.includes('director') || pos.includes('ceo')) return 'Admin';
    if (pos.includes('manager') || pos.includes('head') || pos.includes('lead')) return 'Manager';
    return 'Employee';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const normalizedInput = username.toLowerCase().trim();
    
    // Security check - restricted to demo passcode
    if (password !== '12345') {
      setError('Security Alert: Authentication failed for the provided credentials.');
      setLoading(false);
      return;
    }

    // Direct bypass for specific roles
    if (normalizedInput === 'faisal') {
      onLogin({ id: '00000000-0000-0000-0000-000000000000', name: 'Dr. Faisal Al-Sabah', email: 'admin@qubus.kw', role: 'Admin' });
      return;
    }

    if (normalizedInput === 'layla') {
      onLogin({ 
        id: '55555555-5555-5555-5555-555555555555', 
        name: 'Layla Al-Fadhli', 
        email: 'layla.hr@qubus.kw', 
        role: 'HR',
        department: 'HR' 
      });
      return;
    }

    try {
      // 1. Try Live DB
      const dbEmployee = await dbService.getEmployeeByName(username);
      if (dbEmployee && isSupabaseConfigured) {
        onLogin({
          id: dbEmployee.id,
          name: dbEmployee.name,
          email: `${normalizedInput.replace(/\s+/g, '')}@qubus.kw`,
          role: determineRole(dbEmployee.position),
          department: dbEmployee.department
        });
        return;
      }

      // 2. Try Mock Data
      const mock = MOCK_EMPLOYEES.find(emp => {
        const fullName = emp.name.toLowerCase();
        const firstName = emp.name.split(' ')[0].toLowerCase();
        return fullName === normalizedInput || firstName === normalizedInput;
      });

      if (mock) {
        onLogin({
          id: mock.id,
          name: mock.name,
          email: `${mock.name.split(' ')[0].toLowerCase()}@qubus.kw`,
          role: determineRole(mock.position),
          department: mock.department
        });
      } else {
        setError(`Identity verification failed. User "${username}" not found in current registry.`);
      }
    } catch (err: any) {
      setError("System Latency: Database synchronization error. Try again shortly.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 relative overflow-hidden selection:bg-emerald-100">
      {/* Animated Mesh Background Components */}
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[120px] animate-mesh"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] animate-mesh" style={{ animationDelay: '-5s' }}></div>
      
      {/* Main Container */}
      <div className="w-full max-w-[1100px] h-[720px] bg-white rounded-[60px] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] relative z-10 overflow-hidden flex flex-col md:flex-row border border-slate-100 animate-fade-in">
        
        {/* Left Panel: High-End Branding */}
        <div className="hidden md:flex md:w-[45%] bg-slate-900 relative p-16 flex-col justify-between overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 opacity-95"></div>
           <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl -mr-48 -mt-48 animate-pulse"></div>
           
           <div className="relative z-10">
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 mb-10">
                <span className="text-xl">🇰🇼</span>
                <span className="text-[10px] font-black text-white uppercase tracking-[0.25em]">State of Kuwait HRMS</span>
              </div>
              <h2 className="text-5xl font-black text-white leading-tight tracking-tighter mb-6">
                National <span className="text-emerald-500">Talent</span> Intelligence
              </h2>
              <p className="text-slate-400 font-medium text-lg leading-relaxed max-w-sm">
                Advanced workforce management tailored for Kuwaitization, payroll integrity, and government compliance.
              </p>
           </div>

           <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4 p-5 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-md">
                 <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-2xl text-emerald-500">🛡️</div>
                 <div>
                    <p className="text-xs text-white font-black uppercase tracking-widest">PAM Compliant</p>
                    <p className="text-[10px] text-slate-400 font-medium">Auto-quota tracking enabled</p>
                 </div>
              </div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest px-4 opacity-60">Verified Enterprise Platform v2.5</p>
           </div>
        </div>

        {/* Right Panel: Clean Login Form */}
        <div className="flex-1 p-10 md:p-24 bg-white flex flex-col justify-center relative">
          <div className="max-w-md mx-auto w-full">
            <div className="mb-12">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Enterprise Access</h1>
              <p className="text-slate-400 font-medium text-lg">Authenticate to manage your workspace.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-bold p-5 rounded-[24px] flex items-center gap-4 animate-fade-in">
                  <span className="w-6 h-6 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs">!</span>
                  {error}
                </div>
              )}
              
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Credential Identity</label>
                <div className="relative group">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors text-xl">👤</span>
                  <input 
                    required
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username (e.g. Faisal, Layla)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-[24px] pl-16 pr-8 py-5 focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300 text-base"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Security Passcode</label>
                <div className="relative group">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors text-xl">🔒</span>
                  <input 
                    required
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-[24px] pl-16 pr-8 py-5 focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300 text-base"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-black text-white font-black py-6 rounded-[24px] transition-all disabled:opacity-50 active:scale-[0.98] shadow-2xl shadow-slate-900/10 mt-8 flex items-center justify-center gap-4 group text-[12px] uppercase tracking-[0.2em]"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Initialize Session 
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-16 pt-10 border-t border-slate-100 flex items-center justify-between">
               <button 
                 onClick={() => setShowSystemConsole(!showSystemConsole)}
                 className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors py-2 px-1"
               >
                 Maintenance Tools
               </button>
               <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Server: Production</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Discrete Maintenance Console */}
      {showSystemConsole && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-white/10 p-10 z-[100] animate-fade-in shadow-2xl">
           <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="text-left">
                <h3 className="text-white font-black text-xl mb-2 flex items-center gap-3">
                   <span className="text-amber-500">⚠️</span> System Administration
                </h3>
                <p className="text-slate-400 text-sm">Force database synchronization or seed mock records for testing purposes.</p>
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <button 
                  onClick={handleSeed}
                  disabled={isSeeding}
                  className="flex-1 md:flex-none px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                >
                  {isSeeding ? 'Syncing...' : 'Sync Mock Registry'}
                </button>
                <button 
                  onClick={() => setShowSystemConsole(false)}
                  className="px-10 py-4 bg-white/10 text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all active:scale-95 border border-white/10"
                >
                  Dismiss
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Login;
