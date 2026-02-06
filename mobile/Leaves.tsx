
import React, { useState, useEffect } from 'react';
import { User, LeaveRequest, LeaveType } from '../types.ts';
import { dbService } from '../services/dbService.ts';
import { useNotifications } from '../components/NotificationSystem.tsx';

const MobileLeaves: React.FC<{ user: User, language: 'en' | 'ar' }> = ({ user, language }) => {
  const { notify } = useNotifications();
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    type: 'Annual' as LeaveType,
    start: '',
    end: '',
    reason: ''
  });

  const fetch = async () => {
    setLoading(true);
    const data = await dbService.getLeaveRequests({ employeeId: user.id });
    setHistory(data);
    setLoading(false);
  };

  useEffect(() => {
    fetch();
  }, [user]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.start || !formData.end) {
      notify("Incomplete", "Please select duration.", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const startD = new Date(formData.start);
      const endD = new Date(formData.end);
      const diffTime = Math.abs(endD.getTime() - startD.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      await dbService.createLeaveRequest({
        employeeId: user.id,
        employeeName: user.name,
        department: user.department || 'General',
        type: formData.type,
        startDate: formData.start,
        endDate: formData.end,
        days: diffDays,
        reason: formData.reason,
        status: 'Pending',
        managerId: '00000000-0000-0000-0000-000000000000',
        createdAt: new Date().toISOString(),
        history: []
      }, user);
      
      notify("Request Sent", "Awaiting manager authorization.", "success");
      setShowApply(false);
      fetch();
    } catch (err) {
      notify("Failed", "Unable to submit request.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResume = async (req: LeaveRequest) => {
    try {
      await dbService.updateLeaveRequestStatus(req.id, 'Resumed', user, "Mobile resumption confirmed.");
      notify("Duty Resumed", "Welcome back! Status updated to Active.", "success");
      fetch();
    } catch (err) {
      notify("Error", "Action failed.", "error");
    }
  };

  const activeResumption = history.find(h => h.status === 'HR_Approved');

  return (
    <div className="p-6 space-y-8">
      {/* Dynamic Actions */}
      <div className="grid grid-cols-2 gap-4">
         <button 
           onClick={() => setShowApply(true)}
           className="p-8 bg-white border border-slate-200 rounded-[32px] flex flex-col items-center gap-3 active:scale-95 transition-all shadow-sm"
         >
            <span className="text-3xl">🌴</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Apply Leave</span>
         </button>
         
         <button 
           disabled={!activeResumption}
           onClick={() => activeResumption && handleResume(activeResumption)}
           className={`p-8 rounded-[32px] flex flex-col items-center gap-3 active:scale-95 transition-all shadow-sm ${
             activeResumption ? 'bg-emerald-600 text-white' : 'bg-slate-50 border border-slate-100 opacity-40 grayscale'
           }`}
         >
            <span className="text-3xl">{activeResumption ? '🏠' : '🔒'}</span>
            <span className={`text-[10px] font-black uppercase tracking-widest ${activeResumption ? 'text-white' : 'text-slate-400'}`}>
              {activeResumption ? 'Resume Duty' : 'No Active Leave'}
            </span>
         </button>
      </div>

      {/* Leave Application Modal/Sheet */}
      {showApply && (
        <div className="fixed inset-0 z-[100] flex items-end">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowApply(false)}></div>
           <form onSubmit={handleApply} className="relative bg-white w-full rounded-t-[40px] p-8 space-y-8 animate-in slide-in-from-bottom duration-300">
              <div className="flex justify-between items-center">
                 <h3 className="text-xl font-black text-slate-900 tracking-tight">New Leave Request</h3>
                 <button type="button" onClick={() => setShowApply(false)} className="text-slate-400 text-2xl">×</button>
              </div>

              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Type</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-bold text-sm outline-none"
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value as any})}
                    >
                       <option value="Annual">Annual Leave</option>
                       <option value="Sick">Sick Leave</option>
                       <option value="Emergency">Emergency</option>
                    </select>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase">From</label>
                       <input 
                         type="date" 
                         required 
                         className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 font-bold text-xs"
                         value={formData.start}
                         onChange={e => setFormData({...formData, start: e.target.value})}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase">To</label>
                       <input 
                         type="date" 
                         required 
                         className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 font-bold text-xs"
                         value={formData.end}
                         onChange={e => setFormData({...formData, end: e.target.value})}
                       />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Notes (Optional)</label>
                    <textarea 
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-medium h-24 outline-none"
                      placeholder="Add details..."
                      value={formData.reason}
                      onChange={e => setFormData({...formData, reason: e.target.value})}
                    />
                 </div>
              </div>

              <button 
                type="submit"
                disabled={submitting}
                className="w-full py-5 bg-emerald-600 text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
              >
                {submitting ? 'Submitting...' : 'Send Application'}
              </button>
           </form>
        </div>
      )}

      {/* Request History */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Application Status</h3>
        {loading ? (
          <div className="p-20 text-center animate-pulse text-slate-300">Syncing Leaves...</div>
        ) : history.length > 0 ? (
          history.map(req => (
            <div key={req.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${
                  req.status === 'Pending' ? 'bg-amber-50' : 'bg-slate-50'
                }`}>
                  {req.type === 'Annual' ? '🌴' : '🤒'}
                </div>
                <div>
                   <p className="text-sm font-black text-slate-900">{req.type} Leave</p>
                   <p className="text-[10px] text-slate-500 font-bold">{req.startDate} to {req.endDate}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                req.status === 'Paid' ? 'bg-slate-100 text-slate-400' : 
                req.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                'bg-emerald-100 text-emerald-700'
              }`}>
                {req.status.replace('_', ' ')}
              </span>
            </div>
          ))
        ) : (
          <div className="p-20 text-center text-slate-300 font-medium italic">No active applications.</div>
        )}
      </div>

      {/* Payslip Quick Access */}
      <div className="bg-slate-900 p-8 rounded-[40px] text-white">
         <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Latest Salary Slip</p>
              <h4 className="text-lg font-black tracking-tight">March 2024</h4>
            </div>
            <button 
              onClick={() => notify("Coming Soon", "Digital PDF generation is currently being audited.", "info")}
              className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-xl active:scale-90 transition-all"
            >
              📥
            </button>
         </div>
         <p className="text-[10px] text-slate-400 font-medium">Download official PDF certificate for bank or residency purposes.</p>
      </div>
    </div>
  );
};

export default MobileLeaves;
