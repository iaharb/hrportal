
import React, { useState, useEffect } from 'react';
import { User, PayrollRun, PayrollItem } from '../types.ts';
import { dbService as hrmDb } from '../services/dbService.ts';
import { useNotifications } from './NotificationSystem.tsx';

interface PayrollViewProps {
  user: User;
}

const PayslipCard: React.FC<{ item: PayrollItem; run: PayrollRun }> = ({ item, run }) => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const [year, monthStr] = run.period_key.split('-');
  const monthIndex = parseInt(monthStr) - 1;

  return (
    <div className="bg-white border-2 border-slate-100 rounded-[32px] p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col h-full">
      {/* Decorative Slip Header */}
      <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
      
      <div className="flex justify-between items-start mb-8">
        <div>
          <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Qubus Workforce Solutions</h5>
          <h4 className="text-lg font-black text-slate-900 tracking-tight">Official Salary Slip</h4>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Period</p>
          <p className="text-sm font-bold text-slate-800">{monthNames[monthIndex]} {year}</p>
        </div>
      </div>

      <div className="bg-slate-50 rounded-2xl p-4 mb-6 flex items-center justify-between border border-slate-100">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Employee Name</p>
          <p className="text-sm font-black text-slate-900">{item.employee_name}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Employee ID</p>
          <p className="text-xs font-bold text-slate-700">{item.employee_id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <div className="flex-1 space-y-4">
        <div>
          <h6 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-1">Earnings</h6>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600 font-medium">Basic Salary</span>
            <span className="font-bold text-slate-900">{item.basic_salary.toLocaleString()} KWD</span>
          </div>
          <div className="flex justify-between items-center text-sm mt-2">
            <span className="text-slate-600 font-medium">Allowances</span>
            <span className="font-bold text-slate-900">{item.allowances.toLocaleString()} KWD</span>
          </div>
        </div>

        <div>
          <h6 className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-3 border-b border-rose-50 pb-1">Deductions</h6>
          <div className="space-y-2">
            {item.pifss_deduction > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">PIFSS Contribution (11.5%)</span>
                <span className="font-bold text-rose-600">-{item.pifss_deduction.toFixed(2)} KWD</span>
              </div>
            )}
            {item.deductions > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Leave / Absence Adjustments</span>
                <span className="font-bold text-rose-600">-{item.deductions.toLocaleString()} KWD</span>
              </div>
            )}
            {item.pifss_deduction === 0 && item.deductions === 0 && (
               <p className="text-[10px] text-slate-400 italic">No deductions applied this period.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-100">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Net Payable Amount</p>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">
              {item.net_salary.toLocaleString()} <span className="text-sm">KWD</span>
            </p>
          </div>
          <div className="bg-slate-900 text-white p-2 rounded-xl text-[8px] font-black uppercase tracking-widest">
            {run.status === 'Finalized' ? 'PAID' : 'DRAFT'}
          </div>
        </div>
      </div>
      
      <p className="mt-6 text-[8px] text-slate-400 font-medium text-center uppercase tracking-widest">
        Digitally Generated • Reference: {item.id.slice(0, 12)}
      </p>
    </div>
  );
};

