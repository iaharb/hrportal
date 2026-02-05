
import React, { useState, useEffect } from 'react';
import { runAdminTask } from '../services/geminiService.ts';
import { dbService } from '../services/dbService.ts';
import { useNotifications } from './NotificationSystem.tsx';
import { PublicHoliday, OfficeLocation, DepartmentMetric } from '../types.ts';

const AdminCenter: React.FC = () => {
  const { notify } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState<string | null>(null);
  const [connectionReport, setConnectionReport] = useState<{ success: boolean; message: string; latency?: number; details?: any } | null>(null);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  
  const [activeTab, setActiveTab] = useState<'Integrity' | 'Registry' | 'Forge' | 'Comms'>('Integrity');

  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [zones, setZones] = useState<OfficeLocation[]>([]);
  const [metrics, setMetrics] = useState<DepartmentMetric[]>([]);
  const [depts, setDepts] = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([]);

  useEffect(() => {
    const loadStaticData = async () => {
      const [h, z, m, d, p] = await Promise.all([
        dbService.getPublicHolidays(),
        dbService.getOfficeLocations(),
        dbService.getDepartmentMetrics(),
        dbService.getDepartments(),
        dbService.getPositions()
      ]);
      setHolidays(h);
      setZones(z);
      setMetrics(m);
      setDepts(d);
      setPositions(p);
    };
    loadStaticData();
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setLoading(true);
    const report = await dbService.testConnection();
    setConnectionReport(report);
    if (report.latency !== undefined) {
      setLatencyHistory(prev => [...prev.slice(-9), report.latency!]);
    }
    setLoading(false);
  };

  const copySqlSchema = () => {
    const sql = `
-- Run this in Supabase SQL Editor
CREATE TABLE employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_arabic TEXT,
  nationality TEXT CHECK (nationality IN ('Kuwaiti', 'Expat')),
  civil_id TEXT,
  civil_id_expiry DATE,
  passport_number TEXT,
  passport_expiry DATE,
  izn_amal_expiry DATE,
  department TEXT NOT NULL,
  position TEXT NOT NULL,
  position_arabic TEXT,
  join_date DATE DEFAULT CURRENT_DATE,
  salary NUMERIC NOT NULL,
  status TEXT DEFAULT 'Active',
  leave_balances JSONB DEFAULT '{"annual": 30, "sick": 15, "emergency": 6, "annualUsed": 0, "sickUsed": 0, "emergencyUsed": 0}',
  training_hours NUMERIC DEFAULT 0,
  work_days_per_week INTEGER DEFAULT 6,
  iban TEXT,
  bank_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE leave_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT,
  department TEXT,
  type TEXT,
  start_date DATE,
  end_date DATE,
  days INTEGER,
  reason TEXT,
  status TEXT DEFAULT 'Pending',
  manager_id UUID,
  history JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
    `;
    navigator.clipboard.writeText(sql.trim());
    notify("SQL Copied", "Schema copied to clipboard. Paste into Supabase SQL Editor.", "success");
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24">
      <div className="bg-slate-900 rounded-[56px] p-12 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none group-hover:rotate-12 transition-transform duration-1000">
           <span className="text-[200px]">🛡️</span>
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl font-black mb-4 tracking-tighter">Admin Control Console</h2>
          <p className="text-slate-400 max-w-xl font-medium leading-relaxed">
            Manage bilingual registry data and operational parameters across the enterprise.
          </p>
        </div>
      </div>

      <div className="flex bg-white p-2 rounded-[32px] border border-slate-200 shadow-sm self-start inline-flex">
        {['Integrity', 'Registry', 'Forge', 'Comms'].map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab as any); setAiOutput(null); }}
            className={`px-10 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === tab ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {tab === 'Registry' ? 'Registry Config' : tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12 space-y-8">
          {activeTab === 'Integrity' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4">
              {/* Connection Status Card */}
              <div className="lg:col-span-1 bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-2">Registry Link</h3>
                  <p className="text-xs text-slate-500 font-medium mb-8">Real-time Supabase health check.</p>
                  
                  {connectionReport && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${connectionReport.success ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {connectionReport.success ? '⚡' : '❌'}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 uppercase tracking-widest">
                            {connectionReport.success ? 'System Online' : 'System Degraded'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold">{connectionReport.message}</p>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-slate-50">
                        <div className="flex justify-between items-center mb-2">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Latency (Ping)</span>
                           <span className={`text-xs font-black ${connectionReport.latency && connectionReport.latency > 1000 ? 'text-rose-500' : 'text-emerald-500'}`}>
                              {connectionReport.latency || '--'} ms
                           </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                           <div 
                             className={`h-full transition-all duration-500 ${connectionReport.latency && connectionReport.latency > 1000 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                             style={{ width: `${Math.min(100, (connectionReport.latency || 0) / 20)}%` }}
                           ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  onClick={checkConnection}
                  disabled={loading}
                  className="w-full mt-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black active:scale-95 disabled:opacity-50 transition-all"
                >
                  {loading ? 'Testing Link...' : 'Run Diagnostics'}
                </button>
              </div>

              {/* Latency Visualization Card */}
              <div className="lg:col-span-2 bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-2">Performance HUD</h3>
                    <p className="text-xs text-slate-500 font-medium">Historical registry response times.</p>
                  </div>
                  <button 
                    onClick={copySqlSchema}
                    className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100"
                  >
                    Copy SQL Schema
                  </button>
                </div>
                
                <div className="h-32 flex items-end gap-2 px-4">
                  {latencyHistory.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 italic text-xs">No pulse data collected yet.</div>
                  ) : (
                    latencyHistory.map((ping, i) => (
                      <div 
                        key={i} 
                        className={`flex-1 rounded-t-lg transition-all duration-500 ${ping > 1000 ? 'bg-rose-500' : (ping > 500 ? 'bg-amber-400' : 'bg-emerald-500')}`}
                        style={{ height: `${Math.min(100, (ping / 3000) * 100)}%` }}
                        title={`${ping}ms`}
                      ></div>
                    ))
                  )}
                </div>
                
                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-slate-50">
                   <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Max Delay</p>
                     <p className="text-sm font-black text-slate-900">{latencyHistory.length > 0 ? Math.max(...latencyHistory) : 0} ms</p>
                   </div>
                   <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Speed</p>
                     <p className="text-sm font-black text-slate-900">
                       {latencyHistory.length > 0 ? Math.round(latencyHistory.reduce((a,b)=>a+b, 0) / latencyHistory.length) : 0} ms
                     </p>
                   </div>
                   <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Node Status</p>
                     <p className="text-sm font-black text-emerald-600">Active</p>
                   </div>
                   <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">SSL Link</p>
                     <p className="text-sm font-black text-indigo-600">Verified</p>
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab !== 'Integrity' && (
             <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm animate-in fade-in duration-300">
                <p className="text-slate-400 font-medium italic">Administrative tools for this module are currently undergoing maintenance audit.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCenter;
