
import { supabase, isSupabaseConfigured } from './supabaseClient.ts';
import { Employee, DepartmentMetric, LeaveRequest, LeaveBalances, Notification, LeaveType, User, LeaveHistoryEntry, PayrollEntry, PayrollRun, PayrollItem, SettlementResult, PublicHoliday, AttendanceRecord } from '../types.ts';
import { MOCK_EMPLOYEES, MOCK_LEAVE_REQUESTS, DEPARTMENT_METRICS, KUWAIT_PUBLIC_HOLIDAYS } from '../constants.tsx';

// Local stores for demo/mock mode persistence
let localRequests = [...MOCK_LEAVE_REQUESTS];
let localEmployees = [...MOCK_EMPLOYEES].map(emp => ({
  ...emp,
  civilId: emp.civilId || (emp.nationality === 'Kuwaiti' ? '280000000000' : '285000000000'),
  civilIdExpiry: emp.civilIdExpiry || (emp.nationality === 'Kuwaiti' ? '2026-12-31' : '2024-05-15'),
  passportNumber: emp.passportNumber || 'K12345678',
  passportExpiry: emp.passportExpiry || '2029-01-01',
  iznAmalExpiry: emp.iznAmalExpiry || (emp.nationality === 'Expat' ? '2024-08-30' : undefined)
}));
let localNotifications: Notification[] = [];
let localPayroll: PayrollEntry[] = [];
let localPayrollRuns: PayrollRun[] = [];
let localPayrollItems: PayrollItem[] = [];
let localAttendance: AttendanceRecord[] = [];

const PIFSS_RATE = 0.115;

const isUUID = (str: string) => 
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export const toLocalDateString = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

export const getSickTierInfo = (daysUsed: number) => {
  if (daysUsed <= 15) return { deduction: 0, label: '100%' };
  if (daysUsed <= 25) return { deduction: 0.25, label: '75%' };
  if (daysUsed <= 35) return { deduction: 0.50, label: '50%' };
  if (daysUsed <= 45) return { deduction: 0.75, label: '25%' };
  return { deduction: 1.0, label: 'Unpaid' };
};

