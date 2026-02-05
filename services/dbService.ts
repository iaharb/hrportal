
import { supabase, isSupabaseConfigured } from './supabaseClient.ts';
import { Employee, DepartmentMetric, LeaveRequest, LeaveBalances, Notification, LeaveType, User, LeaveHistoryEntry, PayrollEntry, PayrollRun, PayrollItem, SettlementResult, PublicHoliday, AttendanceRecord, OfficeLocation } from '../types.ts';
import { MOCK_EMPLOYEES, MOCK_LEAVE_REQUESTS, DEPARTMENT_METRICS, KUWAIT_PUBLIC_HOLIDAYS, OFFICE_LOCATIONS } from '../constants.tsx';

// Helper to generate IDs for local fallbacks
const gid = () => Math.random().toString(36).substr(2, 9);

/**
 * Transformation helper: Supabase (snake_case) -> App (camelCase)
 */
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
    joinDate: data.join_date,
    leaveBalances: data.leave_balances || { annual: 30, sick: 15, emergency: 6, annualUsed: 0, sickUsed: 0, emergencyUsed: 0 },
    trainingHours: data.training_hours || 0,
    workDaysPerWeek: data.work_days_per_week || 6,
    bankCode: data.bank_code,
    salary: Number(data.salary || 0)
  };
};

/**
 * Transformation helper: Supabase Leave (snake_case) -> App (camelCase)
 */
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
    reason: data.reason,
    status: data.status,
    managerId: data.manager_id,
    createdAt: data.created_at,
    actualReturnDate: data.actual_return_date,
    medicalCertificateUrl: data.medical_certificate_url,
    history: data.history || []
  };
};

// Local stores for fallback/mock mode
let localRequests: LeaveRequest[] = [...MOCK_LEAVE_REQUESTS];
let localEmployees: Employee[] = [...MOCK_EMPLOYEES];
let localNotifications: Notification[] = [];
let localPayrollRuns: PayrollRun[] = [];
let localPayrollItems: PayrollItem[] = [];
let localAttendance: AttendanceRecord[] = [];

// Mutable static data
let activeHolidays = [...KUWAIT_PUBLIC_HOLIDAYS];
let activeZones = [...OFFICE_LOCATIONS];
let activeMetrics = [...DEPARTMENT_METRICS];
let activeDepartments = Array.from(new Set(MOCK_EMPLOYEES.map(e => e.department)));
let activePositions = Array.from(new Set(MOCK_EMPLOYEES.map(e => e.position)));

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
    
    if (!isFriday && !(isSaturday && !includeSat) && !isHoliday) {
      total++;
    }
    current.setDate(current.getDate() + 1);
  }
  return total;
};

