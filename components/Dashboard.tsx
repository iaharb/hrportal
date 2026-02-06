
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { dbService } from '../services/dbService.ts';
import { Employee, DepartmentMetric, User, View } from '../types.ts';
import { translations } from '../translations.ts';

interface DashboardProps {
  user: User;
  onNavigate?: (view: View) => void;
  language?: 'en' | 'ar';
}

const Dashboard: React.FC<DashboardProps> = ({ user, onNavigate, language = 'en' }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [deptMetrics, setDeptMetrics] = useState<DepartmentMetric[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<{ type: string, latency?: number }>({ type: 'Testing' });
  const t = translations[language];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const test = await dbService.testConnection();
        setDbStatus({ 
          type: test.success ? (language === 'ar' ? 'مباشر' : 'Live') : (language === 'ar' ? 'تجريبي' : 'Mock'), 
          latency: test.latency 
        });

        const [empData, metricData, news] = await Promise.all([
          dbService.getEmployees(),
          dbService.getDepartmentMetrics(),
          dbService.getAnnouncements()
        ]);

        setAnnouncements(news);

        if (user.role === 'Manager' && user.department) {
          const filteredEmps = empData.filter(e => e.department === user.department);
          const filteredMetrics = metricData.filter(m => m.name === user.department);
          setEmployees(filteredEmps);
          setDeptMetrics(filteredMetrics);
        } else {
          setEmployees(empData);
          setDeptMetrics(metricData);
        }
      } catch (err) {
        console.error("Dashboard Fetch failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, language]);

  const calculateDaysRemaining = (expiryDate?: string) => {
    if (!expiryDate) return Infinity;
    const today = new Date();
    const expiry = new Date(expiryDate);
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const totalEmployees = employees.length;
  const kuwaitiCount = employees.filter(e => e.nationality === 'Kuwaiti').length;
  const kuwaitizationRatio = totalEmployees > 0 ? (kuwaitiCount / totalEmployees) * 100 : 0;
  const targetRatio = 30;

  const criticalExpiries = employees.filter(emp => {
    const cid = emp.civilIdExpiry ? calculateDaysRemaining(emp.civilIdExpiry) : Infinity;
    const pass = emp.passportExpiry ? calculateDaysRemaining(emp.passportExpiry) : Infinity;
    const izn = emp.iznAmalExpiry ? calculateDaysRemaining(emp.iznAmalExpiry) : Infinity;
    return cid <= 30 || pass <= 30 || izn <= 90;
  }).length;

  if (loading) {
    return (
      <div className="space-y-10 animate-pulse">
        <div className="h-48 bg-white rounded-[48px] border border-slate-100"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1,2,3].map(i => <div key={i} className="h-64 bg-white rounded-[40px] border border-slate-100"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex items-center justify-between px-2">
         <div className="flex items-center gap-4">
            <div className={`w-2.5 h-2.5 rounded-full ${dbStatus.type === (language === 'ar' ? 'مباشر' : 'Live') ? (dbStatus.latency && dbStatus.latency > 1000 ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse') : 'bg-amber-400'}`}></div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
              {t.origin}: <span className={dbStatus.type === (language === 'ar' ? 'مباشر' : 'Live') ? 'text-emerald-600' : 'text-amber-600'}>{dbStatus.type} {language === 'ar' ? 'سجل' : 'Registry'} {dbStatus.latency ? `(${dbStatus.latency}ms)` : ''}</span>
            </p>
         </div>
      </div>

      {dbStatus.latency && dbStatus.latency > 1500 && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-[32px] flex items-center justify-between animate-in slide-in-from-top-4 duration-500 shadow-sm shadow-amber-500/5">
           <div className="flex items-center gap-4">
             <span className="text-2xl">⏳</span>
             <div>
                <p className="text-xs font-black text-amber-900 uppercase tracking-widest">{t.performanceLatency}</p>
                <p className="text-[10px] text-amber-700 font-medium">{t.latencyMessage} ({dbStatus.latency}ms).</p>
             </div>
           </div>
           <button 
             onClick={() => window.location.reload()}
             className="px-6 py-2 bg-amber-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-amber-600/20"
           >
             {t.reconnect}
           </button>
        </div>
      )}

      {announcements.length > 0 && (
        <div className="bg-slate-900 rounded-[32px] p-5 flex items-center gap-6 text-white shadow-2xl shadow-slate-900/10 overflow-hidden group">
          <div className="flex-shrink-0 bg-emerald-500 text-slate-900 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">
            {t.registryIntelligence}
          </div>
          <div className="flex-1 whitespace-nowrap overflow-hidden">
            <div className="inline-block animate-scroll group-hover:pause">
              {announcements.map((ann, i) => (
                <span key={i} className="mr-32 font-bold text-sm text-slate-300">
                  <span className={`inline-block w-2 h-2 rounded-full mr-3 ${ann.priority === 'Urgent' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                  {ann.title}: <span className="text-white">{ann.content}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t.runAiAudit, icon: '✨', view: View.Insights, color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
          { label: t.reviewLeaves, icon: '📅', view: View.Leaves, color: 'bg-amber-50 text-amber-600 border-amber-100' },
          { label: t.exportWps, icon: '💰', view: View.Compliance, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
          { label: t.orgRegistry, icon: '👥', view: View.Directory, color: 'bg-slate-50 text-slate-600 border-slate-100' }
        ].map((action, i) => (
          <button 
            key={i}
            onClick={() => onNavigate?.(action.view)}
            className={`${action.color} border p-6 rounded-[32px] flex items-center justify-between hover:scale-[1.03] transition-all group active:scale-95 shadow-sm`}
          >
             <span className="text-[10px] font-black uppercase tracking-widest">{action.label}</span>
             <span className="text-2xl group-hover:rotate-12 transition-transform">{action.icon}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white p-12 rounded-[56px] border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className={`absolute top-0 ${language === 'ar' ? 'left-0' : 'right-0'} p-12 opacity-[0.03] pointer-events-none group-hover:rotate-12 transition-transform duration-1000`}>
             <span className="text-[280px] leading-none select-none">🇰🇼</span>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-16 relative z-10">
            <div className="relative w-56 h-56 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { value: kuwaitizationRatio },
                      { value: Math.max(0, 100 - kuwaitizationRatio) }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={75}
                    outerRadius={95}
                    paddingAngle={0}
                    startAngle={90}
                    endAngle={450}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill={kuwaitizationRatio >= targetRatio ? '#10b981' : '#f59e0b'} />
                    <Cell fill="#f8fafc" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-6xl font-black tracking-tighter ${kuwaitizationRatio >= targetRatio ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {kuwaitizationRatio.toFixed(0)}%
                </span>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{t.targetRatio}</p>
              </div>
            </div>

            <div className="flex-1 space-y-8">
              <div>
                <h3 className="text-4xl font-black text-slate-900 tracking-tight mb-4">{t.workforceBalance}</h3>
                <p className="text-slate-500 text-lg leading-relaxed font-medium">
                  {kuwaitizationRatio >= targetRatio 
                    ? t.hiringSuccess
                    : t.hiringNeeded}
                </p>
              </div>
              
              <div className="flex flex-wrap gap-4">
                 <div className="px-6 py-3 bg-emerald-50 text-emerald-700 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm shadow-emerald-500/5">
                   {t.pamCertified}
                 </div>
                 <div className="px-6 py-3 bg-slate-50 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-100">
                   Ref: MGRP-2024-Q1
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-10 pt-4 border-t border-slate-50">
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.nationalTalent}</p>
                   <p className="text-2xl font-black text-slate-900">{kuwaitiCount} {t.members}</p>
                 </div>
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.expat}</p>
                   <p className="text-2xl font-black text-slate-900">{employees.length - kuwaitiCount} {t.members}</p>
                 </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-slate-900 p-12 rounded-[56px] text-white shadow-2xl relative overflow-hidden group border border-white/5 flex flex-col justify-between">
           <div className={`absolute -bottom-10 ${language === 'ar' ? '-left-10' : '-right-10'} text-[200px] opacity-10 pointer-events-none group-hover:scale-110 transition-all duration-1000`}>🛡️</div>
           
           <div className="relative z-10">
             <h4 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.25em] mb-4">{t.complianceIntegrity}</h4>
             <p className="text-slate-400 font-medium leading-relaxed">
               {t.monitoringDocs}
             </p>
           </div>
           
           <div className="relative z-10 space-y-8 mt-12">
              <div className="flex items-center justify-between p-8 bg-white/5 rounded-[32px] border border-white/10 backdrop-blur-md">
                <div>
                  <p className="text-xs font-bold text-white uppercase tracking-wider mb-1">{t.systemAlerts}</p>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Under 30/90 Days</p>
                </div>
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-3xl font-black transition-all ${criticalExpiries > 0 ? 'bg-rose-500/20 text-rose-500 animate-pulse border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-500'}`}>
                  {criticalExpiries}
                </div>
              </div>

              <div className="space-y-4">
                 <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest px-2">
                    <span className="text-slate-500">{t.riskThreshold}</span>
                    <span className={criticalExpiries > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                      {criticalExpiries > 0 ? t.actionRequired : t.optimal}
                    </span>
                 </div>
                 <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${criticalExpiries > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                      style={{ width: criticalExpiries > 0 ? '100%' : '0%' }}
                    ></div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
