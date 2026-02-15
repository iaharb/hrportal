import { supabase, isSupabaseConfigured } from './supabaseClient.ts';
import { Employee, DepartmentMetric, LeaveRequest, LeaveBalances, Notification, LeaveType, User, LeaveHistoryEntry, PayrollRun, PayrollItem, SettlementResult, PublicHoliday, AttendanceRecord, OfficeLocation, HardwareConfig, Allowance, Announcement } from '../types.ts';
import { MOCK_EMPLOYEES, MOCK_LEAVE_REQUESTS, DEPARTMENT_METRICS, KUWAIT_PUBLIC_HOLIDAYS, OFFICE_LOCATIONS, STANDARD_ALLOWANCE_NAMES } from '../constants.tsx';

// Use standard UUIDs to prevent Supabase rejection
const gid = () => {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};

const mapEmployee = (data: any): Employee => {
  if (!data) return data;
  return {
    ...data,
    nameArabic: data.name_arabic,
    civilId: data.civil_id,
    civilIdExpiry: data.civil_id_expiry,
    pifssNumber: data.pifss_number,
    passportNumber: data.passport_number,
    passportExpiry: data.passport_expiry,
    iznAmalExpiry: data.izn_amal_expiry,
    positionArabic: data.position_arabic,
    departmentArabic: data.department_arabic,
    joinDate: data.join_date,
    leaveBalances: data.leave_balances || { annual: 30, sick: 15, emergency: 6, annualUsed: 0, sickUsed: 0, emergencyUsed: 0, shortPermissionLimit: 2, shortPermissionUsed: 0, hajUsed: false },
    trainingHours: data.training_hours || 0,
    workDaysPerWeek: data.work_days_per_week || 6,
    bankCode: data.bank_code,
    salary: Number(data.salary || 0),
    allowances: (data.allowances || []).map((a: any) => ({
      ...a,
      nameArabic: a.name_arabic || a.nameArabic
    })),
    faceToken: data.face_token,
    deviceUserId: data.device_user_id
  };
};

const mapLeaveRequest = (data: any): LeaveRequest => {
  if (!data) return data;
  return {
    id: data.id,
    employeeId: data.employee_id,
    employeeName: data.employee_name,
    department: data.department,
    type: data.type as LeaveType,
    startDate: data.start_date,
    endDate: data.end_date,
    days: data.days,
    durationHours: data.duration_hours,
    reason: data.reason,
    status: data.status,
    managerId: data.manager_id,
    createdAt: data.created_at,
    actualReturnDate: data.actual_return_date,
    medicalCertificateUrl: data.medical_certificate_url,
    history: data.history || []
  };
};

const mapPayrollRun = (data: any): PayrollRun => ({
  id: data.id,
  periodKey: data.period_key || data.periodKey,
  cycleType: data.cycle_type || data.cycleType,
  status: data.status,
  totalDisbursement: Number(data.total_disbursement || data.totalDisbursement || 0),
  createdAt: data.created_at || data.createdAt
});

const mapPayrollItem = (data: any): PayrollItem => ({
  id: data.id,
  runId: data.run_id,
  employeeId: data.employee_id,
  employeeName: data.employee_name,
  basicSalary: Number(data.basic_salary || 0),
  housingAllowance: Number(data.housing_allowance || 0),
  otherAllowances: Number(data.other_allowances || 0),
  leaveDeductions: Number(data.leave_deductions || 0),
  shortPermissionDeductions: Number(data.short_permission_deductions || 0),
  pifssDeduction: Number(data.pifss_deduction || 0),
  pifssEmployerShare: Number(data.pifss_employer_share || 0),
  netSalary: Number(data.net_salary || 0),
  verifiedByHr: !!data.verified_by_hr,
  variance: Number(data.variance || 0)
} as any);

const mapAttendanceRecord = (data: any): AttendanceRecord => {
  if (!data) return data;
  return {
    id: data.id,
    employeeId: data.employee_id,
    employeeName: data.employee_name,
    date: data.date,
    clockIn: data.clock_in,
    clockOut: data.clock_out,
    location: data.location,
    locationArabic: data.location_arabic,
    status: data.status,
    coordinates: data.coordinates,
    source: data.source || 'Web',
    deviceId: data.device_id
  };
};

let localRequests: LeaveRequest[] = [...MOCK_LEAVE_REQUESTS];
let localEmployees: Employee[] = [...MOCK_EMPLOYEES];
let localNotifications: Notification[] = [];
let localPayrollRuns: PayrollRun[] = [];
let localPayrollItems: PayrollItem[] = [];
let localAttendance: AttendanceRecord[] = [];
let localAnnouncements: Announcement[] = [
  { id: gid(), title: 'System Notice', titleArabic: 'إشعار النظام', content: 'Q2 Payroll cycles are now open for auditing.', contentArabic: 'دورات كشوف المرتبات للربع الثاني مفتوحة الآن للتدقيق.', priority: 'Normal', createdAt: new Date().toISOString() }
];

let activeHolidays = [...KUWAIT_PUBLIC_HOLIDAYS];
let activeZones = [...OFFICE_LOCATIONS];
let activeMetrics = [...DEPARTMENT_METRICS];
let activeAllowances = [...STANDARD_ALLOWANCE_NAMES];

let globalPolicies = {
  maxPermissionHours: 8,
  fractionalDayBasis: 8, // 8 hours = 1 day
};

