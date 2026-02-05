
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService.ts';
import { useNotifications } from './NotificationSystem.tsx';
import { Employee, PublicHoliday, PayrollRun } from '../types.ts';

const ComplianceView: React.FC = () => {
  const { notify } = useNotifications();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [emps, runs] = await Promise.all([
        dbService.getEmployees(),
        dbService.getPayrollRuns()
      ]);
      setEmployees(emps);
      setPayrollRuns(runs);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleExportWPS = async (runId: string) => {
    try {
      const csv = await dbService.exportWPS(runId);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `KUW_WPS_${runId.slice(0, 8)}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      notify("WPS Dispatched", "CSV file generated for Central Bank submission.", "success");
    } catch (err) {
      notify("Export Error", "Communication failure with registry.", "error");
    }
  };

  const calculateDaysRemaining = (expiryDate?: string) => {
    if (!expiryDate) return Infinity;
    const today = new Date();
    const expiry = new Date(expiryDate);
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getExpiryStatus = (days: number) => {
    if (days < 0) return { label: 'Expired', color: 'bg-rose-500 text-white shadow-rose-200', icon: '🚨' };
    if (days <= 30) return { label: `${days}d Remaining`, color: 'bg-orange-500 text-white shadow-orange-200', icon: '⚠️' };
    if (days <= 90) return { label: 'Warning Threshold', color: 'bg-amber-400 text-amber-900 shadow-amber-100', icon: '⏳' };
    return { label: 'Compliant', color: 'bg-emerald-500 text-white shadow-emerald-200', icon: '✅' };
  };

  const expiringDocs = employees.flatMap(emp => {
    const docs = [];
    if (emp.civilIdExpiry) docs.push({ emp, type: 'Civil ID', expiry: emp.civilIdExpiry, days: calculateDaysRemaining(emp.civilIdExpiry) });
    if (emp.passportExpiry) docs.push({ emp, type: 'Passport', expiry: emp.passportExpiry, days: calculateDaysRemaining(emp.passportExpiry) });
    if (emp.iznAmalExpiry) docs.push({ emp, type: 'Izn Amal', expiry: emp.iznAmalExpiry, days: calculateDaysRemaining(emp.iznAmalExpiry) });
    return docs;
  }).sort((a, b) => a.days - b.days);

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-24">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Compliance & Government Filings</h2>
          <p className="text-slate-500 font-medium text-lg mt-1">Registry integrity for Kuwait labor regulations.</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="bg-white px-6 py-4 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Portal API: Operational</span>
           </div>
        </div>
      </header>

      {/* WPS Exporter Section */}
      <section className="bg-white rounded-[56px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <span className="p-2.5 bg-emerald-50 rounded-2xl text-emerald-600 text-lg">💰</span>
              WPS Wage Protection Engine
            </h3>
          </div>
          <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] bg-white border border-slate-100 px-4 py-2 rounded-xl">
            Auto-format for Kuwait Banks
          </div>
        </div>
        
        <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {payrollRuns.filter(r => r.status === 'Finalized').slice(0, 6).map(run => (
            <div key={run.id} className="group p-8 bg-slate-50 hover:bg-white hover:ring-2 hover:ring-emerald-500/10 rounded-[40px] border border-slate-100 transition-all duration-300">
               <div className="flex justify-between items-start mb-8">
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fiscal Period</p>
                   <p className="text-xl font-black text-slate-900">{run.period_key}</p>
                 </div>
                 <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-lg">✓</div>
               </div>
               <button 
                 onClick={() => handleExportWPS(run.id)}
                 className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all active:scale-[0.98] shadow-xl shadow-slate-900/10 group-hover:bg-emerald-600 group-hover:shadow-emerald-600/20"
               >
                 Export Bank Statement
               </button>
            </div>
          ))}
          {payrollRuns.filter(r => r.status === 'Finalized').length === 0 && (
             <div className="col-span-full p-20 text-center border-2 border-dashed border-slate-100 rounded-[40px]">
                <p className="text-slate-400 font-medium italic">No finalized cycles available for WPS generation.</p>
             </div>
          )}
        </div>
      </section>

      {/* Expiry Table Section */}
      <section className="bg-white rounded-[56px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-10 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <span className="p-2.5 bg-indigo-50 rounded-2xl text-indigo-600 text-lg">🪪</span>
              Document Integrity Radar
            </h3>
          </div>
          <span className="text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 px-5 py-2 rounded-2xl">
            Critical Threshold: 90 Days
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                <th className="px-10 py-8">Workforce Member (En/Ar)</th>
                <th className="px-10 py-8">Identity / Document</th>
                <th className="px-10 py-8">Valid Until</th>
                <th className="px-10 py-8">Status</th>
                <th className="px-10 py-8 text-right">Protocol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="p-32 text-center animate-pulse text-slate-300 font-black uppercase tracking-widest">Scanning Document Registry...</td></tr>
              ) : expiringDocs.length > 0 ? (
                expiringDocs.map((doc, i) => {
                  const status = getExpiryStatus(doc.days);
                  return (
                    <tr key={`${doc.emp.id}-${doc.type}`} className={`group hover:bg-slate-50/50 transition-colors ${doc.days < 0 ? 'bg-rose-50/10' : ''}`}>
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-2xl ${doc.days < 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'} flex items-center justify-center font-black text-sm border border-slate-200 transition-transform group-hover:scale-110`}>
                            {doc.emp.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-base font-black text-slate-900 leading-none mb-1.5">{doc.emp.name}</p>
                            <p className="text-[14px] text-slate-400 font-bold" dir="rtl">{doc.emp.nameArabic || '---'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <span className="text-[11px] font-black uppercase text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg tracking-wider">{doc.type}</span>
                      </td>
                      <td className="px-10 py-8">
                        <p className="font-mono text-sm font-black text-slate-600">{doc.expiry}</p>
                      </td>
                      <td className="px-10 py-8">
                        <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${status.color}`}>
                          <span>{status.icon}</span>
                          {status.label}
                        </div>
                      </td>
                      <td className="px-10 py-8 text-right">
                        <button 
                          className="px-6 py-2.5 bg-white border border-slate-200 hover:border-emerald-200 hover:text-emerald-600 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                        >
                          Send Renew Notice
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={5} className="p-32 text-center text-slate-300 font-medium italic">All workforce documents are currently verified and valid.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default ComplianceView;
