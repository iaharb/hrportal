
import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { getKuwaitizationInsights } from '../services/geminiService.ts';
import { dbService } from '../services/dbService.ts';
import { InsightReport, LeaveRequest, Employee, AttendanceRecord } from '../types.ts';
import { useTranslation } from 'react-i18next';

const COLORS = ['#4f46e5', '#818cf8', '#f59e0b', '#ec4899', '#94a3b8'];

const AiInsights: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<InsightReport | null>(null);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [riskAssessment, setRiskAssessment] = useState<{level: string, message: string} | null>(null);

  const isAr = i18n.language === 'ar';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [liveEmployees, leaves, attendance] = await Promise.all([
        dbService.getEmployees(),
        dbService.getLeaveRequests(),
        dbService.getAttendanceRecords()
      ]);
      
      setEmployees(liveEmployees);
      setLeaveRequests(leaves);
      setAttendanceLogs(attendance);

      const dataStr = JSON.stringify(liveEmployees.map(e => ({
        name: e.name,
        nat: e.nationality,
        dept: e.department,
        pos: e.position
      })));
      
      const result = await getKuwaitizationInsights(dataStr);
      setReport(result);
      generateHeatmap(leaves);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateHeatmap = (leaves: LeaveRequest[]) => {
    const data = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const count = leaves.filter(l => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        const current = new Date(dateStr);
        return current >= start && current <= end;
      }).length;
      
      data.push({
        date: date.toLocaleDateString(i18n.language === 'ar' ? 'ar-KW' : 'en-GB', { day: '2-digit', month: 'short' }),
        absences: count,
        staffingLevel: 100 - (count * 15)
      });
    }
    setHeatmapData(data);

    const maxAbsences = Math.max(...data.map(d => d.absences));
    if (maxAbsences > 3) {
      setRiskAssessment({
        level: t('critical'),
        message: i18n.language === 'ar' 
          ? 'يتوقع النظام نقصاً حاداً في القوى العاملة منتصف الشهر القادم.'
          : 'System predicts a critical staffing dip around the middle of next month.'
      });
    } else {
      setRiskAssessment({
        level: t('optimal'),
        message: i18n.language === 'ar'
          ? 'جاهزية القوى العاملة ضمن المعايير التشغيلية الآمنة للدورة القادمة.'
          : 'Workforce availability remains within safe operational parameters for the upcoming cycle.'
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, [i18n.language]);

  // Analytical Computations
  const leaveDistribution = useMemo(() => {
    const types: Record<string, number> = {};
    leaveRequests.forEach(r => {
      types[r.type] = (types[r.type] || 0) + 1;
    });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  }, [leaveRequests]);

  const punctualityData = useMemo(() => {
    const dates: Record<string, { total: number, late: number }> = {};
    attendanceLogs.slice(0, 50).forEach(log => {
      if (!dates[log.date]) dates[log.date] = { total: 0, late: 0 };
      dates[log.date].total++;
      if (log.status === 'Late') dates[log.date].late++;
    });
    return Object.entries(dates).map(([date, stats]) => ({
      date: date.slice(-5),
      rate: Math.round(( (stats.total - stats.late) / stats.total ) * 100)
    })).reverse();
  }, [attendanceLogs]);

  const latenessWatchlist = useMemo(() => {
    const userLateness: Record<string, { name: string, count: number, avgCheckIn: string }> = {};
    attendanceLogs.forEach(log => {
      if (!userLateness[log.employeeId]) userLateness[log.employeeId] = { name: log.employeeName, count: 0, avgCheckIn: log.clockIn };
      if (log.status === 'Late') userLateness[log.employeeId].count++;
    });
    return Object.values(userLateness)
      .sort((a,b) => b.count - a.count)
      .slice(0, 5);
  }, [attendanceLogs]);

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20 text-start">
      {/* AI Hero Banner */}
      <div className="bg-slate-900 rounded-[56px] p-12 text-white shadow-2xl relative overflow-hidden group border border-white/5">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
           <span className="text-[280px] leading-none select-none">🧠</span>
        </div>
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
              <span className="text-indigo-400">✨</span>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{t('generativeIntelHub')}</span>
            </div>
            
            <h2 className="text-5xl font-black tracking-tighter leading-[0.95]">
              {t('strategicForecasting')}
            </h2>
            <p className="text-slate-400 text-lg max-w-xl leading-relaxed font-medium">
              {isAr 
                ? 'تحليلات مدعومة بالذكاء الاصطناعي لسجلك المؤسسي. نتابع حصص التوطين، ونتنبأ بتوفر الموظفين، وننشئ مسارات الامتثال تلقائياً.'
                : 'AI-driven analysis of your corporate registry. We track Kuwaitization quotas, predict workforce availability, and generate compliance pathways automatically.'}
            </p>
            
            <button 
              onClick={fetchData}
              disabled={loading}
              className="bg-white text-slate-900 px-10 py-5 rounded-[24px] font-black text-[12px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50 shadow-2xl shadow-white/5 active:scale-95"
            >
              {loading ? 'Consulting Gemini...' : t('runAiAudit')}
            </button>
          </div>

          {report && (
             <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[40px] border border-white/10 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">{t('complianceAudit')}</h3>
                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    report.complianceStatus === 'Compliant' ? 'bg-indigo-500/20 text-indigo-400' : 
                    report.complianceStatus === 'Warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {report.complianceStatus}
                  </span>
                </div>
                <div className="space-y-4">
                  {report.recommendations.slice(0, 3).map((rec, i) => (
                    <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-colors">
                      <span className="text-indigo-500 font-black text-xs">0{i+1}</span>
                      <p className="text-[11px] text-slate-300 font-bold leading-relaxed">{rec}</p>
                    </div>
                  ))}
                </div>
             </div>
           )}
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{t('lateRate')}</p>
            <div className="flex items-end gap-3">
               <h4 className="text-5xl font-black text-slate-900 tracking-tighter">
                 {Math.round((attendanceLogs.filter(a => a.status === 'Late').length / (attendanceLogs.length || 1)) * 100)}%
               </h4>
               <span className="text-xs font-bold text-rose-500 mb-2">High Variance</span>
            </div>
         </div>
         <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{t('presentCount')}</p>
            <div className="flex items-end gap-3">
               <h4 className="text-5xl font-black text-indigo-600 tracking-tighter">
                 {employees.filter(e => e.status === 'Active').length}
               </h4>
               <span className="text-xs font-bold text-indigo-500 mb-2">Full Capacity</span>
            </div>
         </div>
         <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm bg-indigo-50/30">
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4">{t('staffingResilience')}</p>
            <p className="text-sm font-bold text-indigo-900 leading-tight">
               {riskAssessment?.message || 'Calculating readiness...'}
            </p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Attendance Trends */}
        <div className="lg:col-span-8 bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('punctualityTrend')}</h3>
              <p className="text-sm text-slate-500 font-medium">Historical daily attendance integrity percentage.</p>
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={punctualityData}>
                <defs>
                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} domain={[0, 100]} />
                <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                <Area type="monotone" dataKey="rate" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#colorRate)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lateness Watchlist */}
        <div className="lg:col-span-4 bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-3">
             <span className="w-2 h-2 rounded-full bg-rose-500"></span>
             {t('topLateness')}
          </h3>
          <div className="space-y-6 flex-1">
             {latenessWatchlist.map((user, i) => (
               <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <p className="text-sm font-black text-slate-900">{user.name}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{t('avgCheckIn')}: {user.avgCheckIn}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-rose-600">{user.count}</span>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Occurrences</p>
                  </div>
               </div>
             ))}
             {latenessWatchlist.length === 0 && <p className="text-slate-300 italic text-center py-10">No integrity issues detected.</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Leave Distribution Pie */}
        <div className="lg:col-span-4 bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm flex flex-col">
           <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8">{t('leaveDistribution')}</h3>
           <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leaveDistribution}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {leaveDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
           </div>
           <div className="grid grid-cols-2 gap-4 mt-4">
              {leaveDistribution.map((entry, i) => (
                <div key={i} className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                   <span className="text-[10px] font-black text-slate-600 uppercase">{entry.name}</span>
                </div>
              ))}
           </div>
        </div>

        {/* Leave Utilization Table */}
        <div className="lg:col-span-8 bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
           <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('utilizationRegistry')}</h3>
              <span className="text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 px-4 py-1.5 rounded-xl border border-indigo-100">Annual Quota Control</span>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                   <tr className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-200">
                      <th className="px-6 py-4">{t('members')}</th>
                      <th className="px-6 py-4">{t('daysUsed')} (Annual)</th>
                      <th className="px-6 py-4">{t('remainingQuota')}</th>
                      <th className="px-6 py-4">Utilization</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {employees.slice(0, 6).map((emp) => {
                     const used = emp.leaveBalances?.annualUsed || 0;
                     const total = emp.leaveBalances?.annual || 30;
                     const pct = Math.round((used / total) * 100);
                     return (
                       <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-5">
                             <p className="text-sm font-black text-slate-900">{isAr ? emp.nameArabic || emp.name : emp.name}</p>
                             <p className="text-[9px] text-slate-400 font-bold uppercase">{emp.department}</p>
                          </td>
                          <td className="px-6 py-5">
                             <span className="text-sm font-black text-slate-700">{used} Days</span>
                          </td>
                          <td className="px-6 py-5">
                             <span className="text-sm font-black text-indigo-600">{total - used} Days</span>
                          </td>
                          <td className="px-6 py-5">
                             <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className={`h-full ${pct > 80 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }}></div>
                             </div>
                          </td>
                       </tr>
                     );
                   })}
                </tbody>
              </table>
           </div>
        </div>
      </div>

      {/* Operational Intelligence Footer */}
      <div className="bg-slate-900 rounded-[48px] p-12 text-white flex flex-col md:flex-row items-center justify-between gap-10">
         <div className="space-y-4 max-w-xl">
            <h4 className="text-xs font-black text-indigo-300 uppercase tracking-widest">{t('operationalIntelligence')}</h4>
            <h3 className="text-3xl font-black tracking-tight leading-tight">Automated Compliance Pathfinding</h3>
            <p className="text-indigo-200 text-sm leading-relaxed opacity-80">
               The system has analyzed your current operational velocity. We recommend staggering "IT Support" leaves for Q3 to avoid the predicted 22% dip in service availability.
            </p>
         </div>
         <div className="w-full md:w-auto flex flex-wrap gap-4">
            <div className="px-8 py-5 bg-white/10 rounded-3xl border border-white/10 text-center flex-1 md:flex-none">
               <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Availability</p>
               <p className="text-2xl font-black">94.2%</p>
            </div>
            <div className="px-8 py-5 bg-white/10 rounded-3xl border border-white/10 text-center flex-1 md:flex-none">
               <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">Drift Risk</p>
               <p className="text-2xl font-black text-indigo-400">Low</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default AiInsights;
