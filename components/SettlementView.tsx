
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService.ts';
import { Employee, SettlementResult } from '../types.ts';
import { useNotifications } from './NotificationSystem.tsx';

const SettlementView: React.FC = () => {
  const { notify } = useNotifications();
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
      notify("Calculation Complete", "Final settlement statement generated.", "success");
    } catch (err: any) {
      notify("Error", err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const selectedEmp = employees.find(e => e.id === selectedId);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Input Sidebar */}
        <div className="lg:w-96 space-y-6">
          <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Exit Configuration</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[8px] font-black text-slate-500 uppercase mb-2 pl-1">Target Employee</label>
                <select 
                  className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800"
                  value={selectedId}
                  onChange={e => setSelectedId(e.target.value)}
                >
                  <option value="">Select workforce member...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.department})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[8px] font-black text-slate-500 uppercase mb-1 pl-1">Effective Last Day</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[8px] font-black text-slate-500 uppercase mb-1 pl-1">Reason for Separation</label>
                  <select 
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold"
                    value={reason}
                    onChange={e => setReason(e.target.value as any)}
                  >
                    <option value="Resignation">Resignation</option>
                    <option value="Termination">Termination</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={handleCalculate}
                disabled={!selectedId || loading}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Performing Audit...' : 'Execute Settlement Engine'}
              </button>
            </div>
          </div>

          <div className="bg-indigo-600 p-8 rounded-[40px] text-white shadow-xl shadow-indigo-600/20">
             <h4 className="font-bold text-sm mb-2">Legal Context</h4>
             <p className="text-[10px] text-indigo-100 leading-relaxed font-medium opacity-80">
               Calculations are governed by Article 51 of the Private Sector Labor Law. Indemnity tiers are applied based on total tenure from the registered Join Date.
             </p>
          </div>
        </div>

        {/* Result Statement */}
        <div className="flex-1">
          {!result ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-[50px] h-[600px] flex flex-col items-center justify-center text-center p-20 grayscale opacity-40">
               <span className="text-8xl mb-6">📜</span>
               <h3 className="text-xl font-black text-slate-800 tracking-tight">Statement Preview</h3>
               <p className="text-sm text-slate-500 max-w-xs mt-2">Configure exit details to generate the official Final Settlement Statement for the selected member.</p>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-[50px] border border-slate-200 shadow-xl relative overflow-hidden animate-in zoom-in-95 duration-300">
               {/* Corporate Watermark */}
               <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                  <span className="text-[180px] leading-none">🇰🇼</span>
               </div>

               <div className="flex justify-between items-start mb-16 relative z-10">
                 <div>
                   <h2 className="text-2xl font-black text-slate-900 tracking-tight">Final Settlement Statement</h2>
                   <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Official Record • Confidential</p>
                 </div>
                 <div className="text-right">
                   <p className="text-sm font-bold text-slate-400">Date: {new Date().toLocaleDateString()}</p>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ref: SET-{result.totalSettlement.toFixed(0)}-{selectedId.slice(0,4)}</p>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-10 mb-16 relative z-10">
                 <div>
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Employee Identification</h4>
                   <div className="space-y-2">
                     <p className="text-lg font-black text-slate-900">{selectedEmp?.name}</p>
                     <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{selectedEmp?.position} • {selectedEmp?.department}</p>
                     <p className="text-xs text-slate-500 font-medium italic">Civil ID: {selectedEmp?.civilId || 'Verified Record'}</p>
                   </div>
                 </div>
                 <div>
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Tenure Audit</h4>
                   <div className="space-y-2">
                     <div className="flex justify-between text-sm font-bold">
                       <span className="text-slate-500">Service Start</span>
                       <span className="text-slate-900">{selectedEmp?.joinDate}</span>
                     </div>
                     <div className="flex justify-between text-sm font-bold">
                       <span className="text-slate-500">Effective End</span>
                       <span className="text-slate-900">{endDate}</span>
                     </div>
                     <div className="flex justify-between text-sm font-black pt-2 border-t mt-2">
                       <span className="text-emerald-600 uppercase tracking-widest text-[10px]">Total Tenure</span>
                       <span className="text-slate-900">{result.tenureYears}y {result.tenureMonths}m {result.tenureDays}d</span>
                     </div>
                   </div>
                 </div>
               </div>

               <div className="bg-slate-50 rounded-[32px] p-8 mb-10 border border-slate-100 relative z-10">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-200 pb-2">EOS Calculation Audit (Article 51)</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Daily Rate Basis (Salary / 26)</span>
                        <span className="font-bold text-slate-900">{result.dailyRate.toFixed(2)} KWD</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Phase 1: First 5 Years (15 days/year)</span>
                        <span className="font-bold text-slate-900">{result.breakdown.firstFiveYearAmount.toLocaleString()} KWD</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Phase 2: Remaining Service (30 days/year)</span>
                        <span className="font-bold text-slate-900">{result.breakdown.subsequentYearAmount.toLocaleString()} KWD</span>
                      </div>
                    </div>

                    <div className="space-y-4 border-l-2 border-dashed border-slate-200 pl-8">
                       <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Total Base Indemnity</span>
                        <span className="font-bold text-slate-900 underline decoration-double">{result.breakdown.baseIndemnity.toLocaleString()} KWD</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Reason Adjustment ({reason})</span>
                        <span className={`font-black ${result.breakdown.multiplierApplied < 1.0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          × {(result.breakdown.multiplierApplied * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="pt-2 border-t border-slate-200">
                        <p className="text-[10px] text-slate-400 italic font-medium leading-relaxed">
                          * As per Article 51, service over 10 years or termination by employer grants full indemnity. Resignation under 3 years grants zero.
                        </p>
                      </div>
                    </div>
                  </div>
               </div>

               <div className="space-y-6 relative z-10">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Disbursement Breakdown</h4>
                 
                 <div className="space-y-4">
                   <div className="flex justify-between items-center p-6 bg-slate-50 rounded-3xl border border-slate-100">
                     <div>
                       <p className="text-sm font-black text-slate-800">Final Indemnity Amount</p>
                       <p className="text-[10px] text-slate-500 font-medium">Base × Legal Multiplier</p>
                     </div>
                     <p className="text-lg font-black text-slate-900">{result.indemnityAmount.toLocaleString()} <span className="text-xs text-slate-400">KWD</span></p>
                   </div>

                   <div className="flex justify-between items-center p-6 bg-slate-50 rounded-3xl border border-slate-100">
                     <div>
                       <p className="text-sm font-black text-slate-800">Leave Balance Encasement</p>
                       <p className="text-[10px] text-slate-500 font-medium">{result.breakdown.leaveDaysEncashed} Accrued Days • Rate: {result.dailyRate.toFixed(2)}/day</p>
                     </div>
                     <p className="text-lg font-black text-slate-900">{result.leavePayout.toLocaleString()} <span className="text-xs text-slate-400">KWD</span></p>
                   </div>
                 </div>

                 <div className="mt-12 p-10 bg-slate-900 rounded-[40px] flex items-center justify-between text-white shadow-2xl shadow-slate-900/20">
                    <div>
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-2">Net Payable Amount</p>
                      <h3 className="text-5xl font-black tracking-tighter">
                        {result.totalSettlement.toLocaleString()} <span className="text-xl">KWD</span>
                      </h3>
                    </div>
                    <div className="text-right">
                      <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-3xl mb-2">💰</div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Authorized for Pay-out</p>
                    </div>
                 </div>

                 <div className="pt-12 mt-12 border-t-2 border-dashed border-slate-100 grid grid-cols-2 gap-20">
                    <div className="text-center">
                       <div className="h-20 border-b border-slate-200 mb-4"></div>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Employee Signature</p>
                    </div>
                    <div className="text-center">
                       <div className="h-20 border-b border-slate-200 mb-4 flex items-end justify-center">
                          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg mb-2">DIGITALLY SIGNED</span>
                       </div>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">HR Authorized Representative</p>
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
