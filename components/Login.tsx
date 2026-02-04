import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { MOCK_EMPLOYEES } from '../constants';
import { dbService } from '../services/dbService';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const determineRole = (position: string): UserRole => {
    const pos = position.toLowerCase();
    if (pos.includes('director') || pos.includes('ceo')) return 'Admin';
    if (pos.includes('manager') || pos.includes('head') || pos.includes('lead')) return 'Manager';
    return 'Employee';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== '12345') {
      setError('Invalid Access Credentials');
      setLoading(false);
      return;
    }

    const normalizedInput = username.toLowerCase().trim();
    if (normalizedInput === 'faisal') {
      onLogin({ id: 'admin-1', name: 'Dr. Faisal Al-Sabah', email: 'admin@qubus.kw', role: 'Admin' });
      setLoading(false);
      return;
    }

    try {
      const dbEmployee = await dbService.getEmployeeByName(username);
      if (dbEmployee) {
        onLogin({
          id: dbEmployee.id,
          name: dbEmployee.name,
          email: `${normalizedInput.replace(/\s+/g, '')}@qubus.kw`,
          role: determineRole(dbEmployee.position),
          department: dbEmployee.department
        });
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
          email: `${mock.name.split(' ')[0].toLowerCase()}@qubus.kw`,
          role: determineRole(mock.position),
          department: mock.department
        });
      } else {
        setError('Personnel record not found');
      }
    } catch (err: any) {
      setError("Network authentication failure");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-50 rounded-full blur-[140px] opacity-60 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-[120px] opacity-40"></div>
      
      <div className="w-full max-w-md glass rounded-[48px] p-12 relative z-10 shadow-2xl shadow-slate-200/50">
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-white rounded-3xl shadow-xl border border-slate-100 inline-flex items-center justify-center mb-8 transform hover:scale-110 transition-transform">
             <span className="text-5xl">🇰🇼</span>
          </div>
          <h1 className="text-3xl font-black text-slate-950 tracking-tighter">HR Portal</h1>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] mt-2">National Workforce MS</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black p-4 rounded-2xl text-center uppercase tracking-widest">
              {error}
            </div>
          )}
          
          <div className="space-y-3">
            <input 
              required
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full bg-slate-100/50 border border-slate-200/50 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400 font-medium text-sm"
            />
            <input 
              required
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-slate-100/50 border border-slate-200/50 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400 font-medium text-sm"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl shadow-slate-900/10 hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50 mt-6"
          >
            {loading ? 'Authenticating...' : 'Establish Secure Connection'}
          </button>
        </form>

        <p className="text-center mt-12 text-[9px] font-black text-slate-400 uppercase tracking-widest leading-loose">
          Proprietary Intelligence Platform<br/>
          Government of Kuwait Compliance
        </p>
      </div>
    </div>
  );
};

export default Login;