
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { dbService } from '../services/dbService.ts';
import { Employee, DepartmentMetric, User } from '../types.ts';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [deptMetrics, setDeptMetrics] = useState<DepartmentMetric[]>([]);
  const [personalProfile, setPersonalProfile] = useState<Employee | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empData, metricData, profile, news] = await Promise.all([
          dbService.getEmployees(),
          dbService.getDepartmentMetrics(),
          dbService.getEmployeeByName(user.name),
          dbService.getAnnouncements()
        ]);

        setPersonalProfile(profile);
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
        console.error("Fetch failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const calculateDaysRemaining = (expiryDate?: string) => {
    if (!expiryDate) return Infinity;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const totalEmployees = employees.length;
  const kuwaitiCount = employees.filter(e => e.nationality === 'Kuwaiti').length;
  const expatCount = totalEmployees - kuwaitiCount;
  const kuwaitizationRatio = totalEmployees > 0 ? (kuwaitiCount / totalEmployees) * 100 : 0;
  
  const currentDeptMetric = user.role === 'Manager' 
    ? deptMetrics.find(m => m.name === user.department)
    : null;
  const targetRatio = currentDeptMetric?.targetRatio || 30;

  // Document Analytics
  const criticalExpiries = employees.flatMap(emp => {
    const docs = [];
    if (emp.civilIdExpiry && calculateDaysRemaining(emp.civilIdExpiry) <= 30) docs.push('cid');
    if (emp.passportExpiry && calculateDaysRemaining(emp.passportExpiry) <= 30) docs.push('pass');
    if (emp.iznAmalExpiry && calculateDaysRemaining(emp.iznAmalExpiry) <= 30) docs.push('izn');
    return docs;
  }).length;

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-32 bg-white rounded-[32px] border border-slate-100"></div>
        <div className="grid grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white rounded-2xl border border-slate-100"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {announcements.length > 0 && (
        <div className="overflow-hidden bg-slate-900 rounded-[24px] p-4 flex items-center gap-4 text-white shadow-2xl shadow-slate-900/10">
          <span className="flex-shrink-0 bg-emerald-500 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] text-slate-900">Official Notice</span>
          <div className="flex-1 whitespace-nowrap overflow-hidden">
            <div className="inline-block animate-[scroll_30s_linear_infinite] hover:pause">
              {announcements.map((ann, i) => (
                <span key={i} className="mr-20 font-bold text-sm">
                  <span className={`mr-2 ${ann.priority === 'Urgent' ? 'text-rose-400' : 'text-emerald-400'}`}>●</span>
                  {ann.title}: {ann.content}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {user.role === 'Manager' ? `${user.department} Executive Briefing` : 'Kuwaitization Operations Command'}
          </h2>
          <p className="text-sm text-slate-500 font-medium">Real-time nationalization metrics and compliance radar.</p>
        </div>
      </header>

      {/* Grid for Compliance & Personal Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-12 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
             <span className="text-[200px] leading-none select-none">📊</span>
          </div>
          <div className="relative w-48 h-48 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[{ value: kuwaitizationRatio }, { value: 100 - kuwaitizationRatio }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  startAngle={90}
                  endAngle={450}
                  dataKey="value"
                >
                  <Cell fill={kuwaitizationRatio >= targetRatio ? '#059669' : '#d97706'} />
                  <Cell fill="#f1f5f9" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-black tracking-tighter ${kuwaitizationRatio >= targetRatio ? 'text-emerald-600' : 'text-amber-600'}`}>
                {kuwaitizationRatio.toFixed(0)}%
              </span>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Ratio</p>
            </div>
          </div>
          <div className="flex-1 space-y-6 relative z-10">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Government Quota Status</h3>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xl font-medium">
              Your organization is currently operating at <span className="font-black text-slate-900">{kuwaitizationRatio.toFixed(1)}%</span> national participation. Target baseline is set at <span className="font-black text-slate-900 underline decoration-emerald-500">{targetRatio}%</span>.
            </p>
            <div className="flex gap-4">
               <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                 Compliant Range
               </div>
               <div className="px-4 py-2 bg-slate-50 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200">
                 PAM Certified
               </div>
            </div>
          </div>
        </div>

        {/* Document Compliance Radar */}
        <div className="bg-slate-900 p-10 rounded-[48px] text-white shadow-2xl relative overflow-hidden group border border-white/5">
           <div className="absolute -bottom-10 -right-10 text-[180px] opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-1000">🛡️</div>
           <div className="relative z-10 h-full flex flex-col justify-between">
             <div>
               <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-4">Ministry Compliance Radar</h4>
               <p className="text-sm text-slate-400 font-medium mb-8 leading-relaxed">
                 Shoon & Ministry of Interior document expirations requiring immediate HR intervention.
               </p>
             </div>
             
             <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-xs font-bold text-white uppercase tracking-wider">Critical Expiries</p>
                    <p className="text-[10px] text-slate-500 font-black uppercase mt-1">Under 30 Days</p>
                  </div>
                  <div className={`w-14 h-14 rounded-3xl flex items-center justify-center text-2xl font-black ${criticalExpiries > 0 ? 'bg-rose-500/20 text-rose-500 animate-pulse' : 'bg-emerald-500/20 text-emerald-500'}`}>
                    {criticalExpiries}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                   <div className="flex-1 bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${criticalExpiries > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                        style={{ width: criticalExpiries > 0 ? '100%' : '0%' }}
                      ></div>
                   </div>
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Risk Index</span>
                </div>
             </div>
           </div>
        </div>
      </div>

      {/* Announcements / Personal Briefing secondary section could go here */}
    </div>
  );
};

export default Dashboard;
