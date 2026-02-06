
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
      const res = await dbService.calculateFinalSettlement(selectedId, endDate, reason);
      setResult(res);
      notify(t('scanComplete'), t('scanComplete'), "success");
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
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Input Sidebar */}
        <div className="lg:w-96 space-y-6">
          <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{t('exitConfig')}</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[8px] font-black text-slate-500 uppercase mb-2 ps-1">{t('targetEmployee')}</label>
                <select 
                  className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800"
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
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[8px] font-black text-slate-500 uppercase mb-1 ps-1">{t('reasonSeparation')}</label>
                  <select 
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold"
                    value={reason}
                    onChange={e => setReason(e.target.value as any)}
                  >
                    <option value="Resignation">{t('resignation')}</option>
                    <option value="Termination">{t('termination')}</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={handleCalculate}
                disabled={!selectedId || loading}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? '...' : t('executeSettlement')}
              </button>
            </div>
          </div>
        </div>

        {/* Result Statement */}
        <div className="flex-1">
          {!result ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-[50px] h-[600px] flex flex-col items-center justify-center text-center p-20 grayscale opacity-40">
               <span className="text-8xl mb-6">📜</span>
               <h3 className="text-xl font-black text-slate-800 tracking-tight">{t('statementPreview')}</h3>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-[50px] border border-slate-200 shadow-xl relative overflow-hidden animate-in zoom-in-95 duration-300">
               <div className="absolute top-0 end-0 p-12 opacity-5 pointer-events-none">
                  <span className="text-[180px] leading-none">🇰🇼</span>
               </div>

               <div className="flex justify-between items-start mb-16 relative z-10">
                 <div>
                   <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t('settlement')}</h2>
                   <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{t('officialRecord')}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-sm font-bold text-slate-400">{dateFormatter.format(new Date())}</p>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-10 mb-16 relative z-10">
                 <div>
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">{t('identifier')}</h4>
                   <div className="space-y-2">
                     <p className="text-lg font-black text-slate-900">{i18n.language === 'ar' ? selectedEmp?.nameArabic || selectedEmp?.name : selectedEmp?.name}</p>
                     <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedEmp?.position} • {selectedEmp?.department}</p>
                   </div>
                 </div>
                 <div>
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">{t('totalTenure')}</h4>
                   <div className="space-y-2">
                     <div className="flex justify-between text-sm font-black pt-2">
                       <span className="text-emerald-600 uppercase tracking-widest text-[10px]">{t('totalTenure')}</span>
                       <span className="text-slate-900">{result.tenureYears}y {result.tenureMonths}m {result.tenureDays}d</span>
                     </div>
                   </div>
                 </div>
               </div>

               <div className="bg-slate-50 rounded-[32px] p-8 mb-10 border border-slate-100 relative z-10">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-200 pb-2">{t('indemnityAudit')}</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">{t('dailyRate')}</span>
                        <span className="font-bold text-slate-900">{result.dailyRate.toLocaleString(locale)} {t('currency')}</span>
                      </div>
                    </div>
                  </div>
               </div>

               <div className="space-y-6 relative z-10">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">{t('disbursement')}</h4>
                 <div className="mt-12 p-10 bg-slate-900 rounded-[40px] flex items-center justify-between text-white shadow-2xl">
                    <div>
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-2">{t('netPayable')}</p>
                      <h3 className="text-5xl font-black tracking-tighter">
                        {result.totalSettlement.toLocaleString(locale)} <span className="text-xl">{t('currency')}</span>
                      </h3>
                    </div>
                 </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettlementView;
