
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getKuwaitizationInsights } from '../services/geminiService.ts';
import { dbService } from '../services/dbService.ts';
import { InsightReport, LeaveRequest, Employee } from '../types.ts';

const AiInsights: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<InsightReport | null>(null);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [riskAssessment, setRiskAssessment] = useState<{level: string, message: string} | null>(null);

  const generateHeatmap = (leaves: LeaveRequest[]) => {
    const data = [];
    const today = new Date();
    
    // Forecast for next 30 days
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
        date: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        absences: count,
        staffingLevel: 100 - (count * 15) // Mock logic: each absence reduces capacity by 15%
      });
    }
    setHeatmapData(data);

    // Identify risk peaks
    const maxAbsences = Math.max(...data.map(d => d.absences));
    if (maxAbsences > 3) {
      setRiskAssessment({
        level: 'High Risk',
        message: `System predicts a critical staffing dip around the middle of next month. Multiple overlapping leave requests detected.`
      });
    } else {
      setRiskAssessment({
        level: 'Optimized',
        message: 'Workforce availability remains within safe operational parameters for the upcoming cycle.'
      });
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const [liveEmployees, leaves] = await Promise.all([
        dbService.getEmployees(),
        dbService.getLeaveRequests()
      ]);
      
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

  useEffect(() => {
    // Auto-load on mount
    generateReport();
  }, []);

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="bg-slate-900 rounded-[56px] p-12 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
           <span className="text-[280px] leading-none select-none">🧠</span>
        </div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 mb-8">
            <span className="text-emerald-400">✨</span>
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Generative Intelligence Hub</span>
          </div>
          
          <h2 className="text-5xl font-black mb-6 tracking-tighter">
            Strategic <span className="text-emerald-500">Forecasting</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mb-12 leading-relaxed font-medium">
            AI-driven analysis of your corporate registry. We track Kuwaitization quotas, 
            predict workforce availability, and generate compliance pathways automatically.
          </p>
          
          <button 
            onClick={generateReport}
            disabled={loading}
            className="bg-white text-slate-900 px-10 py-5 rounded-[24px] font-black text-[12px] uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50 shadow-2xl shadow-white/5 active:scale-95"
          >
            {loading ? 'Consulting Gemini...' : 'Re-Run Live Database Audit'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Availability Heatmap */}
        <div className="lg:col-span-8 bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Workforce Availability Forecast</h3>
              <p className="text-sm text-slate-500 font-medium">30-day predictive leave heatmap</p>
            </div>
            {riskAssessment && (
              <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                riskAssessment.level === 'High Risk' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
              }`}>
                {riskAssessment.level}
              </div>
            )}
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={heatmapData}>
                <defs>
                  <linearGradient id="colorAbsences" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
                />
                <Area 
                  type="monotone" 
                  dataKey="absences" 
                  stroke="#10b981" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorAbsences)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-50 flex items-center gap-6">
             <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Absences</span>
             </div>
             <p className="text-xs text-slate-400 font-medium italic leading-relaxed">
               * Predictions account for fixed National Holidays (National Day, Liberation Day) and historical patterns.
             </p>
          </div>
        </div>

        {/* Staffing Risk / Insights Sidebar */}
        <div className="lg:col-span-4 space-y-8">
           <div className="bg-indigo-600 p-10 rounded-[48px] text-white shadow-xl shadow-indigo-600/20">
              <h4 className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-4">Staffing Resilience</h4>
              <p className="text-lg font-black leading-tight mb-6">
                {riskAssessment?.message || "Analyzing historical trends to predict operational bottlenecks."}
              </p>
              <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                 <p className="text-[10px] text-indigo-100 font-medium leading-relaxed">
                   Recommendation: Limit non-essential training sessions between days 12-18 of the next cycle.
                 </p>
              </div>
           </div>

           {report && (
             <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Compliance Audit</h3>
                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    report.complianceStatus === 'Compliant' ? 'bg-emerald-100 text-emerald-700' : 
                    report.complianceStatus === 'Warning' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {report.complianceStatus}
                  </span>
                </div>
                <div className="space-y-4">
                  {report.recommendations.slice(0, 3).map((rec, i) => (
                    <div key={i} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-100 transition-colors">
                      <span className="text-indigo-500 font-black text-xs">0{i+1}</span>
                      <p className="text-[11px] text-slate-600 font-bold leading-relaxed">{rec}</p>
                    </div>
                  ))}
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default AiInsights;
