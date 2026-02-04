
import { Employee, DepartmentMetric, LeaveRequest } from './types';

export const MOCK_EMPLOYEES: Employee[] = [
  // Executive
  { 
    id: '1', 
    name: 'Ahmed Al-Sabah', 
    nationality: 'Kuwaiti', 
    department: 'Executive', 
    position: 'Director', 
    joinDate: '2015-01-10', 
    salary: 4500, 
    status: 'Active',
    leaveBalances: { annual: 22, sick: 15, emergency: 4, annualUsed: 8, sickUsed: 0, emergencyUsed: 2 }
  },
  
  // IT
  { 
    id: '2', 
    name: 'Sarah Al-Ghanim', 
    nationality: 'Kuwaiti', 
    department: 'IT', 
    position: 'IT Manager', 
    joinDate: '2018-05-20', 
    salary: 3200, 
    status: 'Active', 
    managerId: '1', 
    managerName: 'Ahmed Al-Sabah',
    leaveBalances: { annual: 18, sick: 12, emergency: 5, annualUsed: 12, sickUsed: 3, emergencyUsed: 1 }
  },
  { 
    id: '3', 
    name: 'John Doe', 
    nationality: 'Expat', 
    department: 'IT', 
    position: 'Systems Architect', 
    joinDate: '2019-03-15', 
    salary: 2800, 
    status: 'Active', 
    managerId: '2', 
    managerName: 'Sarah Al-Ghanim',
    leaveBalances: { annual: 10, sick: 14, emergency: 2, annualUsed: 20, sickUsed: 1, emergencyUsed: 4 }
  },
  { 
    id: '4', 
    name: 'Raj Patel', 
    nationality: 'Expat', 
    department: 'IT', 
    position: 'Senior Developer', 
    joinDate: '2020-02-10', 
    salary: 2400, 
    status: 'Active', 
    managerId: '2', 
    managerName: 'Sarah Al-Ghanim',
    leaveBalances: { annual: 25, sick: 15, emergency: 6, annualUsed: 5, sickUsed: 0, emergencyUsed: 0 }
  },
  { 
    id: '9', 
    name: 'Yousef Al-Enezi', 
    nationality: 'Kuwaiti', 
    department: 'IT', 
    position: 'Junior Dev', 
    joinDate: '2023-09-01', 
    salary: 1500, 
    status: 'Active', 
    managerId: '2', 
    managerName: 'Sarah Al-Ghanim',
    leaveBalances: { annual: 30, sick: 15, emergency: 6, annualUsed: 0, sickUsed: 0, emergencyUsed: 0 }
  },
];

export const MOCK_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: 'lr-1',
    employeeId: '2',
    employeeName: 'Sarah Al-Ghanim',
    department: 'IT',
    type: 'Annual',
    startDate: '2024-03-01',
    endDate: '2024-03-05',
    days: 3,
    reason: 'Family vacation',
    status: 'Approved',
    managerId: '1',
    createdAt: '2024-02-20T10:00:00Z'
  },
  {
    id: 'lr-3',
    employeeId: '4',
    employeeName: 'Raj Patel',
    department: 'IT',
    type: 'Annual',
    startDate: '2024-03-15',
    endDate: '2024-03-20',
    days: 4,
    reason: 'Personal leave',
    status: 'Approved',
    managerId: '2',
    createdAt: '2024-03-01T11:00:00Z'
  },
  {
    id: 'lr-2',
    employeeId: '9',
    employeeName: 'Yousef Al-Enezi',
    department: 'IT',
    type: 'Sick',
    startDate: '2024-03-10',
    endDate: '2024-03-11',
    days: 2,
    reason: 'Medical appointment',
    status: 'Pending',
    managerId: '2',
    createdAt: '2024-03-05T09:30:00Z'
  }
];

export const DEPARTMENT_METRICS: DepartmentMetric[] = [
  { name: 'Executive', kuwaitiCount: 1, expatCount: 0, targetRatio: 80 },
  { name: 'IT', kuwaitiCount: 2, expatCount: 3, targetRatio: 30 },
  { name: 'HR', kuwaitiCount: 1, expatCount: 0, targetRatio: 50 },
  { name: 'Operations', kuwaitiCount: 1, expatCount: 1, targetRatio: 20 },
  { name: 'Sales', kuwaitiCount: 1, expatCount: 1, targetRatio: 25 },
];
