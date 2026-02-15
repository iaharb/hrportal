
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
  
  const periodKey = run?.periodKey || '';
  const [year, monthStr] = periodKey.split('-');
  const monthIndex = monthStr ? (parseInt(monthStr) - 1) : 0;

  const formatVal = (val: any) => (Number(val) || 0).toLocaleString();
  const formatFixed = (val: any) => (Number(val) || 0).toFixed(2);

  return (
    <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm relative overflow-hidden flex flex-col h-full text-start">
      <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
      
      <div className="flex justify-between items-start mb-8">
        <div>
          <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Enterprise HR Solutions</h5>
          <h4 className="text-lg font-black text-slate-900 tracking-tight">{i18n.language === 'ar' ? 'قسيمة راتب رسمية' : 'Official Salary Slip'}</h4>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{i18n.language === 'ar' ? 'الفترة' : 'Period'}</p>
          <p className="text-sm font-bold text-slate-800">{monthNames[monthIndex] || '---'} {year || '---'}</p>
        </div>
      </div>

      <div className="bg-slate-50 rounded-2xl p-4 mb-6 flex items-center justify-between border border-slate-200">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{i18n.language === 'ar' ? 'اسم الموظف' : 'Employee Name'}</p>
          <p className="text-sm font-black text-slate-900">{item.employeeName || 'Unknown'}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">ID</p>
          <p className="text-xs font-bold text-slate-700">{(item.employeeId || '').slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <div className="flex-1 space-y-6">
        <div>
          <h6 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1">{i18n.language === 'ar' ? 'المستحقات' : 'Earnings'}</h6>
          <div className="space-y-2 text-sm font-medium">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">{i18n.language === 'ar' ? 'الراتب الأساسي' : 'Basic Salary'}</span>
              <span className="font-bold text-slate-900">{formatVal(item.basicSalary)} {t('currency')}</span>
            </div>
            {(Number(item.housingAllowance) > 0) && (
              <div className="flex justify-between items-center">
                <span className="text-slate-600">{i18n.language === 'ar' ? 'بدل سكن' : 'Housing Allowance'}</span>
                <span className="font-bold text-slate-900">{formatVal(item.housingAllowance)} {t('currency')}</span>
              </div>
            )}
            {(Number(item.otherAllowances) > 0) && (
              <div className="flex justify-between items-center">
                <span className="text-slate-600">{i18n.language === 'ar' ? 'بدلات أخرى' : 'Other Allowances'}</span>
                <span className="font-bold text-slate-900">{formatVal(item.otherAllowances)} {t('currency')}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <h6 className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-3 border-b border-rose-100 pb-1">{i18n.language === 'ar' ? 'الاستقطاعات' : 'Deductions'}</h6>
          <div className="space-y-2 text-sm">
            {(Number(item.pifssDeduction) > 0) && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{i18n.language === 'ar' ? 'مساهمة التأمينات (١١.٥٪)' : 'PIFSS Contribution'}</span>
                <span className="font-bold text-rose-600">-{formatFixed(item.pifssDeduction)} {t('currency')}</span>
              </div>
            )}
            {(Number(item.leaveDeductions) > 0) && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{i18n.language === 'ar' ? 'خصم إجازة (بدلات)' : 'Leave Deduction (Allowances)'}</span>
                <span className="font-bold text-rose-600">-{formatFixed(item.leaveDeductions)} {t('currency')}</span>
              </div>
            )}
            {(Number(item.shortPermissionDeductions) > 0) && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{i18n.language === 'ar' ? 'أذونات خروج (زائد)' : 'Excess Permissions'}</span>
                <span className="font-bold text-rose-600">-{formatFixed(item.shortPermissionDeductions)} {t('currency')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-200">
        <div>
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">{t('netPayable')}</p>
          <p className="text-3xl font-black text-slate-900 tracking-tighter">
            {formatVal(item.netSalary)} <span className="text-sm">{t('currency')}</span>
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
      setRuns(data || []);
    } catch (err) {
      console.error(err);
      setRuns([]);
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
      setItems(payrollItems || []);
      setCurrentPage(1);
      notify(t('success'), `${t('auditTable')} : ${periodKey}`, "success");
      fetchRuns();
    } catch (err: any) {
      notify(t('critical'), err.message || t('unknown'), "error");
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
      setItems(payrollItems || []);
    } catch (err: any) {
      notify(t('critical'), err.message || t('unknown'), "error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = () => {
    if (!activeRun) return;
    confirm({
      title: i18n.language === 'ar' ? 'تأكيد الصرف المالي؟' : 'Commit Financial Period?',
      message: `${t('officialRecord')} : ${activeRun.periodKey}`,
      confirmText: t('authorize'),
      onConfirm: async () => {
        setProcessing(true);
        try {
          await hrmDb.finalizePayrollRun(activeRun.id, user);
          await fetchRuns();
          setActiveRun({ ...activeRun, status: 'Finalized' });
          notify(t('success'), t('officialRecord'), "success");
        } catch (err: any) {
          notify(t('critical'), err.message || t('unknown'), "error");
        } finally {
          setProcessing(false);
        }
      }
    });
  };

  const safeItems = Array.isArray(items) ? items : [];
  const totalPages = Math.ceil(safeItems.length / itemsPerPage);
  const paginatedData = safeItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatCurrency = (val: any) => (Number(val) || 0).toLocaleString();
  const formatFixed = (val: any) => (Number(val) || 0).toFixed(2);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-80 space-y-6 text-start">
          <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{t('executionConfig')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[8px] font-black text-slate-500 uppercase mb-2">{i18n.language === 'ar' ? 'نوع الدورة' : 'Cycle Architecture'}</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 rounded-xl border border-slate-200">
                  <button onClick={() => setFilter({ ...filter, cycle: 'Monthly' })} className={`py-2 text-[10px] font-bold rounded-lg transition-all ${filter.cycle === 'Monthly' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-400'}`}>{i18n.language === 'ar' ? 'شهري' : 'Monthly'}</button>
                  <button onClick={() => setFilter({ ...filter, cycle: 'Bi-Weekly' })} className={`py-2 text-[10px] font-bold rounded-lg transition-all ${filter.cycle === 'Bi-Weekly' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-400'}`}>{i18n.language === 'ar' ? 'أسبوعين' : 'Bi-Weekly'}</button>
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
              <button onClick={handleGenerateDraft} disabled={processing} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 disabled:opacity-50 transition-all hover:bg-indigo-700">{processing ? '...' : t('runAiAudit')}</button>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Historical Runs</h4>
             <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {runs.length > 0 ? runs.map(run => (
                  <button 
                    key={run.id} 
                    onClick={() => handleSelectRun(run)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${activeRun?.id === run.id ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                  >
                     <p className="text-xs font-black">{run.periodKey}</p>
                     <p className="text-[9px] opacity-60 uppercase font-bold mt-1">{run.status}</p>
                  </button>
                )) : (
                  <p className="text-xs text-slate-300 italic text-center py-4">No history found</p>
                )}
             </div>
          </div>

          <div className="bg-slate-950 p-8 rounded-[40px] text-white space-y-4 border border-white/5">
             <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">PIFSS & Policy Engine</h4>
             <p className="text-[11px] leading-relaxed opacity-80 text-slate-400">
               {i18n.language === 'ar' 
                 ? 'يتم حساب حصة الموظف (١١.٥٪) وحصة صاحب العمل آلياً وفقاً لقانون التأمينات الاجتماعية.'
                 : 'Employee share (11.5%) and Employer share are automatically calculated per PIFSS regulations.'}
             </p>
          </div>
        </div>

        <div className="flex-1 space-y-8 min-w-0">
          {!activeRun ? (
            <div className="bg-white rounded-[40px] border border-slate-200 h-[600px] flex flex-col items-center justify-center text-center p-20 grayscale opacity-40">
               <span className="text-8xl mb-6">💳</span>
               <h3 className="text-2xl font-black text-slate-800 tracking-tight">{t('reconciliationHub')}</h3>
               <p className="text-slate-400 text-sm mt-4">Select or generate a payroll cycle to begin audit.</p>
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-400">
               <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 text-start">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{activeRun.periodKey}</h3>
                    <p className="text-xs text-slate-500 font-medium">{formatCurrency(activeRun.totalDisbursement)} {t('currency')}</p>
                  </div>
                  
                  <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
                    <button onClick={() => setViewMode('Audit')} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${viewMode === 'Audit' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400'}`}>{t('auditTable')}</button>
                    <button onClick={() => setViewMode('Payslips')} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${viewMode === 'Payslips' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400'}`}>{t('batchPayslips')}</button>
                  </div>

                  {activeRun.status === 'Draft' && (
                    <button onClick={handleFinalize} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
                       {t('authorize')}
                    </button>
                  )}
               </div>

               {viewMode === 'Audit' ? (
                 <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center text-start">
                      <h4 className="font-bold text-slate-800">{t('calculationAuditTable')}</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-start">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                          <tr>
                            <th className="px-8 py-5">{t('members')}</th>
                            <th className="px-8 py-5">{t('salary')} (Basic)</th>
                            <th className="px-8 py-5">Allowances</th>
                            <th className="px-8 py-5">Deductions</th>
                            <th className="px-8 py-5">PIFSS (Emp/Co)</th>
                            <th className="px-8 py-5">{t('netPayable')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedData.length > 0 ? paginatedData.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50/50 group text-start transition-colors">
                              <td className="px-8 py-5">
                                <p className="font-bold text-slate-900">{item.employeeName || '---'}</p>
                                <p className="text-[9px] text-slate-400 uppercase">ID: {(item.employeeId || '').slice(0, 5)}</p>
                              </td>
                              <td className="px-8 py-5 text-sm font-black">{formatCurrency(item.basicSalary)}</td>
                              <td className="px-8 py-5">
                                 <p className="text-xs font-bold text-slate-700">{formatCurrency(Number(item.housingAllowance || 0) + Number(item.otherAllowances || 0))}</p>
                                 <p className="text-[8px] text-slate-400 uppercase">H: {formatCurrency(item.housingAllowance)} | O: {formatCurrency(item.otherAllowances)}</p>
                              </td>
                              <td className={`px-8 py-5 font-bold ${(Number(item.leaveDeductions || 0) + Number(item.shortPermissionDeductions || 0)) > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                                -{formatFixed(Number(item.leaveDeductions || 0) + Number(item.shortPermissionDeductions || 0))}
                              </td>
                              <td className="px-8 py-5">
                                 <div className="flex flex-col text-start">
                                    <span className="text-[11px] font-black text-slate-900">-{formatFixed(item.pifssDeduction)}</span>
                                    <span className="text-[9px] font-bold text-indigo-600 uppercase">Co: {formatFixed(item.pifssEmployerShare)}</span>
                                 </div>
                              </td>
                              <td className="px-8 py-5 font-black text-indigo-700">{formatCurrency(item.netSalary)}</td>
                            </tr>
                          )) : (
                            <tr><td colSpan={6} className="p-20 text-center text-slate-400 italic">No payroll items found for this period</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {paginatedData.length > 0 ? paginatedData.map(item => (
                      <PayslipCard key={item.id} item={item} run={activeRun} />
                    )) : (
                      <div className="col-span-full p-20 text-center text-slate-400 italic">No payslips available</div>
                    )}
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