let hardwareConfig: HardwareConfig = {
  serverIp: '192.168.1.50',
  apiKey: 'FR-9988-X-1',
  syncInterval: 15,
  status: 'Connected', 
  lastSync: new Date().toISOString()
};

export const calculateLeaveDays = (start: string, end: string, type: LeaveType, includeSat: boolean, holidays: string[]): number => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  let total = 0;
  let current = new Date(startDate);
  while (current <= endDate) {
    const dayOfWeek = current.getDay(); 
    const dateStr = current.toLocaleDateString('en-CA'); 
    const isHoliday = holidays.includes(dateStr);
    const isFriday = dayOfWeek === 5;
    const isSaturday = dayOfWeek === 6;
    if (!isFriday && !(isSaturday && !includeSat) && !isHoliday) total++;
    current.setDate(current.getDate() + 1);
  }
  return total;
};

export const dbService = {
  isLive: () => isSupabaseConfigured && !!supabase,

  async testConnection(): Promise<{ success: boolean; message: string; latency?: number; details?: any }> {
    if (!this.isLive()) return { success: false, message: "Supabase client not configured." };
    const startTime = performance.now();
    try {
      const { data, error } = await supabase!.from('employees').select('id').limit(1);
      const latency = Math.round(performance.now() - startTime);
      if (error) throw error;
      return { success: true, message: "Connected to Supabase Live Registry.", latency };
    } catch (e: any) {
      return { success: false, message: `Network Error: ${e.message}`, details: e };
    }
  },

  async getGlobalPolicies() {
    return globalPolicies;
  },

  async updateGlobalPolicies(updates: Partial<typeof globalPolicies>) {
    globalPolicies = { ...globalPolicies, ...updates };
    return globalPolicies;
  },

  async getMasterAllowances() {
    return activeAllowances;
  },

  async updateMasterAllowances(list: typeof activeAllowances) {
    activeAllowances = [...list];
  },

  async getWeeklyPermissionUsage(employeeId: string): Promise<number> {
    const { start, end } = getCurrentWeekRange();
    const requests = await this.getLeaveRequests({ employeeId });
    
    return requests
      .filter(r => r.type === 'ShortPermission' && r.status !== 'Rejected')
      .filter(r => {
        const d = new Date(r.startDate);
        return d >= start && d <= end;
      })
      .reduce((sum, r) => sum + (r.durationHours || 0), 0);
  },

  async getEmployees(): Promise<Employee[]> {
    if (this.isLive()) {
      const { data, error } = await supabase!.from('employees').select('*').order('name', { ascending: true });
      if (error) throw error;
      return (data || []).map(mapEmployee);
    }
    return [...localEmployees].map(mapEmployee);
  },

  async getEmployeeByName(name: string): Promise<Employee | undefined> {
    const employees = await this.getEmployees();
    return employees.find(e => e.name.toLowerCase() === name.toLowerCase() || (e.nameArabic && e.nameArabic === name));
  },

  async addEmployee(employee: Omit<Employee, 'id'>): Promise<Employee> {
    if (this.isLive()) {
      const dbPayload = {
        name: employee.name,
        name_arabic: employee.nameArabic,
        nationality: employee.nationality,
        /* Fix: Changed property access from camelCase 'civil_id' to existing 'civilId' from Employee interface */
        civil_id: employee.civilId,
        civil_id_expiry: employee.civilIdExpiry || null,
        department: employee.department,
        department_arabic: employee.departmentArabic,
        position: employee.position,
        position_arabic: employee.positionArabic,
        join_date: employee.joinDate,
        salary: employee.salary,
        status: employee.status,
        leave_balances: employee.leaveBalances,
        work_days_per_week: employee.workDaysPerWeek,
        iban: employee.iban,
        bank_code: employee.bankCode,
        /* Added comment above fix */
        /* Fix: Changed property access from face_token to faceToken to match Employee interface */
        face_token: employee.faceToken || null,
        device_user_id: employee.deviceUserId || null,
        allowances: employee.allowances
      };
      const { data, error } = await supabase!.from('employees').insert([dbPayload]).select().single();
      if (error) throw error;
      return mapEmployee(data);
    }
    const newEmp = { ...employee, id: gid() } as Employee;
    localEmployees.push(newEmp);
    return newEmp;
  },

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee> {
    if (this.isLive()) {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.nameArabic !== undefined) dbUpdates.name_arabic = updates.nameArabic;
      if (updates.nationality !== undefined) dbUpdates.nationality = updates.nationality;
      if (updates.civilId !== undefined) dbUpdates.civil_id = updates.civilId;
      if (updates.civilIdExpiry !== undefined) dbUpdates.civil_id_expiry = updates.civilIdExpiry;
      if (updates.department !== undefined) dbUpdates.department = updates.department;
      if (updates.departmentArabic !== undefined) dbUpdates.department_arabic = updates.departmentArabic;
      if (updates.position !== undefined) dbUpdates.position = updates.position;
      if (updates.positionArabic !== undefined) dbUpdates.position_arabic = updates.positionArabic;
      if (updates.joinDate !== undefined) dbUpdates.join_date = updates.joinDate;
      if (updates.salary !== undefined) dbUpdates.salary = updates.salary;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.leaveBalances !== undefined) dbUpdates.leave_balances = updates.leaveBalances;
      if (updates.trainingHours !== undefined) dbUpdates.training_hours = updates.trainingHours;
      if (updates.workDaysPerWeek !== undefined) dbUpdates.work_days_per_week = updates.workDaysPerWeek;
      if (updates.iban !== undefined) dbUpdates.iban = updates.iban;
      if (updates.bankCode !== undefined) dbUpdates.bank_code = updates.bankCode;
      if (updates.faceToken !== undefined) dbUpdates.face_token = updates.faceToken;
      if (updates.deviceUserId !== undefined) dbUpdates.device_user_id = updates.deviceUserId;
      if (updates.allowances !== undefined) dbUpdates.allowances = updates.allowances;

      const { data, error } = await supabase!.from('employees').update(dbUpdates).eq('id', id).select().single();
      if (error) throw error;
      return mapEmployee(data);
    }
    localEmployees = localEmployees.map(e => e.id === id ? { ...e, ...updates } : e);
    const updated = localEmployees.find(e => e.id === id);
    if (!updated) throw new Error("Employee not found");
    return updated;
  },

  async getPublicHolidays(): Promise<PublicHoliday[]> {
    if (this.isLive()) {
      const { data } = await supabase!.from('public_holidays').select('*').order('date', { ascending: true });
      if (data) return data.map((h: any) => ({
        ...h,
        nameArabic: h.name_arabic,
        isFixed: h.is_fixed
      }));
    }
    return [...activeHolidays].sort((a,b) => a.date.localeCompare(b.date));
  },

  async addPublicHoliday(h: Omit<PublicHoliday, 'id'>) {
    if (this.isLive()) {
      await supabase!.from('public_holidays').insert([{
        name: h.name,
        name_arabic: h.nameArabic,
        date: h.date,
        type: h.type,
        is_fixed: h.isFixed
      }]);
    } else {
      activeHolidays.push({ ...h, id: gid() });
    }
  },

  async deletePublicHoliday(id: string) {
    if (this.isLive()) {
      await supabase!.from('public_holidays').delete().eq('id', id);
    } else {
      activeHolidays = activeHolidays.filter(h => h.id !== id);
    }
  },

  async getPayrollRuns(): Promise<PayrollRun[]> {
    if (this.isLive()) {
      const { data, error } = await supabase!.from('payroll_runs').select('*').order('period_key', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapPayrollRun);
    }
    return [...localPayrollRuns].sort((a,b) => b.periodKey.localeCompare(a.periodKey));
  },

  async getPayrollItems(runId: string): Promise<PayrollItem[]> {
    if (this.isLive()) {
      const { data, error } = await supabase!.from('payroll_items').select('*').eq('run_id', runId);
      if (error) throw error;
      return (data || []).map(mapPayrollItem);
    }
    return localPayrollItems.filter(i => i.runId === runId);
  },

  async getLatestFinalizedPayroll(userId: string): Promise<{ item: PayrollItem, run: PayrollRun } | null> {
    const runs = await this.getPayrollRuns();
    const finalizedRuns = runs.filter(r => r.status === 'Finalized');
    if (finalizedRuns.length === 0) return null;
    const latestRun = finalizedRuns.sort((a, b) => b.periodKey.localeCompare(a.periodKey))[0];
    const items = await this.getPayrollItems(latestRun.id);
    const item = items.find(i => i.employeeId === userId);
    return item ? { item, run: latestRun } : null;
  },

  async getLeaveRequests(filter?: any): Promise<LeaveRequest[]> {
    if (this.isLive()) {
      let query = supabase!.from('leave_requests').select('*');
      if (filter?.employeeId) query = query.eq('employee_id', filter.employeeId);
      if (filter?.department) query = query.eq('department', filter.department);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapLeaveRequest);
    }
    let filtered = [...localRequests];
    if (filter?.employeeId) filtered = filtered.filter(r => r.employeeId === filter.employeeId);
    if (filter?.department) filtered = filtered.filter(r => r.department === filter.department);
    return filtered.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  },

  async createLeaveRequest(request: Omit<LeaveRequest, 'id'>, user: User): Promise<LeaveRequest> {
    const newReq = { ...request, id: gid() } as LeaveRequest;
    if (this.isLive()) {
      const dbPayload = {
        employee_id: newReq.employeeId,
        employee_name: newReq.employeeName,
        department: newReq.department,
        type: newReq.type,
        start_date: newReq.startDate,
        end_date: newReq.endDate,
        days: newReq.days,
        duration_hours: newReq.durationHours || null,
        reason: newReq.reason,
        status: newReq.status,
        manager_id: newReq.managerId,
        history: newReq.history,
        created_at: newReq.createdAt
      };
      const { data, error } = await supabase!.from('leave_requests').insert([dbPayload]).select().single();
      if (error) throw error;
      return mapLeaveRequest(data);
    }
    localRequests.push(newReq);
    return newReq;
  },

  async updateLeaveRequestStatus(id: string, status: LeaveRequest['status'], user: User, note?: string): Promise<LeaveRequest> {
    const requests = await this.getLeaveRequests();
    const req = requests.find(r => r.id === id);
    if (!req) throw new Error("Request not found");
    const historyEntry: LeaveHistoryEntry = { user: user.name, role: user.role, action: status, timestamp: new Date().toISOString(), note };
    
    if (status === 'Resumed') {
      const hrNote = req.type === 'ShortPermission' ? `Physical return from ${req.durationHours}h permission.` : `Resumed from ${req.type} leave.`;
      this.createNotification({
        id: gid(),
        title: "Staff Resumption",
        message: `${req.employeeName} (${req.department}) has confirmed resumption. ${hrNote}`,
        type: 'info',
        category: 'leave_return',
        timestamp: new Date().toISOString(),
        isRead: false,
        linkId: req.id
      });
    }

    if (status === 'Manager_Approved' && req.type === 'ShortPermission') {
       const emp = (await this.getEmployees()).find(e => e.id === req.employeeId);
       if (emp) {
         const balances = { ...emp.leaveBalances };
         balances.shortPermissionUsed = (balances.shortPermissionUsed || 0) + (req.durationHours || 0);
         await this.updateEmployee(emp.id, { leaveBalances: balances });
       }
    }

    if (this.isLive()) {
      const updates = { status, history: [...req.history, historyEntry] };
      const { data, error } = await supabase!.from('leave_requests').update(updates).eq('id', id).select().single();
      if (error) throw error;
      if (status === 'Resumed') await this.updateEmployee(req.employeeId, { status: 'Active' });
      return mapLeaveRequest(data);
    }
    const idx = localRequests.findIndex(r => r.id === id);
    localRequests[idx] = { ...req, status, history: [...req.history, historyEntry] };
    if (status === 'Resumed') await this.updateEmployee(req.employeeId, { status: 'Active' });
    return localRequests[idx];
  },

  async finalizeHRApproval(id: string, user: User, finalizedDays: number): Promise<void> {
    const requests = await this.getLeaveRequests();
    const req = requests.find(r => r.id === id);
    if (!req) throw new Error("Request not found");
    const employees = await this.getEmployees();
    const emp = employees.find(e => e.id === req.employeeId);
    
    if (emp) {
      const balances = { ...emp.leaveBalances };
      if (req.type === 'ShortPermission') {
        balances.shortPermissionUsed = (balances.shortPermissionUsed || 0); 
      } else if (req.type === 'Hajj') {
        balances.hajUsed = true;
      } else {
        const typeKey = req.type.toLowerCase() as keyof LeaveBalances;
        const usedKey = `${typeKey}Used` as keyof LeaveBalances;
        if (typeof balances[usedKey] === 'number') {
          (balances[usedKey] as any) += finalizedDays;
        }
      }
      await this.updateEmployee(emp.id, { leaveBalances: balances });
    }
    await this.updateLeaveRequestStatus(id, 'HR_Finalized', user, `Finalized with ${finalizedDays} units.`);
  },

  async generatePayrollDraft(periodKey: string, cycle: 'Monthly' | 'Bi-Weekly'): Promise<PayrollRun> {
    const employees = await this.getEmployees();
    const allFinalizedLeaves = await this.getLeaveRequests();
    const allAttendance = await this.getAttendanceRecords();
    
    // Cleanup existing draft to prevent unique constraint errors
    if (this.isLive()) {
       await supabase!.from('payroll_runs').delete().eq('period_key', periodKey).eq('status', 'Draft');
    } else {
       localPayrollRuns = localPayrollRuns.filter(r => r.periodKey !== periodKey || r.status !== 'Draft');
    }

    const runId = gid();
    const [year, month] = periodKey.split('-').map(Number);
    
    const MONTHLY_SHORT_PERMISSION_QUOTA = globalPolicies.maxPermissionHours; 

    const dbItems: any[] = employees.map(emp => {
      const basic = Number(emp.salary) || 0;
      const allowances = emp.allowances || [];
      
      let housingAmount = 0;
      let otherAllowancesTotal = 0;
      
      allowances.forEach(a => {
        const val = a.type === 'Fixed' ? Number(a.value) : (basic * (Number(a.value) / 100));
        if (a.isHousing) housingAmount += val;
        else otherAllowancesTotal += val;
      });

      // LEAVE CALCULATION FROM ATTENDANCE TRANSACTIONS
      const monthlyAttendance = allAttendance.filter(a => {
        const d = new Date(a.date);
        return d.getMonth() + 1 === month && d.getFullYear() === year && a.employeeId === emp.id;
      });

      const absentDays = monthlyAttendance.filter(a => a.status === 'Absent').length;
      const dailyRate = basic / 26;
      const unapprovedAbsenceDeduction = absentDays * dailyRate;

      const monthlyLeaves = allFinalizedLeaves.filter(l => 
        l.employeeId === emp.id && 
        l.status === 'HR_Finalized' &&
        l.type !== 'ShortPermission' &&
        new Date(l.startDate).getMonth() + 1 === month &&
        new Date(l.startDate).getFullYear() === year
      );

      const totalLeaveDays = monthlyLeaves.reduce((acc, curr) => acc + curr.days, 0);
      const dailyAllowanceRate = otherAllowancesTotal / 26;
      const leaveDeductionAmount = Math.min(otherAllowancesTotal, dailyAllowanceRate * totalLeaveDays);

      const relevantPermissions = allFinalizedLeaves.filter(l => 
        l.employeeId === emp.id && 
        l.type === 'ShortPermission' && 
        l.status === 'HR_Finalized' &&
        new Date(l.startDate).getMonth() + 1 === month &&
        new Date(l.startDate).getFullYear() === year
      );

      const totalShortHours = relevantPermissions.reduce((acc, curr) => acc + (curr.durationHours || 0), 0);
      const excessShortHours = Math.max(0, totalShortHours - MONTHLY_SHORT_PERMISSION_QUOTA);
      
      const fractionalDaysDeducted = excessShortHours / globalPolicies.fractionalDayBasis;
      const shortPermissionDeduction = fractionalDaysDeducted * dailyRate;
      
      const pifssDeduction = emp.nationality === 'Kuwaiti' ? basic * 0.115 : 0;
      const pifssEmployerShare = emp.nationality === 'Kuwaiti' ? basic * 0.125 : 0;

      const totalEarnings = basic + housingAmount + otherAllowancesTotal;
      const totalDeductions = pifssDeduction + leaveDeductionAmount + shortPermissionDeduction + unapprovedAbsenceDeduction;
      const net = totalEarnings - totalDeductions;

      return {
        id: gid(), 
        run_id: runId, 
        employee_id: emp.id, 
        employee_name: emp.name,
        basic_salary: basic, 
        housing_allowance: housingAmount,
        other_allowances: otherAllowancesTotal,
        leave_deductions: leaveDeductionAmount + unapprovedAbsenceDeduction,
        short_permission_deductions: shortPermissionDeduction,
        pifss_deduction: pifssDeduction,
        pifss_employer_share: pifssEmployerShare,
        net_salary: net, 
        verified_by_hr: false, 
        variance: 0
      };
    });

    const dbRun = {
      id: runId, 
      period_key: periodKey, 
      cycle_type: cycle, 
      status: 'Draft',
      total_disbursement: dbItems.reduce((acc, curr) => acc + curr.net_salary, 0),
      created_at: new Date().toISOString()
    };

    if (this.isLive()) {
      const { error: runErr } = await supabase!.from('payroll_runs').insert([dbRun]);
      if (runErr) throw runErr;
      const { error: itemsErr } = await supabase!.from('payroll_items').insert(dbItems);
      if (itemsErr) throw itemsErr;
    } else {
      localPayrollRuns.push(mapPayrollRun(dbRun));
      localPayrollItems.push(...dbItems.map(mapPayrollItem));
    }
    return mapPayrollRun(dbRun);
  },

  async finalizePayrollRun(runId: string, user: User): Promise<void> {
    if (this.isLive()) {
      await supabase!.from('payroll_runs').update({ status: 'Finalized' }).eq('id', runId);
    } else {
      const idx = localPayrollRuns.findIndex(r => r.id === runId);
      if (idx !== -1) localPayrollRuns[idx].status = 'Finalized';
    }
  },

  async calculateFinalSettlement(employeeId: string, endDate: string, reason: string, unpaidDays: number = 0): Promise<SettlementResult> {
    const employees = await this.getEmployees();
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) throw new Error("Employee not found");
    
    const basic = Number(emp.salary) || 0;
    const allowances = emp.allowances || [];
    
    // Article 55 Remuneration Aggregation
    let allowancesTotal = 0;
    allowances.forEach(a => {
      const val = a.type === 'Fixed' ? Number(a.value) : (basic * (Number(a.value) / 100));
      allowancesTotal += val;
    });

    const remuneration = basic + allowancesTotal;
    
    // Article 51 Rule: Daily wage for indemnity is Remuneration / 26
    const dailyRate = remuneration / 26;
    
    const start = new Date(emp.joinDate);
    const end = new Date(endDate);
    
    // Inclusive Counting (+1 Day)
    const msPerDay = 1000 * 60 * 60 * 24;
    let rawMs = end.getTime() - start.getTime();
    let totalCalendarDays = Math.ceil(rawMs / msPerDay) + 1;

    // Leap Year Suppression & Unapproved Absence Deduction
    // 1. Fetch unapproved absences from registry
    const allAttendance = await this.getAttendanceRecords({ employeeId });
    const attendanceAbsences = allAttendance.filter(a => 
      a.status === 'Absent' && a.date >= emp.joinDate && a.date <= endDate
    ).length;

    // 2. Suppress Leap Days (Ignore Feb 29)
    let leapDays = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
       if (d.getMonth() === 1 && d.getDate() === 29) leapDays++;
    }
    
    const finalUnpaidDays = unpaidDays || attendanceAbsences;
    const totalAdjustedDays = Math.max(0, totalCalendarDays - leapDays - finalUnpaidDays);

    // Standard Tenure Format (Fixed Month = 30, Fixed Year = 365)
    const tenureYears = Math.floor(totalAdjustedDays / 365);
    const remainingDaysAfterYears = totalAdjustedDays % 365;
    const tenureMonths = Math.floor(remainingDaysAfterYears / 30);
    const tenureDays = remainingDaysAfterYears % 30;

    // Decimal Years for Calculation (Article 51)
    const decimalYears = totalAdjustedDays / 365;

    // Accrual Tier 1: First 5 Years (15 days pay per year)
    let firstFiveYears = Math.min(decimalYears, 5);
    const firstFiveYearAmount = firstFiveYears * (dailyRate * 15);

    // Accrual Tier 2: Beyond 5 Years (30 days pay per year)
    let subsequentYears = Math.max(0, decimalYears - 5);
    const subsequentYearAmount = subsequentYears * (dailyRate * 30);
    
    const baseIndemnity = firstFiveYearAmount + subsequentYearAmount;

    // Article 53 Multipliers (Resignation vs Termination)
    let multiplier = 1.0;
    if (reason === 'Resignation') {
      if (decimalYears < 3) multiplier = 0;
      else if (decimalYears < 5) multiplier = 0.5;
      else if (decimalYears < 10) multiplier = 0.6666666666666666; // 2/3
      else multiplier = 1.0;
    }

    let finalIndemnity = baseIndemnity * multiplier;

    // Legal Cap (1.5 Years Remuneration)
    const cap = remuneration * 18;
    const isCapped = finalIndemnity > cap;
    if (isCapped) finalIndemnity = cap;

    // Article 70: Leave Encasement (Cashed out @ 100% regardless of tenure/reason)
    const leavePayout = (emp.leaveBalances?.annual || 0) * dailyRate;

    return {
      tenureYears,
      tenureMonths,
      tenureDays,
      totalServiceDays: totalAdjustedDays,
      remuneration,
      indemnityAmount: finalIndemnity,
      leavePayout,
      totalSettlement: finalIndemnity + leavePayout,
      dailyRate,
      breakdown: {
        baseIndemnity,
        multiplierApplied: multiplier,
        firstFiveYearAmount,
        subsequentYearAmount,
        leaveDaysEncashed: emp.leaveBalances?.annual || 0,
        isCapped,
        unpaidDaysDeducted: finalUnpaidDays
      }
    };
  },

  async getAttendanceRecords(filter?: { employeeId: string }): Promise<AttendanceRecord[]> {
    if (this.isLive()) {
       let query = supabase!.from('attendance').select('*');
       if (filter?.employeeId) query = query.eq('employee_id', filter.employeeId);
       const { data, error } = await query
          .order('date', { ascending: false })
          .order('clock_in', { ascending: false });
       
       if (error) throw error;
       return (data || []).map(mapAttendanceRecord);
    }
    return localAttendance.filter(r => !filter?.employeeId || r.employeeId === filter.employeeId).sort((a,b) => b.date.localeCompare(a.date));
  },

  async logAttendance(record: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord> {
    if (this.isLive()) {
      const dbPayload = {
        employee_id: record.employeeId,
        employee_name: record.employeeName,
        date: record.date,
        clock_in: record.clockIn,
        clock_out: record.clockOut,
        location: record.location,
        location_arabic: record.locationArabic,
        status: record.status,
        coordinates: record.coordinates,
        source: record.source,
        device_id: record.deviceId
      };
      const { data, error } = await supabase!.from('attendance').insert([dbPayload]).select().single();
      if (error) throw error;
      return mapAttendanceRecord(data);
    }
    const newRecord = { ...record, id: gid() } as AttendanceRecord;
    localAttendance.push(newRecord);
    return newRecord;
  },

  async clockOutAttendance(employeeId: string, clockOutTime: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    if (this.isLive()) {
      const { error } = await supabase!.from('attendance')
        .update({ clock_out: clockOutTime })
        .eq('employee_id', employeeId)
        .eq('date', today);
      if (error) throw error;
    } else {
      const idx = localAttendance.findIndex(r => r.employeeId === employeeId && r.date === today);
      if (idx !== -1) localAttendance[idx].clockOut = clockOutTime;
    }
  },

  async getHardwareConfig(): Promise<HardwareConfig> {
    return hardwareConfig;
  },

  async saveHardwareConfig(config: HardwareConfig): Promise<void> {
    hardwareConfig = { ...config };
  },

  async getAttendanceWorksheet(year: number, month: number): Promise<any[]> {
    const employees = await this.getEmployees();
    const leaves = await this.getLeaveRequests();
    const logs = await this.getAttendanceRecords();
    const holidays = await this.getPublicHolidays();
    const holidayDates = holidays.map(h => h.date);

    const worksheet: any[] = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    for (const emp of employees) {
      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month - 1, day);
        const dateStr = dateObj.toISOString().split('T')[0];
        const dayOfWeek = dateObj.getDay(); 

        const log = logs.find(l => l.employeeId === emp.id && l.date === dateStr);
        const activeLeave = leaves.find(l => 
          l.employeeId === emp.id && 
          ['HR_Approved', 'HR_Finalized', 'Resumed'].includes(l.status) &&
          l.type !== 'ShortPermission' &&
          dateStr >= l.startDate && dateStr <= l.endDate
        );

        let status = 'Absent';
        let subStatus = '';

        if (log) {
          status = log.status || 'On-Site';
          if (activeLeave && activeLeave.status === 'HR_Approved') {
            subStatus = 'Resumption Pending';
          }
        } else {
          if (dayOfWeek === 5) {
            status = 'Weekend';
          } else if (dayOfWeek === 6) {
            status = emp.workDaysPerWeek === 5 ? 'Rest Day' : 'Absent';
          } else if (holidayDates.includes(dateStr)) {
            status = 'Holiday';
          } else if (activeLeave) {
            status = 'On Leave';
            subStatus = activeLeave.type;
          }
        }

        worksheet.push({
          id: `${emp.id}-${dateStr}`,
          employeeId: emp.id,
          employeeName: emp.name,
          date: dateStr,
          clockIn: log?.clockIn || '--:--',
          clockOut: log?.clockOut || '--:--',
          location: log?.location || '--',
          status,
          subStatus,
          workDaysPerWeek: emp.workDaysPerWeek
        });
      }
    }
    return worksheet;
  },

  async generateHistoricalAttendance(): Promise<{ generated: number }> {
    const employees = await this.getEmployees();
    const targetEmployees = employees.filter(e => e.status === 'Active');
    if (targetEmployees.length === 0) return { generated: 0 };

    const startDate = new Date('2025-01-01');
    const endDate = new Date();
    let generatedCount = 0;

    const existing = await this.getAttendanceRecords();
    const existingMap = new Set(existing.map(r => `${r.employeeId}-${r.date}`));

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay(); 

      if (dayOfWeek === 5) continue;

      for (const emp of targetEmployees) {
        if (dayOfWeek === 6 && emp.workDaysPerWeek === 5) continue;
        if (existingMap.has(`${emp.id}-${dateStr}`)) continue;

        const hourIn = 7 + (Math.random() > 0.8 ? 1 : 0); 
        const minIn = Math.floor(Math.random() * 59);
        const clockIn = `${hourIn.toString().padStart(2, '0')}:${minIn.toString().padStart(2, '0')}`;
        const isLate = (hourIn === 8 && minIn > 5);
        const hourOut = 15 + Math.floor(Math.random() * 3);
        const minOut = Math.floor(Math.random() * 59);
        const clockOut = `${hourOut.toString().padStart(2, '0')}:${minOut.toString().padStart(2, '0')}`;

        await this.logAttendance({
          employeeId: emp.id,
          employeeName: emp.name,
          date: dateStr,
          clockIn,
          clockOut,
          location: 'HQ Tower',
          locationArabic: 'برج المقر',
          status: isLate ? 'Late' : 'On-Site',
          source: 'Hardware',
          deviceId: emp.deviceUserId || 'SIM-AUTO-FR'
        });
        generatedCount++;
      }
    }
    return { generated: generatedCount };
  },

  async syncHardwareAttendance(): Promise<{ synced: number, errors: number }> {
    const employees = await this.getEmployees();
    const today = new Date().toISOString().split('T')[0];
    let synced = 0;
    let errors = 0;

    const linkedEmployees = employees.filter(e => e.deviceUserId);
    if (linkedEmployees.length === 0) return { synced: 0, errors: 0 };

    const currentAttendance = await this.getAttendanceRecords();
    const existingIdsForToday = new Set(
      currentAttendance.filter(r => r.date === today).map(r => r.employeeId)
    );

    for (const emp of linkedEmployees) {
      if (!existingIdsForToday.has(emp.id)) {
        try {
          await this.logAttendance({
            employeeId: emp.id,
            employeeName: emp.name,
            date: today,
            clockIn: '0' + (Math.floor(Math.random() * 2) + 7).toString() + ':' + Math.floor(Math.random() * 59).toString().padStart(2, '0'),
            location: 'Hardware - ' + emp.department,
            locationArabic: 'جهاز - ' + (emp.departmentArabic || emp.department),
            status: 'On-Site',
            source: 'Hardware',
            deviceId: hardwareConfig.apiKey
          });
          synced++;
        } catch (e) {
          errors++;
        }
      }
    }

    hardwareConfig.lastSync = new Date().toISOString();
    hardwareConfig.status = 'Connected';
    
    return { synced, errors };
  },

  async getDepartments(): Promise<string[]> { 
    return Array.from(new Set((await this.getEmployees()).map(e => e.department))); 
  },

  async getDepartmentMetrics(): Promise<DepartmentMetric[]> { 
    if (this.isLive()) {
      const { data } = await supabase!.from('department_metrics').select('*').order('name', { ascending: true });
      if (data) return data.map((m: any) => ({
        ...m,
        nameArabic: m.name_arabic,
        kuwaitiCount: m.kuwaiti_count,
        expatCount: m.expat_count,
        targetRatio: m.target_ratio
      }));
    }
    return [...activeMetrics].sort((a,b) => a.name.localeCompare(b.name)); 
  },

  async addDepartmentMetric(m: Omit<DepartmentMetric, 'kuwaitiCount' | 'expatCount'>) {
     if (this.isLive()) {
       await supabase!.from('department_metrics').insert([{
         name: m.name,
         name_arabic: m.nameArabic,
         target_ratio: m.targetRatio,
         kuwaiti_count: 0,
         expat_count: 0
       }]);
     } else {
       activeMetrics.push({ ...m, kuwaitiCount: 0, expatCount: 0 });
     }
  },

  async deleteDepartmentMetric(name: string) {
     if (this.isLive()) {
       await supabase!.from('department_metrics').delete().eq('name', name);
     } else {
       activeMetrics = activeMetrics.filter(m => m.name !== name);
     }
  },
  
  async getOfficeLocations(): Promise<OfficeLocation[]> { 
    if (this.isLive()) {
      const { data } = await supabase!.from('office_locations').select('*').order('name', { ascending: true });
      if (data) return data.map((l: any) => ({
        ...l,
        nameArabic: l.name_arabic
      }));
    }
    return [...activeZones]; 
  },

  async addOfficeLocation(loc: Omit<OfficeLocation, 'id'>) {
    const newLoc = { ...loc, id: gid() };
    if (this.isLive()) {
      await supabase!.from('office_locations').insert([{
        name: loc.name,
        name_arabic: loc.nameArabic,
        lat: loc.lat,
        lng: loc.lng,
        radius: loc.radius
      }]);
    } else {
      activeZones.push(newLoc);
    }
    return newLoc;
  },

  async updateOfficeLocation(id: string, updates: Partial<OfficeLocation>) {
    if (this.isLive()) {
      await supabase!.from('office_locations').update({
        name: updates.name,
        name_arabic: updates.nameArabic,
        lat: updates.lat,
        lng: updates.lng,
        radius: updates.radius
      }).eq('id', id);
    } else {
      activeZones = activeZones.map(z => z.id === id ? { ...z, ...updates } : z);
    }
  },

  async deleteOfficeLocation(id: string) {
    if (this.isLive()) {
      await supabase!.from('office_locations').delete().eq('id', id);
    } else {
      activeZones = activeZones.filter(z => z.id !== id);
    }
  },

  createNotification(notif: Notification) {
    localNotifications = [notif, ...localNotifications];
  },

  async getNotifications(userId: string): Promise<Notification[]> { 
     return localNotifications.filter(n => n.category === 'leave_return' || !userId || true); 
  },
  
  async getAnnouncements(): Promise<Announcement[]> { 
    if (this.isLive()) {
      const { data } = await supabase!.from('announcements').select('*').order('created_at', { ascending: false });
      if (data) return data.map(a => ({
        ...a,
        titleArabic: a.title_arabic,
        contentArabic: a.content_arabic,
        createdAt: a.created_at
      }));
    }
    return [...localAnnouncements].sort((a,b) => b.createdAt.localeCompare(a.createdAt)); 
  },

  async createAnnouncement(ann: Omit<Announcement, 'id' | 'createdAt'>): Promise<Announcement> {
    const newAnn = { ...ann, id: gid(), createdAt: new Date().toISOString() };
    if (this.isLive()) {
      await supabase!.from('announcements').insert([{
        title: ann.title,
        title_arabic: ann.titleArabic,
        content: ann.content,
        content_arabic: ann.contentArabic,
        priority: ann.priority,
        created_at: newAnn.createdAt
      }]);
    } else {
      localAnnouncements.push(newAnn as Announcement);
    }
    return newAnn as Announcement;
  },

  async deleteAnnouncement(id: string): Promise<void> {
    if (this.isLive()) {
      await supabase!.from('announcements').delete().eq('id', id);
    } else {
      localAnnouncements = localAnnouncements.filter(a => a.id !== id);
    }
  },

  async seedDatabase(): Promise<{ success: boolean; error?: string }> {
    if (this.isLive()) {
      try {
        await Promise.all([
          supabase!.from('employees').upsert(MOCK_EMPLOYEES.map(e => ({
             ...e,
             name_arabic: e.nameArabic,
             department_arabic: e.departmentArabic,
             position_arabic: e.positionArabic,
             civil_id: e.civilId,
             civil_id_expiry: e.civilIdExpiry,
             passport_expiry: e.passportExpiry,
             iz_amal_expiry: e.iznAmalExpiry,
             join_date: e.joinDate,
             leave_balances: e.leaveBalances,
             work_days_per_week: e.workDaysPerWeek,
             device_user_id: e.deviceUserId,
             bank_code: e.bankCode,
             iban: e.iban, 
             face_token: e.faceToken || null,
             allowances: e.allowances
          }))),
          supabase!.from('public_holidays').upsert(KUWAIT_PUBLIC_HOLIDAYS.map(h => ({ ...h, name_arabic: h.nameArabic, is_fixed: h.isFixed }))),
          supabase!.from('office_locations').upsert(OFFICE_LOCATIONS.map(l => ({ ...l, name_arabic: l.nameArabic }))),
          supabase!.from('department_metrics').upsert(DEPARTMENT_METRICS.map(m => ({
            name: m.name,
            name_arabic: m.nameArabic,
            kuwaiti_count: m.kuwaitiCount,
            expat_count: m.expatCount,
            target_ratio: m.targetRatio
          })))
        ]);
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }
    localEmployees = [...MOCK_EMPLOYEES];
    activeHolidays = [...KUWAIT_PUBLIC_HOLIDAYS];
    activeZones = [...OFFICE_LOCATIONS];
    activeMetrics = [...DEPARTMENT_METRICS];
    return { success: true };
  },

  async exportWPS(runId: string, bankFormat: string = 'Standard'): Promise<string> {
    const items = await this.getPayrollItems(runId);
    const employees = await this.getEmployees();
    
    let headers = "EmployeeID,Name,CivilID,Salary,Allowances,PIFSS_Emp,PIFSS_Co,Net,IBAN,BankCode\n";
    
    if (bankFormat === 'NBK') {
       headers = "NBK_WPS_V2.0\nEmployeeID,Name,CivilID,Salary,Allowances,PIFSS_Emp,PIFSS_Co,Net,IBAN,BankCode\n";
    } else if (bankFormat === 'KFH') {
       headers = "KFH_ONLINE_WPS\nCivilID,Name,IBAN,BankCode,Basic,Allowances,Net\n";
    }

    const rows = items.map(item => {
      const emp = employees.find(e => e.id === item.employeeId);
      const totalAllowances = item.housingAllowance + item.otherAllowances;
      
      if (bankFormat === 'KFH') {
        return `${emp?.civilId || ''},${item.employeeName},${emp?.iban || ''},${emp?.bankCode || ''},${item.basicSalary.toFixed(3)},${totalAllowances.toFixed(3)},${item.netSalary.toFixed(3)}`;
      }
      
      return `${item.employeeId},${item.employeeName},${emp?.civilId || ''},${item.basicSalary.toFixed(3)},${totalAllowances.toFixed(3)},${(item as any).pifssDeduction.toFixed(3)},${(item as any).pifssEmployerShare.toFixed(3)},${item.netSalary.toFixed(3)},${emp?.iban || ''},${emp?.bankCode || ''}`;
    }).join("\n");

    return headers + rows;
  }
};

const getCurrentWeekRange = () => {
  const now = new Date();
  const day = now.getDay(); 
  const diffToSun = day; 
  const sun = new Date(now);
  sun.setDate(now.getDate() - diffToSun);
  sun.setHours(0, 0, 0, 0);
  const thu = new Date(sun);
  thu.setDate(sun.getDate() + 4);
  thu.setHours(23, 59, 59, 999);
  return { start: sun, end: thu };
};