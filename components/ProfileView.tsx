
import React, { useState, useEffect, useMemo } from 'react';
import { User, Employee, LeaveRequest, PayrollItem, PayrollRun } from '../types.ts';
import { dbService as hrmDb } from '../services/dbService.ts';

interface ProfileViewProps {
  user: User;
}

const SalaryCertificateModal: React.FC<{ 
  employee: Employee; 
  item?: PayrollItem; 
  onClose: () => void;
  bankName: string;
}> = ({ employee, item, onClose, bankName }) => {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  
  // Use payslip data if available, otherwise fallback to employee base salary
  const basicSalary = item ? item.basic_salary : employee.salary;
  const allowances = item ? item.allowances : 0;
  const deductions = item ? (item.pifss_deduction + item.deductions) : (employee.nationality === 'Kuwaiti' ? basicSalary * 0.115 : 0);
  const netSalary = basicSalary + allowances - deductions;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300 max-h-[95vh] flex flex-col">
        <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Digital Document Preview</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-xl">×</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-12 bg-white font-serif">
          {/* Certificate Letterhead */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-12">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-900 font-sans tracking-tighter">QUBUS WORKFORCE</h2>
              <p className="text-[10px] font-sans font-bold text-slate-500 uppercase tracking-widest">Shuwaikh Industrial, Block 1, Kuwait</p>
              <p className="text-[10px] font-sans font-bold text-slate-500 uppercase tracking-widest">Tel: +965 2222 0000 | info@qubus.kw</p>
            </div>
            <div className="text-right">
               <span className="text-4xl">🇰🇼</span>
            </div>
          </div>

          <div className="space-y-8 text-slate-800 leading-relaxed">
            <p className="text-right font-sans font-bold text-sm">Date: {today}</p>
            
            <div className="space-y-1">
              <p className="font-bold">To: {bankName || "To Whom It May Concern"}</p>
              <p className="text-sm italic">Kuwait, State of Kuwait</p>
            </div>

            <h3 className="text-center text-xl font-bold underline underline-offset-8 uppercase font-sans py-4">
              Salary Certificate
            </h3>

            <p className="text-sm">
              This is to certify that <strong>{employee.name}</strong>, a <strong>{employee.nationality}</strong> national, 
              holding Civil ID No. <strong>{employee.civilId || "285010101234"}</strong>, is currently employed with us 
              as a <strong>{employee.position}</strong> in the <strong>{employee.department}</strong> Department.
            </p>

            <p className="text-sm">
              The employee joined our organization on <strong>{new Date(employee.joinDate).toLocaleDateString()}</strong> and is 
              currently serving as a full-time staff member. The monthly salary breakdown is as follows:
            </p>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 space-y-3 font-sans">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Basic Monthly Salary</span>
                <span className="font-black text-slate-900">{basicSalary.toLocaleString()} KWD</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Recurring Allowances</span>
                <span className="font-black text-slate-900">{allowances.toLocaleString()} KWD</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                <span className="text-slate-900 font-black uppercase tracking-widest text-[10px]">Total Gross Salary</span>
                <span className="font-black text-slate-900">{ (basicSalary + allowances).toLocaleString() } KWD</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-rose-500 font-bold uppercase tracking-widest text-[10px]">Statutory Deductions (Estimated)</span>
                <span className="font-black text-rose-600">-{ deductions.toLocaleString() } KWD</span>
              </div>
              <div className="flex justify-between text-lg pt-4 border-t-2 border-slate-900">
                <span className="text-slate-900 font-black uppercase tracking-widest text-[11px]">Net Monthly Payable</span>
                <span className="font-black text-slate-900">{ netSalary.toLocaleString() } KWD</span>
              </div>
            </div>

            <p className="text-sm">
              This certificate is issued upon the employee's request for <strong>Bank-related formalities</strong> without any 
              financial liability on the part of the company.
            </p>

            <div className="flex justify-between items-end pt-12">
               <div className="space-y-12">
                  <div className="w-40 h-16 border-b border-slate-400"></div>
                  <p className="text-[10px] font-sans font-black text-slate-400 uppercase tracking-widest">Authorized HR Signature</p>
               </div>
               <div className="flex flex-col items-center gap-2">
                  <div className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200">
                    <span className="text-3xl">🔏</span>
                  </div>
                  <p className="text-[8px] font-sans font-black text-emerald-600 uppercase tracking-tighter">SECURE QR VERIFIED</p>
               </div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-900 text-white flex gap-4">
           <button onClick={onClose} className="flex-1 py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
             Close
           </button>
           <button onClick={() => window.print()} className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20">
             Download PDF / Print
           </button>
        </div>
      </div>
    </div>
  );
};