export const dbService = {
  isLive: () => isSupabaseConfigured && !!supabase,

  async testConnection(): Promise<{ success: boolean; message: string; latency?: number; details?: any }> {
    if (!this.isLive()) return { success: false, message: "Supabase client not configured via environment variables." };
    
    const startTime = performance.now();
    try {
      const { data, error } = await supabase!.from('employees').select('id').limit(1);
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      if (error) {
        if (error.code === '42P01') return { success: false, message: "Table 'employees' missing.", latency, details: error };
        if (error.code === 'PGRST301') return { success: false, message: "Invalid API Key or Auth Error.", latency, details: error };
        return { success: false, message: `Database error: ${error.message}`, latency, details: error };
      }
      return { success: true, message: "Connected to Supabase Live Registry.", latency };
    } catch (e: any) {
      return { success: false, message: `Network Error: ${e.message}`, details: e };
    }
  },

  async getEmployees(): Promise<Employee[]> {
    if (this.isLive()) {
      const { data, error } = await supabase!.from('employees').select('*').order('name', { ascending: true });
      if (error) throw error;
      return (data || []).map(mapEmployee);
    }
    return [...localEmployees];
  },

  async getEmployeeByName(name: string): Promise<Employee | undefined> {
    const employees = await this.getEmployees();
    return employees.find(e => e.name.toLowerCase() === name.toLowerCase() || (e.nameArabic && e.nameArabic === name));
  },

  async addEmployee(employee: Omit<Employee, 'id'>): Promise<Employee> {
    if (this.isLive()) {
      console.log("[DB_SERVICE] Adding employee to Supabase...");
      const dbPayload = {
        name: employee.name,
        name_arabic: employee.nameArabic,
        nationality: employee.nationality,
        civil_id: employee.civilId,
        civil_id_expiry: employee.civilIdExpiry || null,
        department: employee.department,
        position: employee.position,
        position_arabic: employee.positionArabic,
        join_date: employee.joinDate,
        salary: employee.salary,
        status: employee.status,
        leave_balances: employee.leaveBalances,
        work_days_per_week: employee.workDaysPerWeek,
        iban: employee.iban,
        bank_code: employee.bankCode
      };
      const { data, error } = await supabase!.from('employees').insert([dbPayload]).select().single();
      if (error) {
        console.error("[DB_SERVICE] Insert Error:", error);
        throw error;
      }
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

      const { data, error } = await supabase!.from('employees').update(dbUpdates).eq('id', id).select().single();
      if (error) throw error;
      return mapEmployee(data);
    }
    localEmployees = localEmployees.map(e => e.id === id ? { ...e, ...updates } : e);
    const updated = localEmployees.find(e => e.id === id);
    if (!updated) throw new Error("Employee not found");
    return updated;
  },

  async updateEmployeeStatus(id: string, status: Employee['status']): Promise<Employee> {
    return this.updateEmployee(id, { status });
  },

  async getPublicHolidays(): Promise<PublicHoliday[]> {
    if (this.isLive()) {
      const { data } = await supabase!.from('public_holidays').select('*');
      if (data) return data as PublicHoliday[];
    }
    return [...activeHolidays];
  },

  async updatePublicHolidays(holidays: PublicHoliday[]) {
    activeHolidays = holidays;
    if (this.isLive()) {
      await supabase!.from('public_holidays').upsert(holidays);
    }
  },

  async getPayrollRuns(): Promise<PayrollRun[]> {
    if (this.isLive()) {
      const { data } = await supabase!.from('payroll_runs').select('*').order('period_key', { ascending: false });
      if (data) return data as PayrollRun[];
    }
    return [...localPayrollRuns].sort((a,b) => b.period_key.localeCompare(a.period_key));
  },

  async getPayrollItems(runId: string): Promise<PayrollItem[]> {
    if (this.isLive()) {
      const { data } = await supabase!.from('payroll_items').select('*').eq('run_id', runId);
      if (data) return data as PayrollItem[];
    }
    return localPayrollItems.filter(i => i.run_id === runId);
  },

  async getLatestFinalizedPayroll(userId: string): Promise<{ item: PayrollItem, run: PayrollRun } | null> {
    const runs = await this.getPayrollRuns();
    const finalizedRuns = runs.filter(r => r.status === 'Finalized');
    if (finalizedRuns.length === 0) return null;
    const latestRun = finalizedRuns.sort((a, b) => b.period_key.localeCompare(a.period_key))[0];
    const items = await this.getPayrollItems(latestRun.id);
    const item = items.find(i => i.employee_id === userId);
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
    
    if (this.isLive()) {
      const updates = { 
        status, 
        history: [...req.history, historyEntry] 
      };
      const { data, error } = await supabase!.from('leave_requests').update(updates).eq('id', id).select().single();
      if (error) throw error;
      if (status === 'Resumed') await this.updateEmployeeStatus(req.employeeId, 'Active');
      return mapLeaveRequest(data);
    }
    
    const idx = localRequests.findIndex(r => r.id === id);
    localRequests[idx] = { ...req, status, history: [...req.history, historyEntry] };
    if (status === 'Resumed') await this.updateEmployeeStatus(req.employeeId, 'Active');
    return localRequests[idx];
  },

  async finalizeHRApproval(id: string, user: User, finalizedDays: number): Promise<void> {
    const requests = await this.getLeaveRequests();
    const req = requests.find(r => r.id === id);
    if (!req) throw new Error("Request not found");
    const employees = await this.getEmployees();
    const emp = employees.find(e => e.id === req.employeeId);
    if (emp) {
      const typeKey = req.type.toLowerCase() as keyof LeaveBalances;
      const usedKey = `${typeKey}Used` as keyof LeaveBalances;
      const balances = { ...emp.leaveBalances };
      if (typeof balances[usedKey] === 'number') {
        (balances[usedKey] as any) += finalizedDays;
      }
      await this.updateEmployee(emp.id, { leaveBalances: balances });
    }
    await this.updateLeaveRequestStatus(id, 'HR_Finalized', user, `Finalized with ${finalizedDays} days.`);
  },

  async exportWPS(runId: string): Promise<string> {
    const items = await this.getPayrollItems(runId);
    const employees = await this.getEmployees();
    const headers = "EmployeeID,Name,CivilID,Salary,IBAN,BankCode\n";
    const rows = items.map(item => {
      const emp = employees.find(e => e.id === item.employee_id);
      return `${item.employee_id},${item.employee_name},${emp?.civilId || ''},${item.net_salary},${emp?.iban || ''},${emp?.bankCode || ''}`;
    }).join("\n");
    return headers + rows;
  },

  async generatePayrollDraft(periodKey: string, cycle: 'Monthly' | 'Bi-Weekly'): Promise<PayrollRun> {
    const id = gid();
    const employees = await this.getEmployees();
    const items: PayrollItem[] = employees.map(emp => {
      const basic = emp.salary;
      const allowances = 0;
      const pifss = emp.nationality === 'Kuwaiti' ? basic * 0.115 : 0;
      const deductions = 0;
      const net = basic + allowances - pifss - deductions;
      return {
        id: gid(),
        run_id: id,
        employee_id: emp.id,
        employee_name: emp.name,
        basic_salary: basic,
        allowances,
        deductions,
        pifss_deduction: pifss,
        net_salary: net,
        verified_by_hr: false,
        variance: 0
      };
    });

    const run: PayrollRun = {
      id,
      period_key: periodKey,
      cycle_type: cycle,
      status: 'Draft',
      total_disbursement: items.reduce((acc, curr) => acc + curr.net_salary, 0),
      created_at: new Date().toISOString()
    };

    if (this.isLive()) {
      await supabase!.from('payroll_runs').insert([run]);
      await supabase!.from('payroll_items').insert(items);
    } else {
      localPayrollRuns.push(run);
      localPayrollItems.push(...items);
    }
    return run;
  },

  async finalizePayrollRun(runId: string, user: User): Promise<void> {
    if (this.isLive()) {
      await supabase!.from('payroll_runs').update({ status: 'Finalized' }).eq('id', runId);
    } else {
      const idx = localPayrollRuns.findIndex(r => r.id === runId);
      if (idx !== -1) localPayrollRuns[idx].status = 'Finalized';
    }
  },

  async calculateFinalSettlement(employeeId: string, endDate: string, reason: string): Promise<SettlementResult> {
    const employees = await this.getEmployees();
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) throw new Error("Employee not found");
    
    const joinDate = new Date(emp.joinDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - joinDate.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const tenureYears = Math.floor(totalDays / 365);
    const tenureMonths = Math.floor((totalDays % 365) / 30);
    const tenureDays = (totalDays % 365) % 30;
    
    const dailyRate = emp.salary / 26;
    let baseIndemnity = 0;
    let firstFiveYearAmount = 0;
    let subsequentYearAmount = 0;

    if (tenureYears <= 5) {
      firstFiveYearAmount = tenureYears * (dailyRate * 15);
    } else {
      firstFiveYearAmount = 5 * (dailyRate * 15);
      subsequentYearAmount = (tenureYears - 5) * (dailyRate * 30);
    }
    baseIndemnity = firstFiveYearAmount + subsequentYearAmount;

    let multiplierApplied = 1.0;
    if (reason === 'Resignation') {
      if (tenureYears < 3) multiplierApplied = 0;
      else if (tenureYears < 5) multiplierApplied = 0.5;
      else if (tenureYears < 10) multiplierApplied = 0.66;
    }

    const indemnityAmount = baseIndemnity * multiplierApplied;
    const leaveDaysEncashed = emp.leaveBalances?.annual || 0;
    const leavePayout = leaveDaysEncashed * dailyRate;

    return {
      tenureYears,
      tenureMonths,
      tenureDays,
      indemnityAmount,
      leavePayout,
      totalSettlement: indemnityAmount + leavePayout,
      dailyRate,
      breakdown: {
        baseIndemnity,
        multiplierApplied,
        firstFiveYearAmount,
        subsequentYearAmount,
        leaveDaysEncashed
      }
    };
  },

  async getAttendanceRecords(filter?: { employeeId: string }): Promise<AttendanceRecord[]> {
    if (this.isLive()) {
       const { data } = await supabase!.from('attendance').select('*').eq('employee_id', filter?.employeeId);
       return (data || []) as AttendanceRecord[];
    }
    return localAttendance.filter(r => !filter?.employeeId || r.employeeId === filter.employeeId);
  },

  async logAttendance(record: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord> {
    const newRecord = { ...record, id: gid() } as AttendanceRecord;
    if (this.isLive()) {
      await supabase!.from('attendance').insert([newRecord]);
    } else {
      localAttendance.push(newRecord);
    }
    return newRecord;
  },

  async clockOutAttendance(employeeId: string, clockOutTime: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    if (this.isLive()) {
      await supabase!.from('attendance').update({ clock_out: clockOutTime }).eq('employee_id', employeeId).eq('date', today);
    } else {
      const idx = localAttendance.findIndex(r => r.employeeId === employeeId && r.date === today);
      if (idx !== -1) localAttendance[idx].clockOut = clockOutTime;
    }
  },

  async getDepartments() { return [...activeDepartments]; },
  async getPositions() { return [...activePositions]; },
  async getDepartmentMetrics() { return [...activeMetrics]; },
  async getOfficeLocations() { return [...activeZones]; },
  async getNotifications(userId: string): Promise<Notification[]> { return [...localNotifications]; },
  async getAnnouncements() { return [{ title: 'System Notice', content: 'Q2 Payroll cycles are now open for auditing.', priority: 'Normal' }, { title: 'Security Alert', content: 'Please ensure all Civil ID records are updated before the April deadline.', priority: 'Urgent' }]; },

  async seedDatabase(): Promise<{ success: boolean; error?: string }> {
    const test = await this.testConnection();
    if (!test.success && this.isLive()) return { success: false, error: test.message };
    if (this.isLive()) {
      try {
        await supabase!.from('employees').delete().neq('id', '00000000-0000-0000-0000-000000000001');
        await supabase!.from('employees').upsert(MOCK_EMPLOYEES);
        await supabase!.from('public_holidays').upsert(KUWAIT_PUBLIC_HOLIDAYS);
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }
    localEmployees = [...MOCK_EMPLOYEES];
    localRequests = [...MOCK_LEAVE_REQUESTS];
    return { success: true };
  }
};
