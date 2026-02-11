
import React, { useState, useEffect, useMemo } from 'react';
import { User, LeaveRequest, LeaveType, Employee, PublicHoliday } from '../types.ts';
import { dbService, calculateLeaveDays } from '../services/dbService.ts';
import { useNotifications } from './NotificationSystem.tsx';
import { useTranslation } from 'react-i18next';

interface LeaveManagementProps {
  user: User;
}

const LeaveManagement: React.FC<LeaveManagementProps> = ({ user }) => {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const { notify, confirm } = useNotifications();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [personalRequests, setPersonalRequests] = useState<LeaveRequest[]>([]);
  const [publicHolidays, setPublicHolidays] = useState<PublicHoliday[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const [hrEditDays, setHrEditDays] = useState<Record<string, number>>({});
  const [hrIncludeSaturdays, setHrIncludeSaturdays] = useState<Record<string, boolean>>({});
  const [employeeMap, setEmployeeMap] = useState<Record<string, Employee>>({});

  // Pagination states
  const [approvalPage, setApprovalPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const itemsPerPage = 5;

  const [formData, setFormData] = useState({
    type: 'Annual' as LeaveType,
    startDate: '',
    endDate: '', 
    reason: ''
  });

  const holidayDates = useMemo(() => publicHolidays.map(h => h.date), [publicHolidays]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profile, allEmployees, holidayData] = await Promise.all([
        dbService.getEmployeeByName(user.name),
        dbService.getEmployees(),
        dbService.getPublicHolidays()
      ]);
      
      if (profile) setEmployeeData(profile);
      setPublicHolidays(holidayData);
      
      const empMap: Record<string, Employee> = {};
      allEmployees.forEach(e => empMap[e.id] = e);
      setEmployeeMap(empMap);

      let filter: any = {};
      if (user.role === 'Manager') {
        filter = { department: user.department };
      } else if (user.role === 'Admin' || user.role === 'HR') {
        filter = {}; 
      } else {
        filter = { employeeId: user.id };
      }
      
      const [teamData, personalData] = await Promise.all([
        dbService.getLeaveRequests(filter),
        dbService.getLeaveRequests({ employeeId: user.id })
      ]);
      
      setRequests(teamData);
      setPersonalRequests(personalData);

      const dayMap: Record<string, number> = {};
      const satMap: Record<string, boolean> = {};
      
      teamData.forEach(r => {
        const emp = empMap[r.employeeId];
        const defaultIncludeSat = emp ? emp.workDaysPerWeek === 6 : false;
        dayMap[r.id] = r.days;
        satMap[r.id] = defaultIncludeSat;
      });
      
      setHrEditDays(dayMap);
      setHrIncludeSaturdays(satMap);
    } catch (err) {
      console.error("Fetch leave error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const availableBalances = useMemo(() => {
    if (!employeeData || !employeeData.leaveBalances) {
      return { annual: 0, sick: 0, emergency: 0, pending: { annual: 0, sick: 0, emergency: 0 } };
    }
    
    const pendingRequests = personalRequests.filter(r => 
      ['Pending', 'Manager_Approved', 'HR_Approved', 'Resumed'].includes(r.status)
    );

    const pending = {
      annual: pendingRequests.filter(r => r.type === 'Annual').reduce((acc, curr) => acc + curr.days, 0),
      sick: pendingRequests.filter(r => r.type === 'Sick').reduce((acc, curr) => acc + curr.days, 0),
      emergency: pendingRequests.filter(r => r.type === 'Emergency').reduce((acc, curr) => acc + curr.days, 0),
    };

    const balances = employeeData.leaveBalances;

    return {
      annual: Math.max(0, (balances.annual || 0) - (balances.annualUsed || 0) - pending.annual),
      sick: Math.max(0, (balances.sick || 0) - (balances.sickUsed || 0) - pending.sick),
      emergency: Math.max(0, (balances.emergency || 0) - (balances.emergencyUsed || 0) - pending.emergency),
      pending
    };
  }, [employeeData, personalRequests]);

  const calculationBreakdown = useMemo(() => {
    if (!formData.startDate || !formData.endDate) return { total: 0, holidays: [], weekends: [] };
    
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const isFiveDayWorker = employeeData?.workDaysPerWeek === 5;
    
    let total = 0;
    const holidaysFound: string[] = [];
    const weekendsFound: string[] = [];
    
    let current = new Date(start.getTime());
    while (current <= end) {
      const dayOfWeek = current.getDay();
      const dateStr = current.toLocaleDateString('en-CA'); 
      const holiday = publicHolidays.find(h => h.date === dateStr);

      if (dayOfWeek === 5) {
        weekendsFound.push(`${dateStr} (${language === 'ar' ? 'الجمعة' : 'Friday'})`);
      } else if (dayOfWeek === 6 && isFiveDayWorker) {
        weekendsFound.push(`${dateStr} (${language === 'ar' ? 'السبت' : 'Saturday'})`);
      } else if (holiday) {
        holidaysFound.push(`${dateStr} (${holiday.name})`);
      } else {
        total++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return { total, holidays: holidaysFound, weekends: weekendsFound };
  }, [formData.startDate, formData.endDate, employeeData, publicHolidays, language]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (calculationBreakdown.total <= 0) {
      notify(t('warning'), t('noneDetected'), "warning");
      return;
    }
    
    setSubmitting(true);
    try {
      await dbService.createLeaveRequest({
        employeeId: user.id,
        employeeName: user.name,
        department: user.department || employeeData?.department || 'General',
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate,
        days: calculationBreakdown.total,
        reason: formData.reason,
        status: 'Pending',
        managerId: employeeData?.managerId || '00000000-0000-0000-0000-000000000000',
        createdAt: new Date().toISOString(),
        history: []
      }, user);
      setShowForm(false);
      setFormData({ type: 'Annual', startDate: '', endDate: '', reason: '' });
      await fetchData();
      notify(t('success'), t('leaveApprovedMsg'), "success");
    } catch (err: any) {
      notify(t('critical'), err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleManagerApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await dbService.updateLeaveRequestStatus(id, 'Manager_Approved', user);
      await fetchData();
      notify(t('success'), t('approveForward'), "success");
    } catch (err: any) {
      notify(t('critical'), err.message, "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleHRApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await dbService.updateLeaveRequestStatus(id, 'HR_Approved', user, "HR pre-approval complete. Awaiting resumption.");
      await fetchData();
      notify(t('success'), t('hrVerifyAuthorize'), "success");
    } catch (err: any) {
      notify(t('critical'), err.message, "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleResumption = async (id: string) => {
    setProcessingId(id);
    try {
      await dbService.updateLeaveRequestStatus(id, 'Resumed', user, "Employee confirmed resumption to work.");
      await fetchData();
      notify(t('success'), t('resumeDuty'), "success");
    } catch (err: any) {
      notify(t('critical'), err.message, "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleHRFinalize = async (req: LeaveRequest) => {
    const finalizedDays = hrEditDays[req.id] || req.days;
    confirm({
      title: t('finalizeSync'),
      message: `${t('confirmedDeductible')} ${finalizedDays} ${language === 'ar' ? 'أيام لـ' : 'days for'} ${req.employeeName}.`,
      confirmText: t('finalizeSync'),
      onConfirm: async () => {
        setProcessingId(req.id);
        try {
          await dbService.finalizeHRApproval(req.id, user, finalizedDays);
          await fetchData();
          notify(t('success'), t('officialRecord'), "success");
        } catch (err: any) {
          notify(t('critical'), err.message, "error");
        } finally {
          setProcessingId(null);
        }
      }
    });
  };

  const toggleSaturdayInclusion = (req: LeaveRequest) => {
    const emp = employeeMap[req.employeeId];
    if (emp && emp.workDaysPerWeek === 5) return;
    
    const newValue = !hrIncludeSaturdays[req.id];
    setHrIncludeSaturdays(prev => ({ ...prev, [req.id]: newValue }));
    
    const recalculated = calculateLeaveDays(req.startDate, req.endDate, req.type, newValue, holidayDates);
    setHrEditDays(prev => ({ ...prev, [req.id]: recalculated }));
  };

  const getLeaveIcon = (type: string) => {
    switch (type) {
      case 'Annual': return '🌴';
      case 'Sick': return '🤒';
      case 'Emergency': return '🚨';
      case 'Maternity': return '👶';
      case 'Hajj': return '🕌';
      default: return '📅';
    }
  };

  const isHrAdmin = user.role === 'Admin' || user.role === 'HR';
  const isManagerAdmin = user.role === 'Manager' || user.role === 'Admin';

  const approvalRequests = requests.filter(r => r.status !== 'HR_Finalized' && r.status !== 'Rejected' && r.status !== 'Paid');
  const paginatedApproval = approvalRequests.slice((approvalPage - 1) * itemsPerPage, approvalPage * itemsPerPage);
  const totalApprovalPages = Math.ceil(approvalRequests.length / itemsPerPage);

  const paginatedHistory = personalRequests.slice((historyPage - 1) * itemsPerPage, historyPage * itemsPerPage);
  const totalHistoryPages = Math.ceil(personalRequests.length / itemsPerPage);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{t('kuwaitLaborWorkflow')}</h2>
          <p className="text-slate-500 text-sm">{t('automatedCompliance')}</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className={`px-6 py-3 rounded-2xl font-bold transition-all shadow-lg active:scale-95 ${
            showForm ? 'bg-slate-200 text-slate-600 shadow-none' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20'
          }`}
        >
          {showForm ? t('cancel') : t('newLeaveRequest')}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm animate-in zoom-in-95 duration-200">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t('leaveType')}</label>
                <select 
                  className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-700"
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value as LeaveType})}
                >
                  <option value="Annual">🌴 {t('annualArt70')}</option>
                  <option value="Sick">🤒 {t('sickArt69')}</option>
                  <option value="Emergency">🚨 {t('emergencyLeave')}</option>
                  <option value="Maternity">👶 {t('maternityLeave')}</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t('leavePeriod')}</label>
                <div className="space-y-3">
                  <input required type="date" className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                  <p className="text-center text-[10px] text-slate-400 font-black uppercase">{t('to')}</p>
                  <input required type="date" className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-bold" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-8">
              <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 min-h-[200px]">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{t('calcAudit')}</h4>
                {formData.startDate && formData.endDate ? (
                  <div className="space-y-4">
                    <div className="flex items-end justify-between border-b border-slate-200 pb-4">
                      <div>
                        <p className="text-4xl font-black text-slate-900">{calculationBreakdown.total} <span className="text-sm text-slate-400">{t('billableDays')}</span></p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] px-3 py-1 bg-white border border-slate-200 rounded-lg font-black text-slate-500 uppercase">
                          {employeeData?.workDaysPerWeek} {t('workingDaysWeek')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">{t('holidaysDeducted')} ({calculationBreakdown.holidays.length})</p>
                        {calculationBreakdown.holidays.length > 0 ? (
                          calculationBreakdown.holidays.map((h, i) => <p key={i} className="text-[11px] font-bold text-slate-600">🏛️ {h}</p>)
                        ) : <p className="text-[11px] text-slate-400 italic">{t('noneDetected')}</p>}
                      </div>
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">{t('weekendsDeducted')} ({calculationBreakdown.weekends.length})</p>
                        {calculationBreakdown.weekends.length > 0 ? (
                          calculationBreakdown.weekends.map((w, i) => <p key={i} className="text-[11px] font-bold text-slate-600">🗓️ {w}</p>)
                        ) : <p className="text-[11px] text-slate-400 italic">{t('noneDetected')}</p>}
                      </div>
                    </div>
                    
                    <div className="mt-2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                       <p className="text-[10px] text-indigo-700 font-bold">
                         ℹ️ {language === 'ar' ? 'ملاحظة: تحتسب أيام السبت ضمن الإجازة للعاملين لمدة ٦ أيام، بينما يتم تخطيها للعاملين لمدة ٥ أيام.' : 'Note: Saturdays are counted as leave days for 6-day workers. For 5-day workers, Saturdays and Fridays are skipped.'}
                       </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-300 italic text-sm text-center">
                    {t('enterDatesPrompt')}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-6">
                <textarea 
                  placeholder={t('reasonRequest')}
                  className="flex-1 px-5 py-4 rounded-2xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500 outline-none text-sm min-h-[80px]"
                  value={formData.reason}
                  onChange={e => setFormData({...formData, reason: e.target.value})}
                />
                <button type="submit" disabled={submitting || calculationBreakdown.total <= 0} className="px-12 py-6 bg-emerald-600 text-white rounded-3xl font-black text-sm shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-30 active:scale-95 transition-all">
                  {submitting ? '...' : t('submitApp')}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {(user.role !== 'Employee' || isHrAdmin) && (
            <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 tracking-tight">{t('execApprovalFeed')}</h3>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('pendingDecisions')}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {paginatedApproval.map((req) => {
                  const emp = employeeMap[req.employeeId];
                  const includeSat = hrIncludeSaturdays[req.id] ?? (emp?.workDaysPerWeek === 6);
                  
                  return (
                    <div key={req.id} className="p-8 hover:bg-slate-50/30 transition-all text-start">
                      <div className="flex flex-col gap-6">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl border border-slate-200">
                              {getLeaveIcon(req.type)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                {req.employeeName}
                                <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded uppercase font-black">{req.department}</span>
                              </p>
                              <p className="text-xs text-slate-500 font-medium tracking-tight">
                                {req.startDate} → {req.endDate} ({req.days} {language === 'ar' ? 'أيام عمل' : 'working days'})
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${
                              req.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 
                              req.status === 'Manager_Approved' ? 'bg-indigo-100 text-indigo-700' :
                              req.status === 'HR_Approved' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-rose-100 text-rose-700'
                            }`}>
                              {t(req.status.toLowerCase().replace('_', '')) || req.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-4">
                          {isManagerAdmin && req.status === 'Pending' && (
                            <button 
                              disabled={processingId === req.id}
                              onClick={() => handleManagerApprove(req.id)}
                              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-black transition-all active:scale-95"
                            >
                              {t('approveForward')}
                            </button>
                          )}

                          {isHrAdmin && req.status === 'Manager_Approved' && (
                            <button 
                              disabled={processingId === req.id}
                              onClick={() => handleHRApprove(req.id)}
                              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-emerald-700 transition-all active:scale-95"
                            >
                              {t('hrVerifyAuthorize')}
                            </button>
                          )}

                          {isHrAdmin && req.status === 'Resumed' && (
                            <div className="w-full bg-slate-50 p-8 rounded-[32px] border border-slate-200 space-y-6">
                              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                                <h4 className="text-xs font-black text-slate-900 uppercase">{t('payrollReconHub')}</h4>
                                <div className="flex items-center gap-4">
                                  <span className="text-[10px] font-bold text-slate-500">{t('includeSat')}</span>
                                  <button onClick={() => toggleSaturdayInclusion(req)} className={`w-10 h-5 rounded-full relative transition-colors ${includeSat ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${includeSat ? (language === 'ar' ? 'right-[22px]' : 'left-[22px]') : (language === 'ar' ? 'right-0.5' : 'left-0.5')}`}></div>
                                  </button>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold text-slate-500 uppercase">{t('confirmedDeductible')}</p>
                                <input type="number" className="w-20 px-3 py-2 border border-slate-300 rounded-xl font-black text-sm bg-white" value={hrEditDays[req.id] || req.days} onChange={e => setHrEditDays({...hrEditDays, [req.id]: parseInt(e.target.value) || 0})} />
                              </div>

                              <button onClick={() => handleHRFinalize(req)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-indigo-700 transition-all">
                                {t('finalizeSync')}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {approvalRequests.length === 0 && (
                  <div className="p-16 text-center text-slate-400 font-medium italic">{t('allTasksDone')}</div>
                )}
              </div>
              {approvalRequests.length > itemsPerPage && (
                <div className="p-6 border-t border-slate-50 flex items-center justify-center gap-4 bg-slate-50/10" dir="ltr">
                  <button 
                    disabled={approvalPage === 1}
                    onClick={() => setApprovalPage(p => p - 1)}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-30"
                  >
                    ←
                  </button>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{approvalPage} / {totalApprovalPages}</span>
                  <button 
                    disabled={approvalPage === totalApprovalPages}
                    onClick={() => setApprovalPage(p => p + 1)}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-30"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 tracking-tight">{t('myHistory')}</h3>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{personalRequests.length} {t('requestsFound')}</span>
            </div>
            <div className="divide-y divide-slate-100">
               {paginatedHistory.map(req => (
                 <div key={req.id} className="p-8 hover:bg-slate-50/30 transition-all text-start">
                   <div className="flex justify-between items-center">
                     <div className="flex items-center gap-4">
                       <span className="text-2xl">{getLeaveIcon(req.type)}</span>
                       <div>
                         <p className="font-bold text-slate-900 text-sm">{language === 'ar' ? t(req.type.toLowerCase()) : req.type} {t('leavePeriod')}</p>
                         <p className="text-[10px] text-slate-500 font-medium uppercase">{req.startDate} {t('to')} {req.endDate} ({req.days}d)</p>
                       </div>
                     </div>
                     <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                       req.status === 'Paid' || req.status === 'HR_Finalized' ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-700'
                     }`}>
                       {t(req.status.toLowerCase().replace('_', '')) || req.status.replace('_', ' ')}
                     </span>
                   </div>

                   {req.status === 'HR_Approved' && (
                     <div className="mt-6 bg-indigo-50 p-6 rounded-[24px] border border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-[11px] text-indigo-800 font-bold italic leading-relaxed text-start">{t('resumptionAuthorize')}</p>
                        <button 
                          disabled={processingId === req.id}
                          onClick={() => handleResumption(req.id)}
                          className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-[0.15em] hover:bg-indigo-700 shadow-lg active:scale-95 transition-all w-full md:w-auto"
                        >
                          {t('confirmResumption')}
                        </button>
                     </div>
                   )}
                 </div>
               ))}
               {personalRequests.length === 0 && (
                 <div className="p-16 text-center text-slate-400 font-medium italic">{t('noRecords')}</div>
               )}
            </div>
            {personalRequests.length > itemsPerPage && (
              <div className="p-6 border-t border-slate-50 flex items-center justify-center gap-4 bg-slate-50/10" dir="ltr">
                <button 
                  disabled={historyPage === 1}
                  onClick={() => setHistoryPage(p => p - 1)}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-30"
                >
                  ←
                </button>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{historyPage} / {totalHistoryPages}</span>
                <button 
                  disabled={historyPage === totalHistoryPages}
                  onClick={() => setHistoryPage(p => p + 1)}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-30"
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
             <div className="flex items-center justify-between mb-8">
               <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 text-start">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                 {t('availableBalances')}
               </h3>
               <span className="text-[8px] font-black text-slate-400 border border-slate-200 px-2 py-0.5 rounded">{t('netTotal')}</span>
             </div>
             <div className="space-y-8">
                {[
                  { label: t('annualArt70'), val: availableBalances.annual, pending: availableBalances.pending.annual, max: 30, color: 'emerald' },
                  { label: t('sickThreshold'), val: availableBalances.sick, pending: availableBalances.pending.sick, max: 45, color: 'rose' },
                  { label: t('emergencyAllocation'), val: availableBalances.emergency, pending: availableBalances.pending.emergency, max: 6, color: 'amber' }
                ].map((b, i) => (
                  <div key={i}>
                     <div className="flex justify-between items-center mb-2 px-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-start">{b.label}</span>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-900">{b.val} / {b.max}d</span>
                          {b.pending > 0 && (
                            <p className="text-[8px] font-bold text-amber-600 uppercase tracking-tight mt-0.5 animate-pulse">
                              - {b.pending}{t('pendingDays')}
                            </p>
                          )}
                        </div>
                     </div>
                     <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden relative">
                        <div 
                          className={`absolute top-0 h-full transition-all duration-1000 ${b.color === 'rose' ? 'bg-rose-500/30' : (b.color === 'emerald' ? 'bg-emerald-500/30' : 'bg-amber-500/30')} ${language === 'ar' ? 'right-0' : 'left-0'}`} 
                          style={{ width: `${Math.min(100, (((b.val + b.pending)) / b.max) * 100)}%` }}
                        ></div>
                        <div 
                          className={`absolute top-0 h-full transition-all duration-1000 ${b.color === 'rose' ? 'bg-rose-500' : (b.color === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500')} ${language === 'ar' ? 'right-0' : 'left-0'}`} 
                          style={{ width: `${Math.min(100, (b.val / b.max) * 100)}%` }}
                        ></div>
                     </div>
                  </div>
                ))}
                <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-start">
                  <p className="text-[9px] text-slate-500 leading-relaxed italic">
                    {t('balanceLogic')}
                  </p>
                </div>
             </div>
          </div>

          <div className="bg-slate-900 p-10 rounded-[40px] text-white shadow-2xl relative overflow-hidden group text-start">
             <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500">
               <span className="text-[140px]">🏛️</span>
             </div>
             <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-6">{t('workflowIntel')}</h4>
             <ul className="space-y-4 text-[11px] font-medium text-slate-400">
               <li className="flex items-start gap-3">
                 <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] flex-shrink-0">1</span>
                 {t('workflowStep1')}
               </li>
               <li className="flex items-start gap-3">
                 <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] flex-shrink-0">2</span>
                 {t('workflowStep2')}
               </li>
               <li className="flex items-start gap-3">
                 <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] flex-shrink-0">3</span>
                 {t('workflowStep3')}
               </li>
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveManagement;