const PayrollView: React.FC<PayrollViewProps> = ({ user }) => {
  const { notify, confirm } = useNotifications();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [activeRun, setActiveRun] = useState<PayrollRun | null>(null);
  const [items, setItems] = useState<PayrollItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [verifiedItems, setVerifiedItems] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'Audit' | 'Payslips'>('Audit');

  const [filter, setFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    cycle: 'Monthly' as 'Monthly' | 'Bi-Weekly'
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

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
      
      const verificationMap: Record<string, boolean> = {};
      payrollItems.forEach(i => verificationMap[i.id] = false);
      setVerifiedItems(verificationMap);

      notify("Analysis Draft Ready", `Financial audit for ${periodKey} initialized.`, "success");
      fetchRuns();
    } catch (err: any) {
      notify("Error", err.message, "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleSelectRun = async (run: PayrollRun) => {
    setLoading(true);
    setActiveRun(run);
    setViewMode('Audit');
    try {
      const payrollItems = await hrmDb.getPayrollItems(run.id);
      setItems(payrollItems);
      const verificationMap: Record<string, boolean> = {};
      payrollItems.forEach(i => verificationMap[i.id] = i.verified_by_hr);
      setVerifiedItems(verificationMap);
    } catch (err: any) {
      notify("Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = () => {
    if (!activeRun) return;
    confirm({
      title: "Commit Financial Period?",
      message: `You are finalizing the ${activeRun.cycle_type} payroll for ${activeRun.period_key}. This action locks disbursement records and issues digital payslips.`,
      confirmText: "Finalize & Close Period",
      onConfirm: async () => {
        setProcessing(true);
        try {
          await hrmDb.finalizePayrollRun(activeRun.id, user);
          await fetchRuns();
          setActiveRun({ ...activeRun, status: 'Finalized' });
          notify("Payroll Finalized", "Financial cycle completed successfully.", "success");
        } catch (err: any) {
          notify("Error", err.message, "error");
        } finally {
          setProcessing(false);
        }
      }
    });
  };

  const toggleVerification = (itemId: string) => {
    setVerifiedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation & Controls */}
        <div className="lg:w-80 space-y-6">
          <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Execution Config</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[8px] font-black text-slate-500 uppercase mb-2">Cycle Architecture</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 rounded-xl border border-slate-100">
                  <button 
                    onClick={() => setFilter({ ...filter, cycle: 'Monthly' })}
                    className={`py-2 text-[10px] font-bold rounded-lg transition-all ${filter.cycle === 'Monthly' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400'}`}
                  >
                    Monthly
                  </button>
                  <button 
                    onClick={() => setFilter({ ...filter, cycle: 'Bi-Weekly' })}
                    className={`py-2 text-[10px] font-bold rounded-lg transition-all ${filter.cycle === 'Bi-Weekly' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400'}`}
                  >
                    Bi-Weekly
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[8px] font-bold text-slate-500 uppercase mb-2">Month</label>
                  <select 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    value={filter.month}
                    onChange={e => setFilter({ ...filter, month: parseInt(e.target.value) })}
                  >
                    {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-slate-500 uppercase mb-2">Year</label>
                  <select 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    value={filter.year}
                    onChange={e => setFilter({ ...filter, year: parseInt(e.target.value) })}
                  >
                    <option value={2024}>2024</option>
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                  </select>
                </div>
              </div>
              <button 
                onClick={handleGenerateDraft}
                disabled={processing}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 disabled:opacity-50 active:scale-95"
              >
                {processing ? 'Calculating Net Pay...' : 'Generate Audit Draft'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Financial History</h4>
             </div>
             <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                {runs.map(run => (
                  <button 
                    key={run.id}
                    onClick={() => handleSelectRun(run)}
                    className={`w-full p-5 text-left transition-all hover:bg-slate-50 group ${activeRun?.id === run.id ? 'bg-emerald-50 border-l-4 border-emerald-500' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold text-slate-800 text-xs">{run.period_key}</p>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${run.status === 'Finalized' ? 'bg-slate-100 text-slate-400' : 'bg-amber-100 text-amber-700'}`}>
                        {run.status}
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                      {run.total_disbursement.toLocaleString()} KWD • {run.cycle_type}
                    </p>
                  </button>
                ))}
                {runs.length === 0 && <div className="p-10 text-center text-slate-400 text-xs italic">No prior payroll records.</div>}
             </div>
          </div>
        </div>

        {/* Verification & Analysis Interface */}
        <div className="flex-1 space-y-8 min-w-0">
          {!activeRun ? (
            <div className="bg-white rounded-[40px] border border-slate-200 h-[600px] flex flex-col items-center justify-center text-center p-20">
               <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner">💳</div>
               <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Payroll Reconciliation</h3>
               <p className="text-slate-500 max-w-sm">Select a cycle to verify employee net pay against leave deductions and PIFSS contributions.</p>
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-400">
               <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-10 -mt-10 opacity-50 blur-3xl"></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">{activeRun.period_key}</h3>
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${activeRun.status === 'Draft' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                        {activeRun.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Grand Total: <span className="font-black text-slate-900">{activeRun.total_disbursement.toLocaleString()} KWD</span></p>
                  </div>
                  
                  <div className="flex items-center gap-4 relative z-10">
                    {activeRun.status === 'Finalized' && (
                      <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
                        <button 
                          onClick={() => setViewMode('Audit')}
                          className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'Audit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                        >
                          Audit Table
                        </button>
                        <button 
                          onClick={() => setViewMode('Payslips')}
                          className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'Payslips' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                        >
                          Batch Payslips
                        </button>
                      </div>
                    )}
                    
                    {activeRun.status === 'Draft' && (
                      <button 
                        onClick={handleFinalize}
                        disabled={processing}
                        className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95"
                      >
                        Authorize Disbursement
                      </button>
                    )}
                  </div>
               </div>

               {viewMode === 'Audit' ? (
                 <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                    <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                      <h4 className="font-bold text-slate-800 flex items-center gap-2">
                        Calculation Audit Table
                        <span className="text-[10px] px-2 py-0.5 bg-slate-200 text-slate-500 rounded font-black uppercase">Cycle: {activeRun.cycle_type}</span>
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">High Variance ( > 5% )</span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                          <tr>
                            <th className="px-8 py-5">Verification</th>
                            <th className="px-8 py-5">Employee</th>
                            <th className="px-8 py-5">Basic (KWD)</th>
                            <th className="px-8 py-5">Deductions</th>
                            <th className="px-8 py-5">PIFSS (11.5%)</th>
                            <th className="px-8 py-5">Net Salary</th>
                            <th className="px-8 py-5">Variance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {items.map(item => {
                            const isAnomalous = Math.abs(item.variance || 0) > 5;
                            const isVerified = verifiedItems[item.id];
                            
                            return (
                              <tr key={item.id} className={`transition-colors ${isAnomalous && activeRun.status === 'Draft' ? 'bg-rose-50/30' : 'hover:bg-slate-50/50'}`}>
                                <td className="px-8 py-5">
                                  <button 
                                    onClick={() => toggleVerification(item.id)}
                                    className={`w-6 h-6 rounded-lg border transition-all flex items-center justify-center ${
                                      isVerified 
                                      ? 'bg-emerald-500 border-emerald-500 text-white' 
                                      : 'bg-white border-slate-200 text-transparent'
                                    }`}
                                  >
                                    ✓
                                  </button>
                                </td>
                                <td className="px-8 py-5">
                                  <p className="font-bold text-slate-900 text-sm">{item.employee_name}</p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">ID: {item.employee_id.slice(0, 8)}</p>
                                </td>
                                <td className="px-8 py-5 text-sm font-black text-slate-700">{item.basic_salary.toLocaleString()}</td>
                                <td className="px-8 py-5">
                                  <div className="flex flex-col">
                                    <span className={`text-sm font-bold ${item.deductions > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                                      -{item.deductions.toLocaleString()}
                                    </span>
                                    {item.deductions > 0 && <span className="text-[8px] text-rose-400 font-black uppercase">Article 69 / Unpaid</span>}
                                  </div>
                                </td>
                                <td className="px-8 py-5 text-sm font-medium text-slate-400 italic">
                                  {item.pifss_deduction > 0 ? `-${item.pifss_deduction.toFixed(2)}` : 'Exempt'}
                                </td>
                                <td className="px-8 py-5">
                                  <div className={`px-4 py-2 rounded-2xl transition-all inline-block ${isAnomalous && activeRun.status === 'Draft' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' : 'text-emerald-700 font-black'}`}>
                                    <p className="text-base font-black">
                                      {item.net_salary.toLocaleString()} <span className="text-[10px] opacity-70">KWD</span>
                                    </p>
                                  </div>
                                </td>
                                <td className="px-8 py-5">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs font-black ${item.variance && item.variance > 0 ? 'text-emerald-600' : (item.variance && item.variance < 0 ? 'text-rose-600' : 'text-slate-300')}`}>
                                      {item.variance ? `${item.variance > 0 ? '+' : ''}${item.variance.toFixed(1)}%` : '--'}
                                    </span>
                                    {isAnomalous && (
                                      <div className="w-5 h-5 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-[10px]" title="Audit Required">!</div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-500">
                    {items.map(item => (
                      <PayslipCard key={item.id} item={item} run={activeRun} />
                    ))}
                 </div>
               )}

               {items.length === 0 && <div className="p-20 text-center text-slate-400 italic">No itemized calculations found for this run.</div>}

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-slate-900 p-8 rounded-[40px] text-white">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Calculation Logic Disclosure</h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <p className="text-[11px] font-medium text-slate-300">Monthly Cycle uses a static 30-day divisor for leave deductions.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <p className="text-[11px] font-medium text-slate-300">Bi-Weekly Cycle uses a 14-day divisor with strict date-window validation.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        <p className="text-[11px] font-medium text-slate-300">Kuwaiti National PIFSS (11.5%) is auto-calculated based on registered Civil ID status.</p>
                      </div>
                    </div>
                 </div>
                 <div className="bg-emerald-50 p-8 rounded-[40px] border border-emerald-100">
                    <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-4">Verification Statistics</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-3xl border border-emerald-100 shadow-sm">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Items Verified</p>
                        <p className="text-2xl font-black text-emerald-600">{Object.values(verifiedItems).filter(Boolean).length} / {items.length}</p>
                      </div>
                      <div className="bg-white p-4 rounded-3xl border border-emerald-100 shadow-sm">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">High Variance</p>
                        <p className="text-2xl font-black text-rose-600">{items.filter(i => Math.abs(i.variance || 0) > 5).length}</p>
                      </div>
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

export default PayrollView;
