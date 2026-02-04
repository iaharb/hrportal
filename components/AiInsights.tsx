
import React, { useState } from 'react';
import { getKuwaitizationInsights } from '../services/geminiService.ts';
import { dbService } from '../services/dbService.ts';
import { InsightReport } from '../types.ts';

const AiInsights: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<InsightReport | null>(null);

  const generateReport = async () => {
    setLoading(true);
    try {
      const liveEmployees = await dbService.getEmployees();
      const dataStr = JSON.stringify(liveEmployees.map(e => ({
        name: e.name,
        nat: e.nationality,
        dept: e.department,
        pos: e.position
      })));
      
      const result = await getKuwaitizationInsights(dataStr);
      setReport(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-10 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
            <span className="p-2 bg-white/20 rounded-xl">✨</span>
            Live Database AI Insights
          </h2>
          <p className="text-emerald-50 max-w-xl mb-8 leading-relaxed">
            Google Gemini will analyze your current Supabase records against Kuwaitization quotas to provide real-time strategic hiring paths.
          </p>
          <button 
            onClick={generateReport}
            disabled={loading}
            className="bg-white text-emerald-700 px-8 py-3 rounded-xl font-bold hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? 'Processing Database...' : 'Run Live Analysis'}
          </button>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <span className="text-[200px] leading-none">🧠</span>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 animate-pulse">Syncing with database & consulting Gemini...</p>
        </div>
      )}

      {report && !loading && (
        <div className="grid gap-6 animate-in slide-in-from-top-4 duration-700">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800">Compliance Audit</h3>
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${
                report.complianceStatus === 'Compliant' ? 'bg-emerald-100 text-emerald-700' : 
                report.complianceStatus === 'Warning' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {report.complianceStatus}
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed mb-8">
              {report.summary}
            </p>
            
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="text-emerald-500">🎯</span> 
              Database-Driven Recommendations
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.recommendations.map((rec, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 flex gap-3">
                  <span className="font-bold text-emerald-600">0{i+1}.</span>
                  {rec}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiInsights;
