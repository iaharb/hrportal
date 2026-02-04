
import React, { useState, useEffect, useMemo } from 'react';
import { User, LeaveRequest, LeaveType, Employee, LeaveBalances } from '../types';
import { dbService } from '../services/dbService';

interface LeaveManagementProps {
  user: User;
}

const LeaveManagement: React.FC<LeaveManagementProps> = ({ user }) => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [medicalCertificate, setMedicalCertificate] = useState<File | null>(null);
  const [resumingRequestId, setResumingRequestId] = useState<string | null>(null);
  const [resumptionDate, setResumptionDate] = useState<string>('');
  
  // Calendar state
  const [calendarDate, setCalendarDate] = useState(new Date());

  const [formData, setFormData] = useState({
    type: 'Annual' as LeaveType,
    startDate: '',
    endDate: '',
    reason: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const profile = await dbService.getEmployeeByName(user.name);
      if (profile) setEmployeeData(profile);

      let filter: { employeeId?: string, employeeName?: string, department?: string } = {};
      
      if (user.role === 'Manager') {
        filter = { department: user.department, employeeId: user.id, employeeName: user.name };
      } else if (user.role === 'Admin') {
        filter = {};
      } else {
        filter = { employeeId: user.id, employeeName: user.name };
      }
      
      const data = await dbService.getLeaveRequests(filter);
      setRequests(data);
    } catch (err) {
      console.error("Fetch leave error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const calculateWorkingDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
    
    let count = 0;
    const curDate = new Date(startDate.getTime());
    while (curDate <= endDate) {
      const dayOfWeek = curDate.getDay();
      if (dayOfWeek !== 5 && dayOfWeek !== 6) count++;
      curDate.setDate(curDate.getDate() + 1);
    }
    return count;
  };

  const workingDaysRequested = calculateWorkingDays(formData.startDate, formData.endDate);
  const isExtendedSickLeave = formData.type === 'Sick' && workingDaysRequested > 3;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeData) return;
    
    if (workingDaysRequested <= 0) {
      alert("Invalid date range selected.");
      return;
    }

    if (isExtendedSickLeave && !medicalCertificate) {
      alert("A medical certificate is mandatory for sick leaves exceeding 3 days per Kuwait Labor Law.");
      return;
    }

    setSubmitting(true);
    try {
      await dbService.createLeaveRequest({
        employeeId: user.id,
        employeeName: user.name,
        department: user.department || employeeData.department || 'General',
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate,
        days: workingDaysRequested,
        reason: formData.reason,
        status: 'Pending',
        managerId: employeeData.managerId || 'admin-1',
        createdAt: new Date().toISOString()
      });
      setShowForm(false);
      setFormData({ type: 'Annual', startDate: '', endDate: '', reason: '' });
      setMedicalCertificate(null);
      await fetchData();
    } catch (err: any) {
      alert("Submission Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (requestId: string, newStatus: LeaveRequest['status']) => {
    try {
      await dbService.updateLeaveRequestStatus(requestId, newStatus);
      await fetchData();
    } catch (err: any) {
      alert("Workflow error: " + err.message);
    }
  };

  const initiateResumption = (request: LeaveRequest) => {
    setResumingRequestId(request.id);
    setResumptionDate(new Date().toISOString().split('T')[0]);
  };

  const submitResumption = async (request: LeaveRequest) => {
    if (!resumptionDate) return;

    if (resumptionDate < request.startDate) {
      alert(`Invalid Return Date: You cannot resume duty before your leave start date (${request.startDate}).`);
      return;
    }

    try {
      setLoading(true);
      await dbService.updateLeaveRequestStatus(request.id, 'Resumed - Awaiting Approval', { actualReturnDate: resumptionDate });
      await fetchData();
      setResumingRequestId(null);
      alert(`Duty resumed on ${resumptionDate}. Please wait for your manager to approve the return to finalize balance deduction.`);
    } catch (err: any) {
      console.error("Resumption error:", err);
      alert("Failed to resume duty: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveResumption = async (request: LeaveRequest) => {
    if (!window.confirm(`Approve Return for ${request.employeeName}? This will calculate final days from ${request.startDate} to ${request.actualReturnDate} and deduct them from their balance.`)) return;

    try {
      setLoading(true);
      const result = await dbService.approveResumption(request.id);
      await fetchData();
      alert(`Return Approved! Total days deducted: ${result.actualDaysUsed}`);
    } catch (err: any) {
      console.error("Approval error:", err);
      alert("Failed to approve resumption: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calendar logic
  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Padding for start of month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [calendarDate]);

  const getLeavesForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return requests.filter(req => {
      return (req.status === 'Approved' || req.status === 'Pending') &&
             dateStr >= req.startDate && 
             dateStr <= req.endDate;
    });
  };

  const changeMonth = (offset: number) => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + offset, 1));
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Leave Management Hub</h2>
          <p className="text-slate-500 text-sm">Track team availability and national workforce leaves.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className={`px-6 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${
            showForm ? 'bg-slate-200 text-slate-600' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20'
          }`}
        >
          {showForm ? 'Cancel' : 'Request New Leave'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm animate-in zoom-in-95">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Leave Category</label>
              <select 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value as LeaveType})}
              >
                <option value="Annual">Annual Leave</option>
                <option value="Sick">Sick Leave</option>
                <option value="Emergency">Emergency Leave</option>
                <option value="Maternity">Maternity Leave</option>
                <option value="Hajj">Hajj Leave</option>
              </select>

              {formData.type === 'Sick' && (
                <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-indigo-600">ℹ️</span>
                    <p className="text-[10px] font-black text-indigo-800 uppercase tracking-widest">Kuwait Labor Law Info (Art. 69)</p>
                  </div>
                  <p className="text-[11px] text-indigo-700 leading-relaxed">
                    Employees are entitled to up to <strong>85 days</strong> of sick leave per year:
                  </p>
                  <ul className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
                    <li className="text-[10px] text-indigo-600 flex items-center gap-1">• 15 Days: <span className="font-bold">Full Pay</span></li>
                    <li className="text-[10px] text-indigo-600 flex items-center gap-1">• 10 Days: <span className="font-bold">75% Pay</span></li>
                    <li className="text-[10px] text-indigo-600 flex items-center gap-1">• 10 Days: <span className="font-bold">50% Pay</span></li>
                    <li className="text-[10px] text-indigo-600 flex items-center gap-1">• 10 Days: <span className="font-bold">25% Pay</span></li>
                    <li className="text-[10px] text-indigo-600 flex items-center gap-1">• 30 Days: <span className="font-bold">No Pay</span></li>
                  </ul>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Duration Period</label>
              <div className="flex items-center gap-2">
                <input 
                  required type="date" 
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                  value={formData.startDate}
                  onChange={e => setFormData({...formData, startDate: e.target.value})}
                />
                <span className="text-slate-400">to</span>
                <input 
                  required type="date" 
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                  value={formData.endDate}
                  onChange={e => setFormData({...formData, endDate: e.target.value})}
                />
              </div>
              
              {isExtendedSickLeave && (
                <div className="mt-4 animate-in slide-in-from-right-4">
                  <label className="block text-xs font-bold text-rose-600 uppercase mb-2">{"Medical Report Required (>3 Days)"}</label>
                  <div className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all ${medicalCertificate ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200 hover:border-rose-300'}`}>
                    <input 
                      type="file" 
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => setMedicalCertificate(e.target.files?.[0] || null)}
                    />
                    {medicalCertificate ? (
                      <div className="flex flex-col items-center">
                        <span className="text-2xl mb-1">📄</span>
                        <p className="text-xs font-bold text-emerald-700">{medicalCertificate.name}</p>
                        <p className="text-[10px] text-emerald-500">Document ready for verification</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-2xl mb-1 opacity-50">📤</span>
                        <p className="text-[11px] font-bold text-rose-700">Attach Medical Certificate</p>
                        <p className="text-[9px] text-rose-500 uppercase font-black mt-1">PDF, JPG or PNG</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-2 flex justify-between items-center bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
               <div>
                 <p className="text-xs font-bold text-emerald-800">Working Days (Planned)</p>
                 <p className="text-3xl font-black text-emerald-600">
                   {workingDaysRequested} Days
                 </p>
               </div>
               <div className="flex flex-col items-end">
                 <button 
                   type="submit"
                   disabled={submitting || (isExtendedSickLeave && !medicalCertificate)}
                   className={`px-10 py-4 rounded-xl font-bold shadow-xl transition-all active:scale-95 ${
                    isExtendedSickLeave && !medicalCertificate 
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20'
                   }`}
                 >
                   {submitting ? 'Processing...' : 'Confirm Request'}
                 </button>
                 {isExtendedSickLeave && !medicalCertificate && (
                   <p className="text-[10px] text-rose-600 font-bold mt-2 animate-pulse">Missing Medical Certificate</p>
                 )}
               </div>
            </div>
          </form>
        </div>
      )}

      {/* Calendar Section */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Workforce Availability</h3>
            <p className="text-xs text-slate-500 uppercase font-black tracking-widest mt-1">
              {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
            <button 
              onClick={() => changeMonth(-1)}
              className="w-8 h-8 rounded-lg hover:bg-white hover:shadow-sm flex items-center justify-center text-slate-400 transition-all"
            >
              ←
            </button>
            <button 
              onClick={() => setCalendarDate(new Date())}
              className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-600"
            >
              Today
            </button>
            <button 
              onClick={() => changeMonth(1)}
              className="w-8 h-8 rounded-lg hover:bg-white hover:shadow-sm flex items-center justify-center text-slate-400 transition-all"
            >
              →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-50 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="py-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-2xl overflow-hidden border border-slate-100">
          {calendarDays.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} className="bg-slate-50 h-32 opacity-50"></div>;
            
            const dayLeaves = getLeavesForDay(date);
            const isToday = date.toISOString().split('T')[0] === today;

            return (
              <div key={date.toISOString()} className={`bg-white h-32 p-2 flex flex-col gap-1 overflow-y-auto group hover:bg-slate-50/80 transition-colors ${isToday ? 'bg-emerald-50/30' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[11px] font-bold ${isToday ? 'bg-emerald-600 text-white w-5 h-5 rounded-full flex items-center justify-center' : 'text-slate-400'}`}>
                    {date.getDate()}
                  </span>
                  {dayLeaves.length > 0 && (
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">{dayLeaves.length} {dayLeaves.length === 1 ? 'Leave' : 'Leaves'}</span>
                  )}
                </div>
                {dayLeaves.map(req => (
                  <div 
                    key={req.id} 
                    className={`px-2 py-1 rounded-md text-[9px] font-bold truncate transition-all ${
                      req.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}
                    title={`${req.employeeName}: ${req.type}`}
                  >
                    {req.employeeName.split(' ')[0]} • {req.type.slice(0, 1)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
               <h3 className="font-bold text-slate-800">Leave Activity Feed</h3>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{requests.length} Records Found</span>
            </div>
            <div className="divide-y divide-slate-50">
              {loading ? (
                <div className="p-20 text-center animate-pulse text-slate-400">Updating records...</div>
              ) : requests.length > 0 ? (
                requests.map((req) => (
                  <div key={req.id} className="p-6 flex flex-col hover:bg-slate-50/50 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex flex-col items-center justify-center border border-slate-200">
                          <span className="text-[10px] font-black text-slate-400 uppercase leading-none">{req.type.slice(0, 3)}</span>
                          <span className="text-lg font-bold text-slate-700">{req.days}</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">
                            {req.employeeName} 
                            <span className="ml-2 font-normal text-slate-400">• {req.type}</span>
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {new Date(req.startDate).toLocaleDateString()} — {new Date(req.endDate).toLocaleDateString()}
                            {req.actualReturnDate && (
                              <span className="ml-2 text-indigo-600 font-bold">• Resumed {new Date(req.actualReturnDate).toLocaleDateString()}</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                          req.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                          req.status === 'Resumed - Awaiting Approval' ? 'bg-indigo-100 text-indigo-700 animate-pulse' :
                          req.status === 'Completed' ? 'bg-slate-100 text-slate-500' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {req.status}
                        </div>

                        {user.name === req.employeeName && req.status === 'Approved' && today >= req.startDate && !resumingRequestId && (
                          <button 
                            type="button"
                            onClick={() => initiateResumption(req)}
                            className="px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 flex items-center gap-2 active:scale-95"
                          >
                            <span>🔙</span> Resume Duty
                          </button>
                        )}

                        {(user.role === 'Manager' || user.role === 'Admin') && (
                          <div className="flex gap-2">
                            {user.name !== req.employeeName && req.status === 'Pending' && (
                              <>
                                <button onClick={() => handleStatusUpdate(req.id, 'Approved')} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 font-bold text-xs">Approve</button>
                                <button onClick={() => handleStatusUpdate(req.id, 'Rejected')} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 font-bold text-xs">Reject</button>
                              </>
                            )}
                            {req.status === 'Resumed - Awaiting Approval' && (
                              <button 
                                onClick={() => handleApproveResumption(req)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-xs shadow-md shadow-indigo-600/20"
                              >
                                Approve Return
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Inline Resumption Form */}
                    {resumingRequestId === req.id && (
                      <div className="mt-4 p-5 bg-blue-50 border border-blue-100 rounded-2xl animate-in slide-in-from-top-2">
                        <div className="flex flex-col sm:flex-row items-end gap-4">
                          <div className="flex-1 w-full">
                            <label className="block text-[10px] font-black text-blue-700 uppercase tracking-widest mb-2">Confirm Actual Return Date</label>
                            <input 
                              type="date" 
                              className="w-full px-4 py-2.5 rounded-xl border border-blue-200 bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              value={resumptionDate}
                              onChange={(e) => setResumptionDate(e.target.value)}
                            />
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setResumingRequestId(null)}
                              className="px-4 py-2.5 bg-white text-slate-500 border border-slate-200 rounded-xl font-bold text-xs hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => submitResumption(req)}
                              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-600/10 hover:bg-blue-700"
                            >
                              Submit Resumption
                            </button>
                          </div>
                        </div>
                        {resumptionDate && resumptionDate < req.startDate && (
                          <p className="text-[10px] text-rose-600 font-bold mt-2">Invalid: Date cannot be before leave start date.</p>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-20 text-center text-slate-400">
                  <p className="text-3xl mb-3 opacity-20">📂</p>
                  <p className="text-sm">No leave records to display.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
             <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Available Balances</h3>
             <div className="space-y-4">
                {[
                  { label: 'Annual', val: employeeData?.leaveBalances.annual || 0, max: 30, color: 'emerald' },
                  { label: 'Sick', val: employeeData?.leaveBalances.sick || 0, max: 15, color: 'rose' },
                  { label: 'Emergency', val: employeeData?.leaveBalances.emergency || 0, max: 6, color: 'amber' }
                ].map((b, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                     <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-600">{b.label} Leave</span>
                        <span className={`text-xs font-black text-${b.color === 'emerald' ? 'emerald' : b.color === 'rose' ? 'rose' : 'amber'}-600`}>{b.val}d left</span>
                     </div>
                     <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className={`bg-${b.color === 'emerald' ? 'emerald' : b.color === 'rose' ? 'rose' : 'amber'}-500 h-full transition-all duration-500`} style={{ width: `${Math.min(100, (b.val / b.max) * 100)}%` }}></div>
                     </div>
                  </div>
                ))}
             </div>
             <div className="mt-8 p-5 bg-blue-50 border border-blue-100 rounded-2xl">
                <p className="text-[10px] font-black text-blue-800 uppercase mb-2">Resumption Process</p>
                <div className="space-y-2">
                  <p className="text-[11px] text-blue-700 leading-snug">
                    1. <strong>Employee:</strong> Submits return date via Resume Duty.
                  </p>
                  <p className="text-[11px] text-blue-700 leading-snug">
                    2. <strong>Manager:</strong> Reviews and approves return.
                  </p>
                  <p className="text-[11px] text-blue-700 leading-snug">
                    3. <strong>System:</strong> Final balance deduction occurs.
                  </p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveManagement;
