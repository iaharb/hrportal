
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService.ts';
import { Employee, SettlementResult } from '../types.ts';
import { useNotifications } from './NotificationSystem.tsx';
import { useTranslation } from 'react-i18next';

const SettlementView: React.FC = () => {
  const { notify } = useNotifications();
  const { t, i18n } = useTranslation();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [reason, setReason] = useState<'Resignation' | 'Termination'>('Resignation');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [unpaidDays, setUnpaidDays] = useState(0);
  const [result, setResult] = useState<SettlementResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const emps = await dbService.getEmployees();
      setEmployees(emps);
    };
    fetch();
  }, []);

  const handleCalculate = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const res = await dbService.calculateFinalSettlement(selectedId, endDate, reason, unpaidDays);
      setResult(res);
      notify(t('success'), "Settlement calculated per Kuwait Labor Law (2010).", "success");
    } catch (err: any) {
      notify("Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const selectedEmp = employees.find(e => e.id === selectedId);
  const locale = i18n.language === 'ar' ? 'ar-KW' : 'en-KW';
  const dateFormatter = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 text-start">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Input Sidebar */}
        <div className="lg:w-96 space-y-6">
          <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{t('exitConfig')}</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[8px] font-black text-slate-500 uppercase mb-2 ps-1">{t('targetEmployee')}</label>
                <select 
                  className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800"
                  value={selectedId}
                  onChange={e => setSelectedId(e.target.value)}
                >
                  <option value="">{t('searchPlaceholder')}</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{i18n.language === 'ar' ? e.nameArabic || e.name : e.name} ({e.department})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[8px] font-black text-slate-500 uppercase mb-1 ps-1">{t('effectiveLastDay')}</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[8px] font-black text-slate-500 uppercase mb-1 ps-1">{t('reasonSeparation')}</label>
                  <select 
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={reason}
                    onChange={e => setReason(e.target.value as any)}
                  >
                    <option value="Resignation">{t('resignation')}</option>
                    <option value="Termination">{t('termination')}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                 <label className="block text-[8px] font-black text-slate-500 uppercase mb-1 ps-1">Manual Tenure Deduction (Days)</label>
                 <input 
                    type="number" 
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    value={unpaidDays}
                    onChange={e => setUnpaidDays(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                 <p className="text-[8px] text-slate-400 italic mt-1">Registry-detected absences are added to this value automatically.</p>
              </div>

              <button 
                onClick={handleCalculate}
                disabled={!selectedId || loading}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? '...' : t('executeSettlement')}
              </button>
            </div>
          </div>

          <div className="bg-amber-50 p-6 rounded-[32px] border border-amber-200 space-y-3">
             <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-amber-500"></span>
               Article 53 Multipliers
             </h4>
             <ul className="text-[10px] text-amber-700 space-y-1 font-bold">
               <li className="flex justify-between"><span>&lt; 3 Years:</span> <span>0%</span></li>
               <li className="flex justify-between"><span>3 - 5 Years:</span> <span>50%</span></li>
               <li className="flex justify-between"><span>5 - 10 Years:</span> <span>2/3 (66.6%)</span></li>
               <li className="flex justify-between"><span>&gt; 10 Years:</span> <span>100%</span></li>
             </ul>
             <p className="text-[8px] text-amber-600 mt-2 italic font-medium leading-relaxed">
               Note: Graduation scale applies only to calculated indemnity. Leave cash-out is protected @ 100%.
             </p>
          </div>
        </div>

        {/* Result Statement */}
        <div className="flex-1 min-w-0">
          {!result ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-[50px] h-[600px] flex flex-col items-center justify-center text-center p-20 grayscale opacity-40">
               <span className="text-8xl mb-6">📜</span>
               <h3 className="text-xl font-black text-slate-800 tracking-tight">{t('statementPreview')}</h3>
               <p className="text-slate-400 mt-2">Select an employee to generate a high-precision legal settlement statement.</p>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-[50px] border border-slate-200 shadow-xl relative overflow-hidden animate-in zoom-in-95 duration-300">
               <div className="absolute top-0 end-0 p-12 opacity-5 pointer-events-none">
                  <span className="text-[180px] leading-none select-none">🇰🇼</span>
               </div>

               <div className="flex justify-between items-start mb-16 relative z-10">
                 <div>
                   <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t('settlement')}</h2>
                   <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{t('officialRecord')}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-sm font-bold text-slate-400">{dateFormatter.format(new Date())}</p>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16 relative z-10">
                 <div>
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">{t('identifier')}</h4>
                   <div className="space-y-2">
                     <p className="text-lg font-black text-slate-900">{i18n.language === 'ar' ? selectedEmp?.nameArabic || selectedEmp?.name : selectedEmp?.name}</p>
                     <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedEmp?.position} • {selectedEmp?.department}</p>
                     <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded w-fit border border-indigo-100">Reason: {reason}</p>
                   </div>
                 </div>
                 <div>
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">{t('totalTenure')}</h4>
                   <div className="space-y-2">
                     <div className="flex justify-between text-sm font-black pt-2">
                       <span className="text-slate-400 uppercase tracking-widest text-[10px]">Net Service (Accounting):</span>
                       <span className="text-slate-900">{result.tenureYears}y {result.tenureMonths}m {result.tenureDays}d</span>
                     </div>
                     <div className="flex justify-between text-sm font-black pt-1">
                       <span className="text-slate-400 uppercase tracking-widest text-[10px]">Total Billable Days:</span>
                       <span className="text-slate-900">{result.totalServiceDays} days</span>
                     </div>
                     {result.breakdown.unpaidDaysDeducted > 0 && (
                        <div className="flex justify-between text-xs font-bold pt-1">
                          <span className="text-rose-400 uppercase tracking-widest text-[10px]">Attendance Absences:</span>
                          <span className="text-rose-500">-{result.breakdown.unpaidDaysDeducted} days</span>
                        </div>
                     )}
                   </div>
                 </div>
               </div>

               <div className="bg-slate-50 rounded-[32px] p-8 mb-10 border border-slate-200 relative z-10">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-200 pb-2">Indemnity Audit (Articles 51 & 55)</h4>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Remuneration Basis (Basic + Allowances):</span>
                      <span className="font-bold text-slate-900">{result.remuneration.toLocaleString(locale, { minimumFractionDigits: 3 })} {t('currency')}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Daily Rate Calculation ({result.remuneration.toLocaleString()} / 26):</span>
                      <span className="font-bold text-slate-900">{result.dailyRate.toLocaleString(locale, { minimumFractionDigits: 3 })} {t('currency')}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-200">
                      <div className="space-y-2">
                         <p className="text-[10px] font-black text-slate-400 uppercase">Tier 1: Years 1 - 5 (15 days/yr)</p>
                         <p className="text-[9px] font-mono text-slate-400">{result.dailyRate.toLocaleString()} * 15 * {Math.min(5, result.totalServiceDays/365).toFixed(4)}</p>
                         <p className="text-sm font-black text-slate-700">{result.breakdown.firstFiveYearAmount.toLocaleString(locale, { minimumFractionDigits: 3 })} {t('currency')}</p>
                      </div>
                      <div className="space-y-2">
                         <p className="text-[10px] font-black text-slate-400 uppercase">Tier 2: Beyond 5 Years (30 days/yr)</p>
                         <p className="text-[9px] font-mono text-slate-400">{result.dailyRate.toLocaleString()} * 30 * {Math.max(0, result.totalServiceDays/365 - 5).toFixed(4)}</p>
                         <p className="text-sm font-black text-slate-700">{result.breakdown.subsequentYearAmount.toLocaleString(locale, { minimumFractionDigits: 3 })} {t('currency')}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-slate-200 text-xs">
                      <span className="text-slate-500 font-medium">Gross Calculated Indemnity:</span>
                      <span className="font-bold text-slate-900">{result.breakdown.baseIndemnity.toLocaleString(locale, { minimumFractionDigits: 3 })} {t('currency')}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-indigo-600 font-black">Article 53 Multiplier Applied:</span>
                      <span className="font-black text-indigo-600">{(result.breakdown.multiplierApplied * 100).toFixed(1)}%</span>
                    </div>
                  </div>
               </div>

               <div className="space-y-6 relative z-10">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">{t('disbursement')}</h4>
                 <div className="space-y-3">
                   <div className="flex justify-between text-sm">
                     <span className="text-slate-500">Net End of Service Indemnity:</span>
                     <div className="text-right">
                        <span className="font-black">{result.indemnityAmount.toLocaleString(locale, { minimumFractionDigits: 3 })} {t('currency')}</span>
                        {result.breakdown.isCapped && (
                           <p className="text-[8px] font-black text-rose-500 uppercase">⚠️ Legal Cap: Max 1.5 Years Salary Applied</p>
                        )}
                     </div>
                   </div>
                   <div className="flex justify-between text-sm">
                     <span className="text-slate-500">Unused Leave Encasement (Art 70: {result.breakdown.leaveDaysEncashed} days):</span>
                     <span className="font-black">{result.leavePayout.toLocaleString(locale, { minimumFractionDigits: 3 })} {t('currency')}</span>
                   </div>
                 </div>

                 <div className="mt-12 p-10 bg-slate-900 rounded-[40px] flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="text-start">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">{t('netPayable')}</p>
                      <p className="text-5xl font-black text-white">{result.totalSettlement.toLocaleString(locale, { minimumFractionDigits: 3 })} <span className="text-xl">{t('currency')}</span></p>
                    </div>
                    <button 
                      onClick={() => window.print()}
                      className="px-10 py-5 bg-white text-slate-900 rounded-[24px] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all hover:bg-indigo-50"
                    >
                      {i18n.language === 'ar' ? 'طباعة البيان الرسمي' : 'Print Official Statement'}
                    </button>
                 </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* Added comment above fix */
/* Fix: Added missing export default for SettlementView component to resolve import error in App.tsx */
export default SettlementView;