export const calculateLeaveDays = (
  startDate: string, 
  endDate: string, 
  type: LeaveType, 
  includeSaturday: boolean = false,
  holidays: string[] = []
) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  if (end < start) return 0;
  
  let count = 0;
  let current = new Date(start.getTime());
  while (current <= end) {
    const dayOfWeek = current.getDay();
    const dateStr = current.toISOString().split('T')[0];
    const isHoliday = holidays.includes(dateStr);

    // 5 is Friday (Weekend in Kuwait)
    if (dayOfWeek === 5) {
      // Skip Friday - always off
    } else if (isHoliday) {
      // Skip officially declared Public Holiday
    } else if (dayOfWeek === 6 && !includeSaturday) {
      // Specific user request: "sat is rest day so for 5 word days week employee, sat will be counted as 1 for leave"
      count++;
    } else {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

export const dbService = {
  async getEmployees(): Promise<Employee[]> {
    if (!isSupabaseConfigured || !supabase) return [...localEmployees];
    const { data } = await supabase.from('employees').select('*').order('created_at', { ascending: false });
    return (data || []).map((e: any) => ({
      id: e.id,
      name: e.name,
      nationality: e.nationality,
      civilId: e.civil_id,
      civilIdExpiry: e.civil_id_expiry,
      passportNumber: e.passport_number,
      passportExpiry: e.passport_expiry,
      iznAmalExpiry: e.izn_amal_expiry,
      department: e.department,
      position: e.position,
      joinDate: e.join_date,
      salary: parseFloat(e.salary),
      status: e.status,
      leaveBalances: e.leave_balances,
      trainingHours: e.training_hours || 0,
      workDaysPerWeek: e.work_days_per_week || 6,
      lastResetYear: e.last_reset_year
    }));
  },

  async getPublicHolidays(): Promise<PublicHoliday[]> {
    if (!isSupabaseConfigured || !supabase) return [...KUWAIT_PUBLIC_HOLIDAYS];
    const { data } = await supabase.from('public_holidays').select('*').order('date', { ascending: true });
    if (!data || data.length === 0) return [...KUWAIT_PUBLIC_HOLIDAYS];
    return data.map((h: any) => ({
      id: h.id,
      name: h.name,
      date: h.date,
      type: h.type,
      isFixed: h.is_fixed
    }));
  },

  async getAttendanceRecords(filter?: { employeeId?: string, date?: string }): Promise<AttendanceRecord[]> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('attendance').select('*').order('clockIn', { ascending: false });
      if (filter?.employeeId) query = query.eq('employeeId', filter.employeeId);
      if (filter?.date) query = query.eq('date', filter.date);
      const { data } = await query;
      return data || [];
    }
    let records = [...localAttendance];
    if (filter?.employeeId) records = records.filter(r => r.employeeId === filter.employeeId);
    if (filter?.date) records = records.filter(r => r.date === filter.date);
    return records;
  },

  async logAttendance(record: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord> {
    const newRecord = { ...record, id: Math.random().toString(36).substr(2, 9) };
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('attendance').insert([record]).select().single();
      return data;
    }
    localAttendance.unshift(newRecord);
    return newRecord;
  },

  async clockOutAttendance(employeeId: string, clockOutTime: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    if (isSupabaseConfigured && supabase) {
      await supabase.from('attendance')
        .update({ clockOut: clockOutTime })
        .eq('employeeId', employeeId)
        .eq('date', today);
    } else {
      localAttendance = localAttendance.map(r => 
        (r.employeeId === employeeId && r.date === today) ? { ...r, clockOut: clockOutTime } : r
      );
    }
  },

  async calculateFinalSettlement(employeeId: string, endDate: string, reason: 'Resignation' | 'Termination'): Promise<SettlementResult> {
    const employees = await this.getEmployees();
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) throw new Error("Employee not found");

    const join = new Date(emp.joinDate);
    const end = new Date(endDate);
    
    const diffTime = Math.max(0, end.getTime() - join.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const years = totalDays / 365.25;
    const fullYears = Math.floor(years);
    const months = Math.floor((totalDays % 365) / 30);
    const daysRemainder = Math.floor(totalDays % 30);

    const monthlySalary = emp.salary;
    const dailyRate = monthlySalary / 26;
    
    let firstFiveYearsAmount = 0;
    let subsequentYearsAmount = 0;
    let multiplier = 1.0;

    const tier1Years = Math.min(5, years);
    firstFiveYearsAmount = tier1Years * 15 * dailyRate;

    if (years > 5) {
      const tier2Years = years - 5;
      subsequentYearsAmount = tier2Years * 30 * dailyRate;
    }

    const baseIndemnity = firstFiveYearsAmount + subsequentYearsAmount;

    if (reason === 'Resignation') {
      if (years < 3) {
        multiplier = 0;
      } else if (years >= 3 && years < 5) {
        multiplier = 0.5;
      } else if (years >= 5 && years < 10) {
        multiplier = 2 / 3;
      } else {
        multiplier = 1.0;
      }
    } else {
      multiplier = 1.0;
    }

    const indemnityAmount = baseIndemnity * multiplier;
    const leavePayout = (emp.leaveBalances.annual || 0) * dailyRate;

    return {
      tenureYears: fullYears,
      tenureMonths: months,
      tenureDays: daysRemainder,
      indemnityAmount: indemnityAmount,
      leavePayout: leavePayout,
      totalSettlement: indemnityAmount + leavePayout,
      dailyRate: dailyRate,
      breakdown: {
        baseIndemnity: baseIndemnity,
        multiplierApplied: multiplier,
        firstFiveYearAmount: firstFiveYearsAmount,
        subsequentYearAmount: subsequentYearsAmount,
        leaveDaysEncashed: emp.leaveBalances.annual || 0
      }
    };
  },

  async getAnnouncements() {
    if (!isSupabaseConfigured || !supabase) return [];
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
    return data || [];
  },

  async getDepartmentMetrics(): Promise<DepartmentMetric[]> {
    if (!isSupabaseConfigured || !supabase) {
      const depts = Array.from(new Set(localEmployees.map(e => e.department)));
      return depts.map(d => ({
        name: d,
        kuwaitiCount: localEmployees.filter(e => e.department === d && e.nationality === 'Kuwaiti').length,
        expatCount: localEmployees.filter(e => e.department === d && e.nationality === 'Expat').length,
        targetRatio: 30
      }));
    }
    const results = await Promise.all([
      supabase.from('employees').select('department, nationality'),
      supabase.from('department_configs').select('dept_name, target_ratio')
    ]);
    const empData = results[0].data || [];
    const configData = results[1].data || [];
    
    const depts: string[] = Array.from(new Set(empData.map((e: any) => e.department)));
    return depts.map((d: string) => {
      const config = configData.find((c: any) => c.dept_name === d);
      return {
        name: d,
        kuwaitiCount: empData.filter((e: any) => e.department === d && e.nationality === 'Kuwaiti').length,
        expatCount: empData.filter((e: any) => e.department === d && e.nationality === 'Expat').length,
        targetRatio: config?.target_ratio || 30
      };
    });
  },

  async checkTableStatus() {
    if (!isSupabaseConfigured || !supabase) return { exists: false, isEmpty: true };
    const { count, error } = await supabase.from('employees').select('*', { count: 'exact', head: true });
    return { exists: !error, isEmpty: count === 0 };
  },

  async seedDatabase(): Promise<{ success: boolean; error?: string }> {
    try {
      if (isSupabaseConfigured && supabase) {
        // Seed Employees
        const empPayload = localEmployees.map(emp => ({
          id: emp.id,
          name: emp.name,
          nationality: emp.nationality,
          civil_id: emp.civilId,
          department: emp.department,
          position: emp.position,
          join_date: emp.joinDate,
          salary: emp.salary,
          status: emp.status,
          leave_balances: emp.leaveBalances,
          training_hours: emp.trainingHours || 0,
          work_days_per_week: emp.workDaysPerWeek || 6,
          civil_id_expiry: emp.civilIdExpiry,
          passport_number: emp.passportNumber,
          passport_expiry: emp.passportExpiry,
          izn_amal_expiry: emp.iznAmalExpiry
        }));
        await supabase.from('employees').upsert(empPayload, { onConflict: 'id' });

        // Seed Public Holidays
        const holidayPayload = KUWAIT_PUBLIC_HOLIDAYS.map(h => ({
          id: h.id,
          name: h.name,
          date: h.date,
          type: h.type,
          is_fixed: h.isFixed
        }));
        await supabase.from('public_holidays').upsert(holidayPayload, { onConflict: 'id' });

        return { success: true };
      }
      return { success: true };
    } catch (e: any) { 
      return { success: false, error: e.message }; 
    }
  },

  async truncateLeaveRequests(): Promise<{ success: boolean; error?: string }> {
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('leave_requests').delete().not('id', 'is', null);
        if (error) return { success: false, error: error.message };
      }
      localRequests = [];
      return { success: true };
    } catch (e: any) { 
      return { success: false, error: e.message }; 
    }
  },

  async performYearEndResetWithCarryOver(): Promise<{ success: boolean; error?: string }> {
    try {
      const employees = await this.getEmployees();
      const currentYear = new Date().getFullYear();
      for (const emp of employees) {
        const remaining = Math.max(0, emp.leaveBalances.annual - (emp.leaveBalances.annualUsed || 0));
        const carryOver = Math.min(30, remaining);
        const newBalances: LeaveBalances = {
          annual: 30 + carryOver,
          sick: 15,
          emergency: 6,
          annualUsed: 0,
          sickUsed: 0,
          emergencyUsed: 0
        };
        await this.updateEmployeeBalances(emp.id, newBalances, currentYear);
      }
      return { success: true };
    } catch (e: any) { 
      return { success: false, error: e.message }; 
    }
  },

  async createNotification(notification: any) {
    const newNotif = { 
      ...notification, 
      id: Math.random().toString(36).substr(2, 9), 
      timestamp: new Date().toISOString(), 
      isRead: false 
    };
    localNotifications.unshift(newNotif);
    return newNotif;
  },

  async getNotifications(userId: string) { 
    return localNotifications; 
  },

  async getEmployeeByName(nameOrId: string) {
    const searchVal = nameOrId?.trim();
    if (!searchVal) return null;
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('employees').select('*');
      if (isUUID(searchVal)) {
        query = query.eq('id', searchVal);
      } else {
        query = query.ilike('name', `%${searchVal}%`);
      }
      const { data } = await query.limit(1).maybeSingle();
      if (data) {
        return {
          id: data.id,
          name: data.name,
          nationality: data.nationality,
          civilId: data.civil_id,
          civilIdExpiry: data.civil_id_expiry,
          passportNumber: data.passport_number,
          passportExpiry: data.passport_expiry,
          iznAmalExpiry: data.izn_amal_expiry,
          department: data.department,
          position: data.position,
          joinDate: data.join_date,
          salary: parseFloat(data.salary),
          status: data.status,
          leaveBalances: data.leave_balances,
          trainingHours: data.training_hours || 0,
          workDaysPerWeek: data.work_days_per_week || 6,
          lastResetYear: data.last_reset_year
        } as Employee;
      }
    }
    const mock = localEmployees.find(emp => emp.name.toLowerCase().includes(searchVal.toLowerCase()) || emp.id === searchVal);
    if (mock) return { ...mock, workDaysPerWeek: mock.workDaysPerWeek || 6 };
    return null;
  },

  async updateEmployeeBalances(employeeId: string, balances: any, lastResetYear?: number) {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('employees').update({ 
        leave_balances: balances, 
        last_reset_year: lastResetYear 
      }).eq('id', employeeId);
    } else {
      localEmployees = localEmployees.map(e => e.id === employeeId ? { ...e, leaveBalances: balances, lastResetYear } : e);
    }
  },

  async getLeaveRequests(filter?: any): Promise<LeaveRequest[]> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('leave_requests').select('*').order('created_at', { ascending: false });
      if (filter?.employeeId) query = query.eq('employee_id', filter.employeeId);
      if (filter?.department) query = query.eq('department', filter.department);
      if (filter?.status) query = query.eq('status', filter.status);
      const { data } = await query;
      return (data || []).map((r: any) => ({
        id: r.id,
        employeeId: r.employee_id,
        employeeName: r.employee_name,
        department: r.department,
        type: r.type,
        startDate: r.start_date,
        endDate: r.end_date,
        days: r.days,
        reason: r.reason,
        status: r.status,
        managerId: r.manager_id,
        createdAt: r.created_at,
        actualReturnDate: r.actual_return_date,
        history: r.history || []
      }));
    }
    let filtered = [...localRequests];
    if (filter?.employeeId) filtered = filtered.filter(r => r.employeeId === filter.employeeId);
    if (filter?.department) filtered = filtered.filter(r => r.department === filter.department);
    if (filter?.status) filtered = filtered.filter(r => r.status === filter.status);
    return filtered;
  },

  async createLeaveRequest(request: Partial<LeaveRequest>, user: User) {
    const history: LeaveHistoryEntry[] = [{ 
      user: user.name, 
      role: user.role, 
      action: 'Requested', 
      timestamp: new Date().toISOString() 
    }];
    if (isSupabaseConfigured && supabase) {
      await supabase.from('leave_requests').insert([{ 
        employee_id: request.employeeId, 
        employee_name: request.employeeName, 
        department: request.department, 
        type: request.type, 
        start_date: request.startDate, 
        end_date: request.endDate, 
        days: request.days, 
        reason: request.reason, 
        status: request.status || 'Pending', 
        manager_id: request.managerId, 
        history: history 
      }]);
    } else {
      const newReq = { ...request, id: Math.random().toString(36).substr(2, 9), history: history } as LeaveRequest;
      localRequests.unshift(newReq);
    }
  },

  async updateLeaveRequestStatus(requestId: string, status: LeaveRequest['status'], user: User, note?: string) {
    const currentRequests = await this.getLeaveRequests();
    const req = currentRequests.find(r => r.id === requestId);
    if (!req) throw new Error("Request not found");
    const historyEntry: LeaveHistoryEntry = { 
      user: user.name, 
      role: user.role, 
      action: status, 
      timestamp: new Date().toISOString(), 
      note: note || undefined
    };
    const newHistory = [...(req.history || []), historyEntry];
    if (isSupabaseConfigured && supabase) {
      await supabase.from('leave_requests').update({ 
        status: status, 
        history: newHistory 
      }).eq('id', requestId);
    } else {
      localRequests = localRequests.map(r => r.id === requestId ? { ...r, status: status, history: newHistory } : r);
    }
  },

  async finalizeHRApproval(requestId: string, hrUser: User, finalizedDays: number) {
    // 1. Get the specific request
    const allReqs = await this.getLeaveRequests();
    const req = allReqs.find(r => r.id === requestId);
    if (!req) throw new Error("Request not found");

    // 2. Get the specific employee
    const employee = await this.getEmployeeByName(req.employeeId);
    if (!employee) throw new Error("Employee not found");
    
    // 3. Clone and calculate new balances
    const currentBalances = { ...employee.leaveBalances };
    let deductionAmount = 0;
    const dailyRate = employee.salary / 30;
    
    if (req.type === 'Annual') { 
      currentBalances.annual = Math.max(0, currentBalances.annual - finalizedDays); 
      currentBalances.annualUsed = (currentBalances.annualUsed || 0) + finalizedDays; 
    } else if (req.type === 'Sick') { 
      const tier = getSickTierInfo((employee.leaveBalances.sickUsed || 0) + finalizedDays); 
      deductionAmount = dailyRate * finalizedDays * tier.deduction; 
      currentBalances.sick = Math.max(0, currentBalances.sick - finalizedDays); 
      currentBalances.sickUsed = (currentBalances.sickUsed || 0) + finalizedDays; 
    } else if (req.type === 'Emergency') { 
      currentBalances.emergency = Math.max(0, currentBalances.emergency - finalizedDays); 
      currentBalances.emergencyUsed = (currentBalances.emergencyUsed || 0) + finalizedDays; 
    }
    
    // 4. Persistence
    await this.updateEmployeeBalances(employee.id, currentBalances);
    
    const payrollEntry: PayrollEntry = { 
      employee_id: employee.id, 
      leave_id: req.id, 
      deduction_amount: deductionAmount, 
      month_year: `${new Date().getMonth() + 1}/${new Date().getFullYear()}` 
    };
    
    if (isSupabaseConfigured && supabase) { 
      await supabase.from('payroll_entries').insert([payrollEntry]); 
    } else { 
      localPayroll.push(payrollEntry); 
    }

    // 5. Update Status to Finalized
    await this.updateLeaveRequestStatus(req.id, 'HR_Finalized', hrUser, `HR finalized with ${finalizedDays} days. Payroll synced.`);
  },

  async addEmployee(employee: any) {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('employees').insert([employee]).select();
      return data?.[0];
    }
    const newEmp = { ...employee, id: Math.random().toString(36).substr(2, 9) };
    localEmployees.unshift(newEmp);
    return newEmp;
  },

  async updateEmployeeStatus(employeeId: string, status: any) {
    if (isSupabaseConfigured && supabase) { 
      await supabase.from('employees').update({ status: status }).eq('id', employeeId); 
    } else { 
      localEmployees = localEmployees.map(e => e.id === employeeId ? { ...e, status: status } : e); 
    }
  },

  async getPayrollRuns(): Promise<PayrollRun[]> {
    if (isSupabaseConfigured && supabase) { 
      const { data } = await supabase.from('payroll_runs').select('*').order('created_at', { ascending: false }); 
      return data || []; 
    }
    return localPayrollRuns;
  },

  async getPayrollItems(runId: string): Promise<PayrollItem[]> {
    if (isSupabaseConfigured && supabase) { 
      const { data } = await supabase.from('payroll_items').select("*, employees (name)").eq('run_id', runId); 
      return (data || []).map((item: any) => ({ ...item, employee_name: item.employees?.name })); 
    }
    return localPayrollItems.filter(i => i.run_id === runId);
  },

  async getLatestFinalizedPayroll(employeeId: string): Promise<{item: PayrollItem, run: PayrollRun} | null> {
    const allRuns = await this.getPayrollRuns();
    const latestFinalizedRun = allRuns.find(r => r.status === 'Finalized');
    if (!latestFinalizedRun) return null;
    const items = await this.getPayrollItems(latestFinalizedRun.id);
    const userItem = items.find(i => i.employee_id === employeeId);
    if (userItem) { 
      return { item: userItem, run: latestFinalizedRun }; 
    }
    return null;
  },

  async generatePayrollDraft(periodKey: string, cycleType: 'Monthly' | 'Bi-Weekly'): Promise<PayrollRun> {
    const employees = await this.getEmployees();
    const divisor = cycleType === 'Monthly' ? 30 : 14;
    let run: PayrollRun;
    
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('payroll_runs').select('*').eq('period_key', periodKey).maybeSingle();
      if (data) { 
        run = data; 
        await supabase.from('payroll_items').delete().eq('run_id', run.id); 
      } else { 
        const { data: newRun } = await supabase.from('payroll_runs').insert([{ 
          period_key: periodKey, 
          cycle_type: cycleType, 
          status: 'Draft' 
        }]).select().single(); 
        run = newRun; 
      }
    } else {
      const existing = localPayrollRuns.find(r => r.period_key === periodKey);
      if (existing) { 
        run = existing; 
        localPayrollItems = localPayrollItems.filter(i => i.run_id !== run.id); 
      } else { 
        run = { 
          id: Math.random().toString(36).substr(2, 9), 
          period_key: periodKey, 
          cycle_type: cycleType, 
          status: 'Draft', 
          total_disbursement: 0, 
          created_at: new Date().toISOString() 
        }; 
        localPayrollRuns.push(run); 
      }
    }
    
    const payrollItems: Partial<PayrollItem>[] = [];
    let grandTotal = 0;
    const monthYearParts = periodKey.split('-');
    const currentMonthYear = `${parseInt(monthYearParts[1])}/${monthYearParts[0]}`;
    
    const allRuns = await this.getPayrollRuns();
    const finalizedRuns = allRuns.filter(r => r.status === 'Finalized' && r.cycle_type === cycleType);
    const lastRun = finalizedRuns.length > 0 ? finalizedRuns[0] : null;
    let previousItems: PayrollItem[] = [];
    if (lastRun) { 
      previousItems = await this.getPayrollItems(lastRun.id); 
    }
    
    for (const emp of employees) {
      const pifss = emp.nationality === 'Kuwaiti' ? emp.salary * PIFSS_RATE : 0;
      let leaveDeductions = 0;
      
      if (isSupabaseConfigured && supabase) { 
        const { data } = await supabase.from('payroll_entries').select('deduction_amount').eq('employee_id', emp.id).eq('month_year', currentMonthYear); 
        leaveDeductions = (data || []).reduce((acc, curr) => acc + parseFloat(curr.deduction_amount), 0); 
      } else { 
        leaveDeductions = localPayroll.filter(p => p.employee_id === emp.id && p.month_year === currentMonthYear).reduce((acc, curr) => acc + curr.deduction_amount, 0); 
      }
      
      const isUnpaidLeave = emp.status === 'On Leave' && emp.leaveBalances.annual <= 0;
      const unpaidDeduction = isUnpaidLeave ? (emp.salary / divisor) * 5 : 0;
      const totalDeductions = leaveDeductions + unpaidDeduction;
      const net = emp.salary - pifss - totalDeductions;
      
      const prevEmpItem = previousItems.find(i => i.employee_id === emp.id);
      const variance = prevEmpItem ? ((net - prevEmpItem.net_salary) / prevEmpItem.net_salary) * 100 : 0;
      
      grandTotal += net;
      payrollItems.push({ 
        run_id: run.id, 
        employee_id: emp.id, 
        employee_name: emp.name, 
        basic_salary: emp.salary, 
        allowances: 0, 
        deductions: totalDeductions, 
        pifss_deduction: pifss, 
        net_salary: net, 
        verified_by_hr: false, 
        variance: variance 
      });
    }
    
    if (isSupabaseConfigured && supabase) { 
      await supabase.from('payroll_items').insert(payrollItems.map(p => ({ 
        run_id: p.run_id, 
        employee_id: p.employee_id, 
        basic_salary: p.basic_salary, 
        allowances: p.allowances, 
        deductions: p.deductions, 
        pifss_deduction: p.pifss_deduction, 
        net_salary: p.net_salary 
      }))); 
      await supabase.from('payroll_runs').update({ total_disbursement: grandTotal }).eq('id', run.id); 
    } else { 
      localPayrollItems.push(...(payrollItems as PayrollItem[])); 
      run.total_disbursement = grandTotal; 
    }
    return run;
  },

  async finalizePayrollRun(runId: string, user: User) {
    if (isSupabaseConfigured && supabase) { 
      await supabase.from('payroll_runs').update({ status: 'Finalized' }).eq('id', runId); 
      const { data: items } = await supabase.from('payroll_items').select('employee_id').eq('run_id', runId); 
      const empIds = items?.map(i => i.employee_id) || []; 
      await supabase.from('leave_requests').update({ status: 'Paid' }).in('employee_id', empIds).eq('status', 'HR_Finalized'); 
    } else { 
      const run = localPayrollRuns.find(r => r.id === runId); 
      if (run) run.status = 'Finalized'; 
      localRequests = localRequests.map(r => r.status === 'HR_Finalized' ? { ...r, status: 'Paid' } : r); 
    }
  }
};
