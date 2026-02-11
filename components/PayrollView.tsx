
import React, { useState, useEffect } from 'react';
import { User, PayrollRun, PayrollItem } from '../types.ts';
import { dbService as hrmDb } from '../services/dbService.ts';
import { useNotifications } from './NotificationSystem.tsx';
import { useTranslation } from 'react-i18next';

interface PayrollViewProps {
  user: User;
}

const PayslipCard: React.FC<{ item: PayrollItem; run: PayrollRun }> = ({ item, run }) => {
  const { t, i18n } = useTranslation();
  const monthNames = i18n.language === 'ar' 
    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const [year, monthStr] = run.period_key.split('-');
  const monthIndex = parseInt(monthStr) - 1;

  return (
    <div className="bg-white border-2 border-slate-100 rounded-[32px] p-8 shadow-sm relative overflow-hidden flex flex-col h-full">
      <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
      
      <div className="flex justify-between items-start mb-8">
        <div>
          <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Enterprise HR Solutions</h5>
          <h4 className="text-lg font-black text-slate-900 tracking-tight">{i18n.language === 'ar' ? 'قسيمة راتب رسمية' : 'Official Salary Slip'}</h4>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{i18n.language === 'ar' ? 'الفترة' : 'Period'}</p>
          <p className="text-sm font-bold text-slate-800">{monthNames[monthIndex]} {year}</p>
        </div>
      </div>

      <div className="bg-slate-50 rounded-2xl p-4 mb-6 flex items-center justify-between border border-slate-100">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{i18n.language === 'ar' ? 'اسم الموظف' : 'Employee Name'}</p>
          <p className="text-sm font-black text-slate-900">{item.employee_name}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">ID</p>
          <p className="text-xs font-bold text-slate-700">{item.employee_id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <div className="flex-1 space-y-4">
        <div>
          <h6 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1">{i18n.language === 'ar' ? 'المستحقات' : 'Earnings'}</h6>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600 font-medium">{i18n.language === 'ar' ? 'الراتب الأساسي' : 'Basic Salary'}</span>
            <span className="font-bold text-slate-900">{item.basic_salary.toLocaleString()} {t('currency')}</span>
          </div>
        </div>

        <div>
          <h6 className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-3 border-b border-rose-50 pb-1">{i18n.language === 'ar' ? 'الاستقطاعات' : 'Deductions'}</h6>
          <div className="space-y-2">
            {item.pifss_deduction > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">{i18n.language === 'ar' ? 'مساهمة التأمينات (١١.٥٪)' : 'PIFSS (11.5%)'}</span>
                <span className="font-bold text-rose-600">-{item.pifss_deduction.toFixed(2)} {t('currency')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-100">
        <div>
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">{t('netPayable')}</p>
          <p className="text-3xl font-black text-slate-900 tracking-tighter">
            {item.net_salary.toLocaleString()} <span className="text-sm">{t('currency')}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

const PayrollView: React.FC<PayrollViewProps> = ({ user }) => {
  const { t, i18n } = useTranslation();
  const { notify, confirm } = useNotifications();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [activeRun, setActiveRun] = useState<PayrollRun | null>(null);
  const [items, setItems] = useState<PayrollItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [verifiedItems, setVerifiedItems] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'Audit' | 'Payslips'>('Audit');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const months = i18n.language === 'ar' 
    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const [filter, setFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    cycle: 'Monthly' as 'Monthly' | 'Bi-Weekly'
  });

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const data = await hrmDb.getPayrollRuns();
      setRuns(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleGenerateDraft = async () => {
    setProcessing(true);
    const periodKey = `${filter.year}-${String(filter.month).padStart(2, '0')}-${filter.cycle.toUpperCase()}`;
    try {
      const run = await hrmDb.generatePayrollDraft(periodKey, filter.cycle);
      setActiveRun(run);
      setViewMode('Audit');
      const payrollItems = await hrmDb.getPayrollItems(run.id);
      setItems(payrollItems);
      setCurrentPage(1);
      
      const verificationMap: Record<string, boolean> = {};
      payrollItems.forEach(i => verificationMap[i.id] = false);
      setVerifiedItems(verificationMap);

      notify(t('success'), `${t('auditTable')} : ${periodKey}`, "success");
      fetchRuns();
    } catch (err: any) {
      notify(t('critical'), t('unknown'), "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleSelectRun = async (run: PayrollRun) => {
    setLoading(true);
    setActiveRun(run);
    setViewMode('Audit');
    setCurrentPage(1);
    try {
      const payrollItems = await hrmDb.getPayrollItems(run.id);
      setItems(payrollItems);
      const verificationMap: Record<string, boolean> = {};
      payrollItems.forEach(i => verificationMap[i.id] = i.verified_by_hr);
      setVerifiedItems(verificationMap);
    } catch (err: any) {
      notify(t('critical'), t('unknown'), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = () => {
    if (!activeRun) return;
    confirm({
      title: i18n.language === 'ar' ? 'تأكيد الصرف المالي؟' : 'Commit Financial Period?',
      message: `${t('officialRecord')} : ${activeRun.period_key}`,
      confirmText: t('authorize'),
      onConfirm: async () => {
        setProcessing(true);
        try {
          await hrmDb.finalizePayrollRun(activeRun.id, user);
          await fetchRuns();
          setActiveRun({ ...activeRun, status: 'Finalized' });
          notify(t('success'), t('officialRecord'), "success");
        } catch (err: any) {
          notify(t('critical'), t('unknown'), "error");
        } finally {
          setProcessing(false);
        }
      }
    });
  };

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const paginatedData = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-80 space-y-6">
          <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{t('executionConfig')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[8px] font-black text-slate-500 uppercase mb-2">{i18n.language === 'ar' ? 'نوع الدورة' : 'Cycle Architecture'}</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 rounded-xl">
                  <button onClick={() => setFilter({ ...filter, cycle: 'Monthly' })} className={`py-2 text-[10px] font-bold rounded-lg transition-all ${filter.cycle === 'Monthly' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400'}`}>{i18n.language === 'ar' ? 'شهري' : 'Monthly'}</button>
                  <button onClick={() => setFilter({ ...filter, cycle: 'Bi-Weekly' })} className={`py-2 text-[10px] font-bold rounded-lg transition-all ${filter.cycle === 'Bi-Weekly' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400'}`}>{i18n.language === 'ar' ? 'أسبوعين' : 'Bi-Weekly'}</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" value={filter.month} onChange={e => setFilter({ ...filter, month: parseInt(e.target.value) })}>
                  {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold" value={filter.year} onChange={e => setFilter({ ...filter, year: parseInt(e.target.value) })}>
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                </select>
              </div>
              <button onClick={handleGenerateDraft} disabled={processing} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest active:scale-95 disabled:opacity-50">{processing ? '...' : t('runAiAudit')}</button>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-8 min-w-0">
          {!activeRun ? (
            <div className="bg-white rounded-[40px] border border-slate-200 h-[600px] flex flex-col items-center justify-center text-center p-20 grayscale opacity-40">
               <span className="text-8xl mb-6">💳</span>
               <h3 className="text-2xl font-black text-slate-800 tracking-tight">{t('reconciliationHub')}</h3>
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-400">
               <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{activeRun.period_key}</h3>
                    <p className="text-xs text-slate-500 font-medium">{activeRun.total_disbursement.toLocaleString()} {t('currency')}</p>
                  </div>
                  
                  <div className="flex p-1 bg-slate-100 rounded-2xl">
                    <button onClick={() => setViewMode('Audit')} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${viewMode === 'Audit' ? 'bg-white text-slate-900' : 'text-slate-400'}`}>{t('auditTable')}</button>
                    <button onClick={() => setViewMode('Payslips')} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${viewMode === 'Payslips' ? 'bg-white text-slate-900' : 'text-slate-400'}`}>{t('batchPayslips')}</button>
                  </div>
               </div>

               {viewMode === 'Audit' ? (
                 <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                      <h4 className="font-bold text-slate-800">{t('calculationAuditTable')}</h4>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span className="text-[10px] font-black text-rose-500 uppercase">{t('highVariance')}</span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <tr>
                            <th className="px-8 py-5">#</th>
                            <th className="px-8 py-5">{t('members')}</th>
                            <th className="px-8 py-5">{t('salary')}</th>
                            <th className="px-8 py-5">{i18n.language === 'ar' ? 'الاستقطاعات' : 'Deductions'}</th>
                            <th className="px-8 py-5">PIFSS (11.5%)</th>
                            <th className="px-8 py-5">{t('netPayable')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedData.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50/50">
                              <td className="px-8 py-5 text-xs text-slate-300">✓</td>
                              <td className="px-8 py-5 font-bold text-slate-900">{item.employee_name}</td>
                              <td className="px-8 py-5 text-sm font-black">{item.basic_salary.toLocaleString()}</td>
                              <td className="px-8 py-5 text-rose-600">-{item.deductions.toLocaleString()}</td>
                              <td className="px-8 py-5 text-slate-400">-{item.pifss_deduction.toFixed(2)}</td>
                              <td className="px-8 py-5 font-black text-emerald-700">{item.net_salary.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {paginatedData.map(item => (
                      <PayslipCard key={item.id} item={item} run={activeRun} />
                    ))}
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayrollView;