const PersonalPayslip: React.FC<{ item: PayrollItem; run: PayrollRun }> = ({ item, run }) => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const [year, monthStr] = run.period_key.split('-');
  const monthIndex = parseInt(monthStr) - 1;

  return (
    <div className="bg-slate-900 text-white rounded-[40px] p-10 shadow-2xl relative overflow-hidden group h-full">
      <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
         <span className="text-[150px] leading-none">💳</span>
      </div>

      <div className="relative z-10 h-full flex flex-col">
        <div className="flex justify-between items-start mb-10">
          <div>
            <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Latest Salary Statement</h4>
            <p className="text-2xl font-black tracking-tight">{monthNames[monthIndex]} {year}</p>
          </div>
          <div className="text-right">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-black uppercase tracking-widest">
              Status: Paid
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 flex-1">
          <div className="space-y-6">
            <div>
              <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 border-b border-white/10 pb-2">Earnings Break-down</h5>
              <div className="flex justify-between items-center text-sm font-medium mb-2">
                <span className="text-slate-400">Basic Monthly Pay</span>
                <span>{item.basic_salary.toLocaleString()} KWD</span>
              </div>
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-slate-400">Recurring Allowances</span>
                <span>{item.allowances.toLocaleString()} KWD</span>
              </div>
            </div>
            
            <div>
              <h5 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-4 border-b border-white/10 pb-2">Statutory Deductions</h5>
              <div className="flex justify-between items-center text-sm font-medium mb-2">
                <span className="text-slate-400">PIFSS Contribution</span>
                <span className="text-rose-400">-{item.pifss_deduction.toFixed(2)} KWD</span>
              </div>
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-slate-400">Absence/Sick Adjustments</span>
                <span className="text-rose-400">-{item.deductions.toLocaleString()} KWD</span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10 flex flex-col justify-center items-center text-center">
             <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Net Amount Transferred</p>
             <p className="text-5xl font-black tracking-tighter mb-4">
               {item.net_salary.toLocaleString()} <span className="text-xl">KWD</span>
             </p>
             <button className="text-[10px] font-black text-slate-400 uppercase hover:text-white transition-all underline decoration-slate-600 underline-offset-4">
               Detailed View
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileView: React.FC<ProfileViewProps> = ({ user }) => {
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);
  const [leaveHistory, setLeaveHistory] = useState<LeaveRequest[]>([]);
  const [latestPayslip, setLatestPayslip] = useState<{item: PayrollItem, run: PayrollRun} | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [showCertModal, setShowCertModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState('To Whom It May Concern');

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const [emp, leaves, payslip] = await Promise.all([
        hrmDb.getEmployeeByName(user.name),
        hrmDb.getLeaveRequests({ employeeId: user.id }),
        hrmDb.getLatestFinalizedPayroll(user.id)
      ]);
      if (emp) setEmployeeData(emp);
      setLeaveHistory(leaves);
      setLatestPayslip(payslip);
    } catch (err) {
      console.error("Error fetching profile data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [user]);

  const sickUsedActual = employeeData?.leaveBalances.sickUsed || 0;
  
  const availableBalances = useMemo(() => {
    if (!employeeData) return { annual: 0, sick: 0, emergency: 0, pending: { annual: 0, sick: 0, emergency: 0 } };
    
    const pendingRequests = leaveHistory.filter(r => 
      ['Pending', 'Manager_Approved', 'HR_Approved', 'Resumed'].includes(r.status)
    );

    const pending = {
      annual: pendingRequests.filter(r => r.type === 'Annual').reduce((acc, curr) => acc + curr.days, 0),
      sick: pendingRequests.filter(r => r.type === 'Sick').reduce((acc, curr) => acc + curr.days, 0),
      emergency: pendingRequests.filter(r => r.type === 'Emergency').reduce((acc, curr) => acc + curr.days, 0),
    };

    return {
      annual: Math.max(0, employeeData.leaveBalances.annual - pending.annual),
      sick: Math.max(0, employeeData.leaveBalances.sick - pending.sick),
      emergency: Math.max(0, employeeData.leaveBalances.emergency - pending.emergency),
      pending
    };
  }, [employeeData, leaveHistory]);

  const calculateDaysRemaining = (expiryDate?: string) => {
    if (!expiryDate) return Infinity;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDocStatus = (expiryDate?: string) => {
    const days = calculateDaysRemaining(expiryDate);
    if (days < 0) return { color: 'text-rose-600', label: 'Expired' };
    if (days <= 30) return { color: 'text-orange-500', label: `Expires in ${days}d` };
    if (days <= 60) return { color: 'text-amber-500', label: `Warning (${days}d)` };
    return { color: 'text-emerald-600', label: 'Verified' };
  };

  const getSickPayTier = (days: number) => {
    if (days <= 15) return { label: 'Full Pay (100%)', color: 'emerald', deduction: '0%' };
    if (days <= 25) return { label: '75% Pay', color: 'amber', deduction: '25%' };
    if (days <= 35) return { label: '50% Pay', color: 'orange', deduction: '50%' };
    if (days <= 45) return { label: '25% Pay', color: 'rose', deduction: '75%' };
    return { label: 'Unpaid (0%)', color: 'slate', deduction: '100%' };
  };

  const currentTier = getSickPayTier(sickUsedActual);

  if (loading) return <div className="p-10 animate-pulse bg-white rounded-[32px] h-96"></div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row items-start md:items-end gap-6 bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
           <span className="text-[200px] leading-none select-none">🇰🇼</span>
        </div>
        
        <div className="w-28 h-28 rounded-[40px] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-5xl text-white shadow-2xl shadow-emerald-600/20 relative z-10">
          {user.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="mb-2 relative z-10 flex-1">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">{user.name}</h2>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase rounded-lg tracking-widest border border-emerald-100">{user.role}</span>
            <span className="text-slate-400 font-bold text-sm">/</span>
            <span className="text-slate-600 font-bold text-sm uppercase tracking-wider">{user.department || employeeData?.department} Team</span>
          </div>
        </div>

        <div className="relative z-10 flex gap-4">
           <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-200">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Joined Since</p>
              <p className="text-lg font-black text-slate-900">{new Date(employeeData?.joinDate || '').getFullYear()}</p>
           </div>
        </div>
      </header>

      {/* Main Grid: Payslip (if any) and Self-Service Portal (Always visible) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2">
            {latestPayslip ? (
              <PersonalPayslip item={latestPayslip.item} run={latestPayslip.run} />
            ) : (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[40px] p-12 flex flex-col items-center justify-center text-center h-full">
                <span className="text-5xl mb-6 grayscale">📊</span>
                <h4 className="text-lg font-black text-slate-400">No Finalized Payslips</h4>
                <p className="text-xs text-slate-400 mt-2 max-w-xs">Your official salary statements will appear here once payroll cycles are authorized by HR.</p>
              </div>
            )}
         </div>
         
         {/* Self-Service Portal is now decoupled from the payslip check */}
         <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">🛡️</span>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Self-Service Portal</h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed mb-8">
                Generate official Salary Certificates for banking applications (Loans, Credit Cards) instantly.
              </p>
              <div className="space-y-4">
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Target Institution</label>
                 <select 
                   value={selectedBank}
                   onChange={(e) => setSelectedBank(e.target.value)}
                   className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                 >
                   <option>To Whom It May Concern</option>
                   <option>Kuwait Finance House (KFH)</option>
                   <option>National Bank of Kuwait (NBK)</option>
                   <option>Gulf Bank</option>
                   <option>Burgan Bank</option>
                   <option>Boubyan Bank</option>
                   <option>Warba Bank</option>
                 </select>
                 <button 
                   onClick={() => setShowCertModal(true)}
                   className="w-full py-5 bg-emerald-600 text-white rounded-[24px] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-600/20 active:scale-95 transition-all hover:bg-emerald-700"
                 >
                   Generate Certificate
                 </button>
              </div>
            </div>
            <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
               <span className="text-xs">🔏</span>
               <p className="text-[9px] text-slate-400 font-medium leading-tight">
                 Documents generated are digitally signed and include a system validation reference for bank verification.
               </p>
            </div>
         </div>
      </div>

      {showCertModal && employeeData && (
        <SalaryCertificateModal 
          employee={employeeData} 
          item={latestPayslip?.item} 
          bankName={selectedBank}
          onClose={() => setShowCertModal(false)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Article 69 Sick Pay Tracker</h3>
              <span className={`px-3 py-1 bg-${currentTier.color}-100 text-${currentTier.color}-700 rounded-lg text-[10px] font-black uppercase`}>
                Current: {currentTier.label}
              </span>
            </div>
            
            <div className="relative pt-6 pb-2">
              <div className="w-full h-4 bg-slate-100 rounded-full flex overflow-hidden">
                <div className="h-full bg-emerald-500 border-r border-white/20" style={{ width: '33.3%' }}></div>
                <div className="h-full bg-amber-500 border-r border-white/20" style={{ width: '22.2%' }}></div>
                <div className="h-full bg-orange-500 border-r border-white/20" style={{ width: '22.2%' }}></div>
                <div className="h-full bg-rose-500 border-r border-white/20" style={{ width: '22.2%' }}></div>
              </div>
              
              <div className="flex justify-between mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                <span>Start</span>
                <span className="text-emerald-600">15d (100%)</span>
                <span className="text-amber-600">25d (75%)</span>
                <span className="text-orange-600">35d (50%)</span>
                <span className="text-rose-600">45d (25%)</span>
              </div>

              <div 
                className="absolute top-4 w-1 h-8 bg-black z-20 transition-all duration-1000 shadow-lg"
                style={{ left: `${Math.min(100, (sickUsedActual / 45) * 100)}%` }}
              >
                <div className="absolute -top-6 -left-4 w-10 text-[9px] font-black text-center bg-black text-white px-1 py-0.5 rounded">
                  {sickUsedActual}d
                </div>
              </div>
            </div>
            <p className="mt-6 text-xs text-slate-500 font-medium leading-relaxed italic">
              * Actual finalized usage. Pending requests are not shown on this regulatory tracker.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Government Identification</h3>
                <div className="space-y-4">
                   <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-sm font-bold text-slate-500">Civil ID</span>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900 tracking-wider">{employeeData?.civilId || '285010101234'}</p>
                        <p className={`text-[9px] font-black uppercase ${getDocStatus(employeeData?.civilIdExpiry).color}`}>{getDocStatus(employeeData?.civilIdExpiry).label}</p>
                      </div>
                   </div>
                   <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-sm font-bold text-slate-500">Work Permit (Izn Amal)</span>
                      <div className="text-right">
                        <p className={`text-sm font-black tracking-wider ${employeeData?.nationality === 'Kuwaiti' ? 'text-slate-300' : 'text-slate-900'}`}>{employeeData?.nationality === 'Kuwaiti' ? 'N/A' : (employeeData?.iznAmalExpiry || 'Not Linked')}</p>
                        {employeeData?.nationality === 'Expat' && (
                          <p className={`text-[9px] font-black uppercase ${getDocStatus(employeeData?.iznAmalExpiry).color}`}>{getDocStatus(employeeData?.iznAmalExpiry).label}</p>
                        )}
                      </div>
                   </div>
                   <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-sm font-bold text-slate-500">Passport</span>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900 tracking-wider">{employeeData?.passportNumber || 'K0000000'}</p>
                        <p className={`text-[9px] font-black uppercase ${getDocStatus(employeeData?.passportExpiry).color}`}>{getDocStatus(employeeData?.passportExpiry).label}</p>
                      </div>
                   </div>
                   <div className="flex justify-between items-center py-2">
                      <span className="text-sm font-bold text-slate-500">Nationality Status</span>
                      <span className="text-sm font-black text-slate-900">{employeeData?.nationality === 'Kuwaiti' ? '🇰🇼 Registered Citizen' : '🌍 Valid Expat Entry'}</span>
                   </div>
                </div>
             </div>

             <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Career Development</h3>
                <div className="space-y-4">
                   <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-sm font-bold text-slate-500">Total Training</span>
                      <span className="text-sm font-black text-indigo-600 tracking-wider">{(employeeData?.trainingHours || 0).toFixed(1)} Hours</span>
                   </div>
                   <div className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-sm font-bold text-slate-500">YTD Growth</span>
                      <span className="text-sm font-black text-slate-900">+12% vs 2023</span>
                   </div>
                   <div className="flex justify-between items-center py-2">
                      <span className="text-sm font-bold text-slate-500">Joined</span>
                      <span className="text-sm font-black text-slate-900">{new Date(employeeData?.joinDate || '').toLocaleDateString()}</span>
                   </div>
                </div>
             </div>
          </div>
        </div>

        <div className="space-y-8">
           <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Available Balances</h3>
              <div className="space-y-6">
                {[
                  { label: 'Annual Remaining', val: availableBalances.annual, pending: availableBalances.pending.annual, color: 'emerald', max: 30 },
                  { label: 'Sick Threshold', val: availableBalances.sick, pending: availableBalances.pending.sick, color: 'rose', max: 45 },
                  { label: 'Emergency Remaining', val: availableBalances.emergency, pending: availableBalances.pending.emergency, color: 'amber', max: 6 }
                ].map((b, i) => (
                  <div key={i}>
                     <div className="flex justify-between items-center mb-2 px-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{b.label}</span>
                        <div className="text-right">
                          <span className={`text-sm font-black ${b.val < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                            {b.val} Days
                          </span>
                        </div>
                     </div>
                     <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden relative">
                        {/* Allocation including pending */}
                        <div 
                          className={`absolute top-0 left-0 h-full transition-all duration-1000 ${b.color === 'rose' ? 'bg-rose-500/20' : (b.color === 'emerald' ? 'bg-emerald-500/20' : 'bg-amber-500/20')}`} 
                          style={{ width: `${Math.min(100, Math.max(0, ((b.val + b.pending) / b.max) * 100))}%` }}
                        ></div>
                        {/* Net Available */}
                        <div 
                          className={`absolute top-0 left-0 h-full transition-all duration-1000 ${b.val < 0 ? 'bg-rose-600' : `bg-${b.color}-500`}`} 
                          style={{ width: `${Math.min(100, Math.max(0, (b.val / b.max) * 100))}%` }}
                        ></div>
                     </div>
                     {b.pending > 0 && (
                       <p className="text-[8px] text-amber-500 font-bold uppercase tracking-tighter mt-1">🕒 {b.pending}d pending approval</p>
                     )}
                  </div>
                ))}
              </div>
           </div>

           {employeeData?.nationality === 'Kuwaiti' && (
             <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[40px] text-white shadow-xl shadow-blue-600/20 relative overflow-hidden group">
                <div className="absolute -bottom-10 -right-10 text-[180px] opacity-10 leading-none pointer-events-none select-none">🇰🇼</div>
                <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-4">MGRP / PAM Subsidy</p>
                <h4 className="text-3xl font-black mb-2 tracking-tight">450 KWD</h4>
                <p className="text-xs text-blue-100 font-medium leading-relaxed mb-8 opacity-80">
                  National allowance effectively credited via PAM integration for your position.
                </p>
                <div className="flex items-center gap-2 text-[10px] font-black text-blue-300 uppercase tracking-widest">
                   <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                   Next Disbursement: Apr 25
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
