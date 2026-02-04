import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Employee, DepartmentMetric, LeaveRequest, LeaveBalances, Notification } from '../types';
import { MOCK_EMPLOYEES, DEPARTMENT_METRICS, MOCK_LEAVE_REQUESTS } from '../constants';

// Local store for demo mode to maintain session state
let localRequests = [...MOCK_LEAVE_REQUESTS];

export const dbService = {
  async checkTableStatus(): Promise<{ exists: boolean; isEmpty: boolean; error?: string }> {
    if (!isSupabaseConfigured || !supabase) return { exists: false, isEmpty: true, error: 'Supabase not configured' };
    
    const { count, error } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return { exists: false, isEmpty: true, error: 'Table "employees" does not exist.' };
      }
      return { exists: true, isEmpty: true, error: error.message };
    }
    
    return { exists: true, isEmpty: count === 0 };
  },

  async getNotifications(userId: string): Promise<Notification[]> {
    const requests = await this.getLeaveRequests({ employeeId: userId });
    const notifications: Notification[] = [];
    const today = new Date();
    const threeDaysAway = new Date();
    threeDaysAway.setDate(today.getDate() + 3);

    requests.forEach(req => {
      const startDate = new Date(req.startDate);
      const endDate = new Date(req.endDate);

      // Approaching Start
      if (req.status === 'Approved' && startDate > today && startDate <= threeDaysAway) {
        notifications.push({
          id: `start-${req.id}`,
          title: 'Upcoming Leave',
          message: `Your ${req.type} leave starts in ${Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 3600 * 24))} days.`,
          type: 'reminder',
          category: 'leave_start',
          timestamp: new Date().toISOString(),
          isRead: false,
          linkId: req.id
        });
      }

      // Approaching Return
      if (req.status === 'Approved' && today <= endDate && (endDate.getTime() - today.getTime()) < (2 * 24 * 3600 * 1000)) {
        notifications.push({
          id: `return-${req.id}`,
          title: 'Resumption Near',
          message: `Your ${req.type} leave ends soon. Prepare for resumption of duty.`,
          type: 'urgent',
          category: 'leave_return',
          timestamp: new Date().toISOString(),
          isRead: false,
          linkId: req.id
        });
      }
    });

    return notifications;
  },

  async isDatabaseEmpty(): Promise<boolean> {
    const status = await this.checkTableStatus();
    return status.isEmpty;
  },

  async seedDatabase(): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured || !supabase) return { success: false, error: 'Client not initialized' };
    
    const employeesToInsert = MOCK_EMPLOYEES.map(emp => ({
      name: emp.name,
      nationality: emp.nationality,
      department: emp.department,
      position: emp.position,
      join_date: emp.joinDate,
      salary: emp.salary,
      status: emp.status,
      leave_balances: emp.leaveBalances
    }));

    const { error } = await supabase
      .from('employees')
      .insert(employeesToInsert);

    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async getEmployeeByName(name: string): Promise<Employee | null> {
    const searchName = name.toLowerCase().trim();
    
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .or(`name.ilike.%${searchName}%,id.eq.${name}`)
        .limit(1)
        .single();

      if (data && !error) {
        return {
          id: data.id,
          name: data.name,
          nationality: data.nationality,
          department: data.department,
          position: data.position,
          joinDate: data.join_date,
          salary: parseFloat(data.salary),
          status: data.status,
          leaveBalances: data.leave_balances
        };
      }
    }

    // Comprehensive mock search
    const mock = MOCK_EMPLOYEES.find(emp => {
      const fullName = emp.name.toLowerCase();
      const firstName = emp.name.split(' ')[0].toLowerCase();
      return fullName === searchName || firstName === searchName || emp.id === name;
    });
    
    return mock ? { ...mock } : null;
  },

  async getEmployees(): Promise<Employee[]> {
    if (!isSupabaseConfigured || !supabase) return [...MOCK_EMPLOYEES];

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error || !data || data.length === 0) return [...MOCK_EMPLOYEES];

    return data.map((e: any) => ({
      id: e.id,
      name: e.name,
      nationality: e.nationality,
      department: e.department,
      position: e.position,
      joinDate: e.join_date,
      salary: parseFloat(e.salary),
      status: e.status,
      leaveBalances: e.leave_balances
    }));
  },

  async addEmployee(employee: Omit<Employee, 'id'>) {
    if (!isSupabaseConfigured || !supabase) {
      const newEmp = { ...employee, id: Math.random().toString(36).substr(2, 9) };
      MOCK_EMPLOYEES.push(newEmp as Employee);
      return newEmp;
    }

    const { data, error } = await supabase
      .from('employees')
      .insert([{
        name: employee.name,
        nationality: employee.nationality,
        department: employee.department,
        position: employee.position,
        join_date: employee.joinDate,
        salary: employee.salary,
        status: employee.status,
        leave_balances: employee.leaveBalances
      }])
      .select();

    if (error) throw new Error(error.message);
    return data?.[0];
  },

  async updateEmployeeBalances(employeeId: string, balances: LeaveBalances) {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('employees')
        .update({ leave_balances: balances })
        .eq('id', employeeId);
      if (error) throw new Error(error.message);
    } else {
      const idx = MOCK_EMPLOYEES.findIndex(e => e.id === employeeId || e.name === employeeId);
      if (idx !== -1) {
        MOCK_EMPLOYEES[idx].leaveBalances = { ...balances };
      }
    }
  },

  async updateEmployeeStatus(employeeId: string, status: Employee['status']) {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('employees')
        .update({ status: status })
        .eq('id', employeeId);
      if (error) throw new Error(error.message);
    } else {
      const idx = MOCK_EMPLOYEES.findIndex(e => e.id === employeeId || e.name === employeeId);
      if (idx !== -1) {
        MOCK_EMPLOYEES[idx].status = status;
      }
    }
  },

  async getLeaveRequests(filter?: { employeeId?: string, employeeName?: string, department?: string }): Promise<LeaveRequest[]> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('leave_requests').select('*').order('created_at', { ascending: false });

      const orConditions: string[] = [];
      if (filter?.employeeId) {
        orConditions.push(`employee_id.eq.${filter.employeeId}`);
      }
      if (filter?.employeeName) {
        orConditions.push(`employee_name.eq.${filter.employeeName}`);
      }
      
      if (orConditions.length > 0 && filter?.department) {
        query = query.or(`${orConditions.join(',')},department.eq.${filter.department}`);
      } else if (orConditions.length > 0) {
        query = query.or(orConditions.join(','));
      } else if (filter?.department) {
        query = query.eq('department', filter.department);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data.map((r: any) => ({
          id: r.id,
          employeeId: r.employee_id,
          employeeName: r.employee_name,
          department: r.department,
          type: r.type,
          startDate: r.start_date,
          endDate: r.end_date,
          days: r.days,
          reason: r.reason,
          status: r.status as LeaveRequest['status'],
          managerId: r.manager_id,
          createdAt: r.created_at,
          actualReturnDate: r.actual_return_date,
          medicalCertificateUrl: r.medical_certificate_url
        }));
      }
    }

    let results = [...localRequests];
    if (filter?.employeeId || filter?.employeeName) {
      results = results.filter(r => 
        (filter.employeeId && r.employeeId === filter.employeeId) || 
        (filter.employeeName && r.employeeName === filter.employeeName)
      );
    }
    if (filter?.department) {
      results = results.filter(r => r.department === filter.department);
    }
    return results;
  },

  async createLeaveRequest(request: Omit<LeaveRequest, 'id'>) {
    if (!isSupabaseConfigured || !supabase) {
      const newReq = { ...request, id: 'local-' + Date.now() };
      localRequests.unshift(newReq as LeaveRequest);
      return newReq;
    }

    const { data, error } = await supabase
      .from('leave_requests')
      .insert([{
        employee_id: request.employeeId,
        employee_name: request.employeeName,
        department: request.department,
        type: request.type,
        start_date: request.startDate,
        end_date: request.endDate,
        days: request.days,
        reason: request.reason,
        status: request.status,
        manager_id: request.managerId,
        medical_certificate_url: request.medicalCertificateUrl
      }])
      .select();

    if (error) throw new Error(error.message);
    return data?.[0];
  },

  async updateLeaveRequestStatus(id: string, status: LeaveRequest['status'], extra?: any) {
    if (isSupabaseConfigured && supabase) {
      const updatePayload: any = { status };
      if (extra?.actualReturnDate) {
        updatePayload.actual_return_date = extra.actualReturnDate;
      }
      const { error } = await supabase.from('leave_requests').update(updatePayload).eq('id', id);
      if (error) throw new Error(error.message);
    } else {
      localRequests = localRequests.map(r => r.id === id ? { ...r, status, ...extra } : r);
    }
  },

  async approveResumption(requestId: string) {
    let request: LeaveRequest | undefined;
    
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('leave_requests').select('*').eq('id', requestId).single();
      if (error || !data) throw new Error("Leave request not found");
      request = {
        id: data.id,
        employeeId: data.employee_id,
        employeeName: data.employee_name,
        department: data.department,
        type: data.type,
        startDate: data.start_date,
        endDate: data.end_date,
        days: data.days,
        reason: data.reason,
        status: data.status,
        managerId: data.manager_id,
        createdAt: data.created_at,
        actualReturnDate: data.actual_return_date,
        medicalCertificateUrl: data.medical_certificate_url
      };
    } else {
      request = localRequests.find(r => r.id === requestId);
    }

    if (!request || !request.actualReturnDate) throw new Error("Incomplete resumption data");

    const start = new Date(request.startDate);
    const resume = new Date(request.actualReturnDate);
    const diffTime = resume.getTime() - start.getTime();
    const actualDaysUsed = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const emp = await this.getEmployeeByName(request.employeeName);
    if (!emp) throw new Error("Employee profile not found");

    const balances: LeaveBalances = { ...emp.leaveBalances };
    const typeKey = request.type.toLowerCase() as keyof LeaveBalances;
    const usedKey = `${typeKey}Used` as keyof LeaveBalances;

    const trackedTypes = ['annual', 'sick', 'emergency'];
    if (trackedTypes.includes(typeKey)) {
      if (typeof balances[typeKey] === 'number') {
        balances[typeKey] = (balances[typeKey] as number) - actualDaysUsed;
      }
      if (typeof balances[usedKey] === 'number') {
        balances[usedKey] = (balances[usedKey] as number) + actualDaysUsed;
      }
    }

    await Promise.all([
      this.updateLeaveRequestStatus(requestId, 'Completed'),
      this.updateEmployeeBalances(emp.id, balances)
    ]);

    return { actualDaysUsed };
  },

  async getDepartmentMetrics(): Promise<DepartmentMetric[]> {
    if (!isSupabaseConfigured || !supabase) return [...DEPARTMENT_METRICS];
    try {
      const { data: employees } = await supabase.from('employees').select('department, nationality');
      if (!employees || employees.length === 0) return [...DEPARTMENT_METRICS];
      const depts = Array.from(new Set(employees.map(e => e.department)));
      return depts.map(deptName => {
        const deptEmployees = employees.filter(e => e.department === deptName);
        return {
          name: deptName,
          kuwaitiCount: deptEmployees.filter(e => e.nationality === 'Kuwaiti').length,
          expatCount: deptEmployees.filter(e => e.nationality === 'Expat').length,
          targetRatio: 30
        };
      });
    } catch (e) {
      return [...DEPARTMENT_METRICS];
    }
  }
};