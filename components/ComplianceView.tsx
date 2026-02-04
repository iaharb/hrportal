
import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService.ts';
import { useNotifications } from './NotificationSystem.tsx';
import { Employee, PublicHoliday } from '../types.ts';

const ComplianceView: React.FC = () => {
  const { notify, confirm } = useNotifications();
  const [isCleaning, setIsCleaning] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [emps, holidayData] = await Promise.all([
        dbService.getEmployees(),
        dbService.getPublicHolidays()
      ]);
      setEmployees(emps);
      setHolidays(holidayData);
      setLoading(false);
    };
    fetchData();
  }, []);

  const requirements = [
    { title: 'Social Security Registration', status: 'Complete', date: '2023-12-01', desc: 'All Kuwaiti nationals enrolled in PIFSS.' },
    { title: 'GOSI Contributions', status: 'Pending', date: '2024-03-31', desc: 'Monthly payment reconciliation for expats.' },
    { title: 'PAM Quota Fulfillment', status: 'In Progress', date: '2024-06-30', desc: 'Company is 85% towards 2024 hiring targets.' },
    { title: 'Training Declarations', status: 'Complete', date: '2024-01-15', desc: 'Quarterly training report submitted to PAM.' },
  ];

  const handlePurgeRequests = () => {
    confirm({
      title: "Clean Leave Table?",
      message: "This will permanently delete ALL historical and pending leave requests from the database. This action is irreversible. Proceed?",
      confirmText: "Delete All Requests",
      onConfirm: async () => {
        setIsCleaning(true);
        try {
          const res = await dbService.truncateLeaveRequests();
          if (res.success) notify("System Cleaned", "Leave requests table has been truncated.", "success");
          else notify("Error", res.error || "Purge failed", "error");
        } finally {
          setIsCleaning(false);
        }
      }
    });
  };

  const handleResetWithCarryOver = () => {
    confirm({
      title: "Perform Annual Carry-Over Reset?",
      message: "This will trigger the year-end transition. Unused annual leave days (capped at 30) will be carried forward to the next cycle. All usage counters will be zeroed. This will notify the HR team.",
      confirmText: "Run Carry-Over Process",
      onConfirm: async () => {
        setIsCleaning(true);
        try {
          const res = await dbService.performYearEndResetWithCarryOver();
          if (res.success) notify("Balances Transitioned", "Year-end reset with 30-day carry-over complete.", "success");
          else notify("Error", res.error || "Process failed", "error");
        } finally {
          setIsCleaning(false);
        }
      }
    });
  };

  const calculateDaysRemaining = (expiryDate?: string) => {
    if (!expiryDate) return Infinity;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getExpiryStatus = (days: number) => {
    if (days < 0) return { label: 'Expired', color: 'bg-rose-600 text-white', icon: '🚨', tier: 'critical' };
    if (days <= 30) return { label: `${days}d Remaining`, color: 'bg-orange-500 text-white', icon: '⚠️', tier: 'urgent' };
    if (days <= 60) return { label: `${days}d Remaining`, color: 'bg-amber-100 text-amber-800 border border-amber-200', icon: '⏳', tier: 'attention' };
    return { label: 'Safe', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: '✅', tier: 'safe' };
  };

  const handleNotifyEmployee = (emp: Employee, docType: string) => {
    notify("Notification Sent", `Automated renewal notice sent to ${emp.name} for their ${docType}.`, "success");
  };

  const expiringDocs = employees.flatMap(emp => {
    const docs = [];
    if (emp.civilIdExpiry) docs.push({ emp, type: 'Civil ID', expiry: emp.civilIdExpiry, days: calculateDaysRemaining(emp.civilIdExpiry) });
    if (emp.passportExpiry) docs.push({ emp, type: 'Passport', expiry: emp.passportExpiry, days: calculateDaysRemaining(emp.passportExpiry) });
    if (emp.iznAmalExpiry) docs.push({ emp, type: 'Izn Amal (Work Permit)', expiry: emp.iznAmalExpiry, days: calculateDaysRemaining(emp.iznAmalExpiry) });
    return docs;
  }).sort((a, b) => a.days - b.days);

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">PAM Compliance & Document Integrity</h2>
          <p className="text-slate-500 font-medium">Government filings and mandatory workforce documentation monitor.</p>
        </div>
        <div className="flex gap-3">
           <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Ministry Portal Sync: Online</span>
           </div>
        </div>
      </header>

      {/* Traffic Light Summary Grid */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Critical/Expired', count: expiringDocs.filter(d => d.days < 0).length, color: 'rose', icon: '🔴' },
          { label: 'Urgent (<30d)', count: expiringDocs.filter(d => d.days >= 0 && d.days <= 30).length, color: 'orange', icon: '🟠' },
          { label: 'Attention (30-60d)', count: expiringDocs.filter(d => d.days > 30 && d.days <= 60).length, color: 'amber', icon: '🟡' },
          { label: 'Compliant (>60d)', count: expiringDocs.filter(d => d.days > 60).length, color: 'emerald', icon: '🟢' },
        ].map((stat, i) => (
          <div key={i} className={`bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm flex items-center justify-between group hover:border-${stat.color}-300 transition-all`}>
             <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
               <p className={`text-3xl font-black text-${stat.color}-600 tracking-tighter`}>{stat.count}</p>
             </div>
             <span className="text-2xl grayscale group-hover:grayscale-0 transition-all">{stat.icon}</span>
          </div>
        ))}
      </section>

      {/* National Holiday Calendar Section */}
      <section className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
              <span className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600 text-sm">🇰🇼</span>
              National Holiday Calendar
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">Automatic non-deductible days for leave processing.</p>
          </div>
          <button className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">
            Sync with Official Gazette
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-100">
           {loading ? (
             <div className="col-span-3 p-10 text-center animate-pulse text-slate-400">Loading national calendar...</div>
           ) : holidays.map(holiday => (
             <div key={holiday.id} className="bg-white p-6 hover:bg-slate-50 transition-colors">
               <div className="flex justify-between items-start mb-2">
                 <h4 className="font-bold text-slate-900 text-sm">{holiday.name}</h4>
                 <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                   holiday.type === 'Religious' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                 }`}>
                   {holiday.type}
                 </span>
               </div>
               <div className="flex items-center gap-3 mt-4">
                 <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center min-w-[50px]">
                    <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Date</p>
                    <p className="text-xs font-black text-slate-800">{new Date(holiday.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                 </div>
                 <div className="text-[10px] text-slate-500 font-medium italic">
                    {holiday.isFixed ? 'Fixed Gregorian Date' : 'Variable Lunar Cycle'}
                 </div>
               </div>
             </div>
           ))}
        </div>
      </section>

      {/* Document Expiry Monitor Section */}
      <section className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600 text-sm">🪪</span>
              Workforce Document Integrity
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium italic">Proactive tracking of Residency, Passports, and Izn Amal.</p>
          </div>
          <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em]">
             Total Monitored: {expiringDocs.length}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-8 py-6">Workforce Member</th>
                <th className="px-8 py-6">Document Type</th>
                <th className="px-8 py-6">Expiry Date</th>
                <th className="px-8 py-6 text-center">Status / Risk Level</th>
                <th className="px-8 py-6 text-right">Intervention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="p-20 text-center animate-pulse text-slate-400">Scanning document registry...</td></tr>
              ) : expiringDocs.length > 0 ? (
                expiringDocs.map((doc, i) => {
                  const status = getExpiryStatus(doc.days);
                  return (
                    <tr key={`${doc.emp.id}-${doc.type}`} className={`hover:bg-slate-50/50 transition-colors ${doc.days < 0 ? 'bg-rose-50/20' : ''}`}>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-2xl ${doc.days < 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'} flex items-center justify-center font-black text-xs`}>
                            {doc.emp.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900">{doc.emp.name}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{doc.emp.nationality} • {doc.emp.department}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-xs font-bold text-slate-600">{doc.type}</span>
                      </td>
                      <td className="px-8 py-6 font-mono text-xs font-bold text-slate-500">
                        {doc.expiry}
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex justify-center">
                          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${status.color}`}>
                            <span>{status.icon}</span>
                            {status.label}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => handleNotifyEmployee(doc.emp, doc.type)}
                          className="px-6 py-2 bg-white border border-slate-200 hover:border-indigo-200 hover:text-indigo-600 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                        >
                          Alert Employee
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={5} className="p-20 text-center text-slate-400 italic">All workforce documents are currently compliant.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
            <h3 className="font-bold text-slate-800">Mandatory Ministry Filings</h3>
            <button className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest">Download All</button>
          </div>
          <div className="divide-y divide-slate-50 flex-1">
            {requirements.map((req, i) => (
              <div key={i} className="p-6 flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className={`mt-1 p-2 rounded-lg ${
                    req.status === 'Complete' ? 'bg-emerald-50 text-emerald-600' :
                    req.status === 'Pending' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {req.status === 'Complete' ? '✓' : req.status === 'Pending' ? '⏱' : '○'}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{req.title}</h4>
                    <p className="text-xs text-slate-500 mt-1 font-medium">{req.desc}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">{req.status}</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Due {req.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-indigo-600 p-10 rounded-[40px] text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                <span className="text-[140px]">🇰🇼</span>
             </div>
             <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-4">Ministry Funding Support</p>
             <h4 className="text-3xl font-black mb-2 tracking-tighter">MGRP / PAM Dashboard</h4>
             <p className="text-indigo-100 text-sm mb-8 leading-relaxed opacity-80 font-medium">
               Your firm is currently receiving <span className="text-white font-black underline decoration-indigo-400">12,400 KWD</span> monthly in government support for national hiring initiatives.
             </p>
             <div className="flex items-center justify-between p-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl">
               <span className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Compliant Ratio</span>
               <span className="text-3xl font-black text-white tracking-tighter">14 / 20</span>
             </div>
          </div>

          <div className="bg-slate-100 rounded-[40px] p-10 border-2 border-slate-200 border-dashed flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-4xl shadow-sm mb-6 border border-slate-100">📥</div>
            <h4 className="font-black text-slate-800 tracking-tight">Official PAM Notice Upload</h4>
            <p className="text-xs text-slate-500 mt-2 mb-8 max-w-xs leading-relaxed font-medium">Received a digital circular or residency update from Shoon? Upload to auto-sync registry.</p>
            <input type="file" id="pam-upload" className="hidden" />
            <label htmlFor="pam-upload" className="cursor-pointer bg-slate-900 text-white px-10 py-4 rounded-2xl text-[10px] font-black hover:bg-black transition-all uppercase tracking-widest shadow-xl shadow-slate-900/10 active:scale-95">
              Choose File
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplianceView;
