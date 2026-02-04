import React, { useState, useEffect, useMemo } from 'react';
import { User, Employee, LeaveRequest } from '../types';
import { dbService } from '../services/dbService';

interface ProfileViewProps {
  user: User;
}

const ProfileView: React.FC<ProfileViewProps> = ({ user }) => {
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);
  const [leaveHistory, setLeaveHistory] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      try {
        const [emp, leaves] = await Promise.all([
          dbService.getEmployeeByName(user.name),
          dbService.getLeaveRequests({ employeeId: user.id, employeeName: user.name })
        ]);
        
        if (emp) setEmployeeData(emp);
        setLeaveHistory(leaves);
      } catch (err) {
        console.error("Error fetching profile data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user]);

  const summary = useMemo(() => {
    const stats = {
      total: leaveHistory.length,
      approved: leaveHistory.filter(l => l.status === 'Approved').length,
      pending: leaveHistory.filter(l => l.status === 'Pending').length,
      completed: leaveHistory.filter(l => l.status === 'Completed').length,
      rejected: leaveHistory.filter(l => l.status === 'Rejected').length,
      totalDays: leaveHistory.filter(l => l.status === 'Completed' || l.status === 'Approved').reduce((acc, curr) => acc + curr.days, 0)
    };
    return stats;
  }, [leaveHistory]);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex items-end gap-6">
          <div className="w-24 h-24 rounded-[32px] bg-slate-200"></div>
          <div className="space-y-2 mb-2">
            <div className="h-8 w-48 bg-slate-200 rounded"></div>
            <div className="h-4 w-32 bg-slate-200 rounded"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="h-32 bg-slate-200 rounded-[32px]"></div>
            <div className="h-64 bg-slate-200 rounded-[32px]"></div>
          </div>
          <div className="h-96 bg-slate-200 rounded-[32px]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-end gap-6">
        <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-4xl text-white shadow-xl shadow-emerald-500/20">
          {user.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="mb-2">
          <h2 className="text-3xl font-bold text-slate-900">{user.name}</h2>
          <p className="text-slate-500 flex items-center gap-2">
            <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-bold uppercase tracking-wider text-slate-600">{user.role}</span>
            • {user.department || employeeData?.department} Department
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Leave Balances Quick View */}
          {employeeData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm group hover:border-emerald-200 transition-colors">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Annual Remaining</p>
                  <p className="text-2xl font-black text-emerald-600">{employeeData.leaveBalances.annual} Days</p>
               </div>
               <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm group hover:border-rose-200 transition-colors">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Sick Remaining</p>
                  <p className="text-2xl font-black text-rose-600">{employeeData.leaveBalances.sick} Days</p>
               </div>
               <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm group hover:border-amber-200 transition-colors">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Emergency Remaining</p>
                  <p className="text-2xl font-black text-amber-600">{employeeData.leaveBalances.emergency} Days</p>
               </div>
            </div>
          )}

          {/* Summarized Leave History Section */}
          <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">📅</span>
                Leave Performance Summary
              </h3>
              <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 flex items-center gap-3">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">YTD Total</span>
                 <span className="text-sm font-bold text-indigo-600">{summary.totalDays} Days Used</span>
              </div>
            </div>

            {/* Status Breakdown Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                <p className="text-[9px] font-black text-emerald-700 uppercase mb-1">Approved</p>
                <p className="text-xl font-bold text-emerald-800">{summary.approved}</p>
              </div>
              <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                <p className="text-[9px] font-black text-amber-700 uppercase mb-1">Pending</p>
                <p className="text-xl font-bold text-amber-800">{summary.pending}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-600 uppercase mb-1">Finalized</p>
                <p className="text-xl font-bold text-slate-800">{summary.completed}</p>
              </div>
              <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100/50">
                <p className="text-[9px] font-black text-rose-700 uppercase mb-1">Rejected</p>
                <p className="text-xl font-bold text-rose-800">{summary.rejected}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {leaveHistory.length > 0 ? (
                leaveHistory.map((leave) => (
                  <div key={leave.id} className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-slate-100 transition-all hover:translate-x-1">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                        leave.type === 'Annual' ? 'bg-emerald-100 text-emerald-600' :
                        leave.type === 'Sick' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        {leave.type === 'Annual' ? '🌴' : leave.type === 'Sick' ? '🤒' : '🚨'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                           <p className="text-sm font-bold text-slate-800">{leave.type} Leave</p>
                           <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-100 px-1.5 py-0.5 rounded-md">{leave.days}d</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {new Date(leave.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} — {new Date(leave.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm ${
                        leave.status === 'Approved' ? 'bg-emerald-600 text-white' :
                        leave.status === 'Completed' ? 'bg-slate-200 text-slate-600' :
                        leave.status === 'Rejected' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                        leave.status === 'Pending' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-indigo-100 text-indigo-700 border border-indigo-200 animate-pulse'
                      }`}>
                        {leave.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-[32px]">
                  <p className="text-4xl mb-4 opacity-10">📂</p>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">No leave records to display</p>
                  <p className="text-[10px] text-slate-300 mt-1 italic">Your history is currently clear.</p>
                </div>
              )}
            </div>
          </div>

          {/* Kuwaitization Contribution Card */}
          <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">📈</span>
              Professional Profile
            </h3>
            <div className="space-y-6">
              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                <p className="text-sm text-emerald-800 font-bold mb-2">Workforce Impact</p>
                <p className="text-xs text-emerald-700 leading-relaxed font-medium">
                  As a {employeeData?.nationality === 'Kuwaiti' ? 'National Talent' : 'Workforce Member'} in the {user.department || employeeData?.department} team, your contributions drive our excellence. PIFSS & PAM registrations are actively maintained.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50/30">
                  <p className="text-[10px] text-slate-400 font-black uppercase mb-1 tracking-widest">Active Position</p>
                  <p className="text-base font-bold text-slate-800">{employeeData?.position || 'Staff Member'}</p>
                </div>
                <div className="p-5 border border-slate-100 rounded-2xl bg-slate-50/30">
                  <p className="text-[10px] text-slate-400 font-black uppercase mb-1 tracking-widest">National ID Status</p>
                  <p className="text-base font-bold text-slate-800 flex items-center gap-2">
                    {employeeData?.nationality === 'Kuwaiti' ? '🇰🇼 Verified' : '🌍 Valid Residency'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Reporting Hierarchy Card */}
          <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">🤝</span>
              Management Line
            </h3>
            <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 font-bold shadow-sm">
                {employeeData?.managerName ? employeeData.managerName[0] : 'S'}
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Line Manager</p>
                <p className="text-sm font-bold text-slate-800">{employeeData?.managerName || 'Sarah Al-Ghanim'}</p>
                <p className="text-[10px] text-emerald-600 uppercase font-black tracking-tighter">Approved Reviewer</p>
              </div>
            </div>
            <p className="mt-6 text-[10px] text-slate-400 italic leading-relaxed text-center px-4">
              Formal review of all HR submissions (Leaves, PIFSS) occurs within 48 hours of filing.
            </p>
          </div>

          <div className="bg-white p-8 rounded-[32px] text-slate-900 border border-slate-200 shadow-sm">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Credential Hub</h4>
            <div className="space-y-3">
              {[
                { title: 'Salary Certificate', icon: '📄' },
                { title: 'PIFSS Declaration', icon: '🏛️' },
                { title: 'PAM Status Receipt', icon: '📑' }
              ].map((doc, idx) => (
                <button key={idx} className="w-full p-4 bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-100 rounded-2xl flex items-center justify-between transition-all group">
                  <span className="text-sm font-bold text-slate-700 flex items-center gap-3">
                    <span className="opacity-50 group-hover:scale-110 transition-transform">{doc.icon}</span>
                    {doc.title}
                  </span>
                  <span className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-y-0.5 transition-all text-sm font-black">↓</span>
                </button>
              ))}
            </div>
          </div>

          {employeeData?.nationality === 'Kuwaiti' && (
            <div className="p-8 bg-emerald-600 rounded-[32px] text-white shadow-xl shadow-emerald-600/20 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-500">
                  <span className="text-8xl">🇰🇼</span>
               </div>
               <div className="relative z-10">
                 <p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest mb-2">Monthly National Subsidy</p>
                 <div className="flex items-end gap-2">
                   <span className="text-4xl font-black">450</span>
                   <span className="text-sm text-emerald-100 pb-1 font-bold">KWD</span>
                 </div>
                 <div className="mt-6 pt-6 border-t border-emerald-500/50">
                    <p className="text-[10px] text-emerald-100 font-medium leading-relaxed">Active PAM Entitlement • Apr 2024</p>
                 </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileView;