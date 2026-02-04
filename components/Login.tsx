
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { MOCK_EMPLOYEES } from '../constants';
import { dbService } from '../services/dbService';
import { isSupabaseConfigured } from '../services/supabaseClient';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ exists: boolean; isEmpty: boolean; error?: string }>({ exists: true, isEmpty: false });
  const [error, setError] = useState('');
  const [showSql, setShowSql] = useState(false);

  const checkDb = async () => {
    if (isSupabaseConfigured) {
      const status = await dbService.checkTableStatus();
      setDbStatus(status);
    }
  };

  useEffect(() => {
    checkDb();
  }, []);

  const handleSeed = async () => {
    setIsSeeding(true);
    setError('');
    const result = await dbService.seedDatabase();
    if (result.success) {
      setDbStatus({ exists: true, isEmpty: false });
      setError('Success! Database seeded. You can now log in.');
    } else {
      setError(`Error: ${result.error}`);
    }
    setIsSeeding(false);
  };

  const sqlSchema = `-- RUN THIS IN SUPABASE SQL EDITOR TO STAY IN SYNC
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  nationality TEXT CHECK (nationality IN ('Kuwaiti', 'Expat')),
  department TEXT NOT NULL,
  position TEXT NOT NULL,
  join_date DATE DEFAULT CURRENT_DATE,
  salary NUMERIC NOT NULL,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'On Leave', 'Terminated')),
  leave_balances JSONB DEFAULT '{"annual": 30, "sick": 15, "emergency": 6, "annualUsed": 0, "sickUsed": 0, "emergencyUsed": 0}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  department TEXT NOT NULL,
  type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Resumed - Awaiting Approval', 'Completed')),
  manager_id TEXT NOT NULL,
  actual_return_date DATE,
  medical_certificate_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE employees TO anon, authenticated, service_role;
GRANT ALL ON TABLE leave_requests TO anon, authenticated, service_role;`;

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

    const normalizedInput = username.toLowerCase().trim();
    if (password !== '12345') {
      setError('Invalid password. Hint: 12345');
      setLoading(false);
      return;
    }

    if (normalizedInput === 'faisal') {
      onLogin({ id: 'admin-1', name: 'Dr. Faisal Al-Sabah', email: 'admin@qubus.kw', role: 'Admin' });
      setLoading(false);
      return;
    }

    try {
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
        setError(`User "${username}" not found. Try "Raj Patel", "Sarah", or "Ahmed".`);
      }
    } catch (err: any) {
      setError("Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-inter">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-100 rounded-full blur-[120px]"></div>
      
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-[40px] shadow-2xl relative z-10 overflow-hidden">
        <div className="p-10">
          <div className="text-center mb-8">
            <span className="text-4xl inline-block mb-4">🇰🇼</span>
            <h1 className="text-2xl font-black text-slate-900">HR Portal</h1>
            <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest font-bold">Workforce Management</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold p-3 rounded-xl animate-pulse">
                {error}
              </div>
            )}
            
            <input 
              required
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username (e.g. Raj Patel, Sarah, Faisal)"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />
            <input 
              required
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (12345)"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            />

            <button 
              type="submit"
              disabled={loading || isSeeding}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {isSupabaseConfigured && (
            <div className="mt-8 space-y-4">
              {!dbStatus.exists ? (
                <div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl">
                  <p className="text-[10px] font-black text-rose-700 uppercase mb-2">⚠️ Database Setup Needed</p>
                  <button 
                    onClick={() => setShowSql(!showSql)}
                    className="w-full py-2 bg-white border border-rose-200 rounded-xl text-[10px] font-bold text-rose-700 mb-3"
                  >
                    {showSql ? 'Close SQL Helper' : 'Get SQL Creation Script'}
                  </button>
                  {showSql && (
                    <div className="space-y-3">
                      <textarea readOnly className="w-full h-48 bg-slate-900 text-emerald-400 font-mono text-[9px] p-3 rounded-xl" value={sqlSchema} />
                      <button onClick={() => { navigator.clipboard.writeText(sqlSchema); alert('SQL Copied!'); }} className="w-full bg-slate-800 text-white text-[10px] py-2 rounded-xl">Copy Script</button>
                    </div>
                  )}
                </div>
              ) : dbStatus.isEmpty ? (
                <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl">
                  <p className="text-[10px] font-black text-emerald-700 uppercase mb-2">🚀 Seed Database</p>
                  <button onClick={handleSeed} disabled={isSeeding} className="w-full py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20">
                    {isSeeding ? 'Migrating...' : 'Seed Data Now'}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;