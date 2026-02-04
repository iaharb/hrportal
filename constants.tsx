
import { Employee, LeaveRequest, DepartmentMetric, PublicHoliday, OfficeLocation } from './types.ts';

export const MOCK_EMPLOYEES: Employee[] = [
  { 
    id: '00000000-0000-0000-0000-000000000000', 
    name: 'Dr. Faisal Al-Sabah', 
    nationality: 'Kuwaiti', 
    department: 'Executive', 
    position: 'Director', 
    joinDate: '2010-01-01', 
    salary: 6000, 
    status: 'Active',
    trainingHours: 120,
    workDaysPerWeek: 5,
    civilIdExpiry: '2026-12-31',
    leaveBalances: { annual: 30, sick: 15, emergency: 6, annualUsed: 0, sickUsed: 0, emergencyUsed: 0 }
  },
  { 
    id: '11111111-1111-1111-1111-111111111111', 
    name: 'Ahmed Al-Sabah', 
    nationality: 'Kuwaiti', 
    department: 'Executive', 
    position: 'Director', 
    joinDate: '2015-01-10', 
    salary: 4500, 
    status: 'Active',
    trainingHours: 85,
    workDaysPerWeek: 5,
    civilIdExpiry: '2024-06-15',
    leaveBalances: { annual: 22, sick: 15, emergency: 4, annualUsed: 8, sickUsed: 0, emergencyUsed: 2 }
  },
  { 
    id: '55555555-5555-5555-5555-555555555555', 
    name: 'Layla Al-Fadhli', 
    nationality: 'Kuwaiti', 
    department: 'HR', 
    position: 'HR Specialist', 
    joinDate: '2017-03-12', 
    salary: 2800, 
    status: 'Active',
    managerId: '00000000-0000-0000-0000-000000000000',
    managerName: 'Dr. Faisal Al-Sabah',
    trainingHours: 65,
    workDaysPerWeek: 5,
    civilIdExpiry: '2025-01-20',
    leaveBalances: { annual: 30, sick: 15, emergency: 6, annualUsed: 4, sickUsed: 1, emergencyUsed: 0 }
  },
  { 
    id: '22222222-2222-2222-2222-222222222222', 
    name: 'Sarah Al-Ghanim', 
    nationality: 'Kuwaiti', 
    department: 'IT', 
    position: 'IT Manager', 
    joinDate: '2018-05-20', 
    salary: 3200, 
    status: 'Active', 
    managerId: '11111111-1111-1111-1111-111111111111', 
    managerName: 'Ahmed Al-Sabah',
    trainingHours: 45,
    workDaysPerWeek: 5,
    civilIdExpiry: '2024-04-10', // CRITICAL
    leaveBalances: { annual: 18, sick: 12, emergency: 5, annualUsed: 12, sickUsed: 3, emergencyUsed: 1 }
  },
  { 
    id: '33333333-3333-3333-3333-333333333333', 
    name: 'John Doe', 
    nationality: 'Expat', 
    department: 'IT', 
    position: 'Systems Architect', 
    joinDate: '2019-03-15', 
    salary: 2800, 
    status: 'Active', 
    managerId: '22222222-2222-2222-2222-222222222222', 
    managerName: 'Sarah Al-Ghanim',
    trainingHours: 32,
    workDaysPerWeek: 6,
    civilIdExpiry: '2025-05-15',
    passportExpiry: '2024-11-20',
    iznAmalExpiry: '2024-05-01', // CRITICAL EXPAT DOC
    leaveBalances: { annual: 10, sick: 14, emergency: 2, annualUsed: 20, sickUsed: 1, emergencyUsed: 4 }
  },
  { 
    id: '44444444-4444-4444-4444-444444444444', 
    name: 'Raj Patel', 
    nationality: 'Expat', 
    department: 'IT', 
    position: 'Senior Developer', 
    joinDate: '2020-02-10', 
    salary: 2400, 
    status: 'Active', 
    managerId: '22222222-2222-2222-2222-222222222222', 
    managerName: 'Sarah Al-Ghanim',
    trainingHours: 28,
    workDaysPerWeek: 6,
    iznAmalExpiry: '2024-12-01',
    leaveBalances: { annual: 25, sick: 15, emergency: 6, annualUsed: 5, sickUsed: 0, emergencyUsed: 0 }
  },
  { 
    id: '99999999-9999-9999-9999-999999999999', 
    name: 'Yousef Al-Enezi', 
    nationality: 'Kuwaiti', 
    department: 'IT', 
    position: 'Junior Dev', 
    joinDate: '2023-09-01', 
    salary: 1500, 
    status: 'Active', 
    managerId: '22222222-2222-2222-2222-222222222222', 
    managerName: 'Sarah Al-Ghanim',
    trainingHours: 10,
    workDaysPerWeek: 5,
    civilIdExpiry: '2024-05-25',
    leaveBalances: { annual: 30, sick: 15, emergency: 6, annualUsed: 0, sickUsed: 0, emergencyUsed: 0 }
  }
];

export const MOCK_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: '00000000-0000-0000-0000-000000000101',
    employeeId: '22222222-2222-2222-2222-222222222222',
    employeeName: 'Sarah Al-Ghanim',
    department: 'IT',
    type: 'Annual',
    startDate: '2025-10-10',
    endDate: '2025-10-15',
    days: 3,
    reason: 'Family event',
    status: 'Manager_Approved',
    managerId: '11111111-1111-1111-1111-111111111111',
    createdAt: new Date().toISOString(),
    history: [
      { user: 'Sarah Al-Ghanim', role: 'Manager', action: 'Requested', timestamp: new Date().toISOString() },
      { user: 'Ahmed Al-Sabah', role: 'Admin', action: 'Manager_Approved', timestamp: new Date().toISOString(), note: 'Approved.' }
    ]
  }
];

export const DEPARTMENT_METRICS: DepartmentMetric[] = [
  { name: 'Executive', kuwaitiCount: 2, expatCount: 0, targetRatio: 30 },
  { name: 'IT', kuwaitiCount: 3, expatCount: 2, targetRatio: 30 },
  { name: 'HR', kuwaitiCount: 2, expatCount: 1, targetRatio: 30 },
  { name: 'Sales', kuwaitiCount: 4, expatCount: 8, targetRatio: 30 }
];

export const KUWAIT_PUBLIC_HOLIDAYS: PublicHoliday[] = [
  { id: '13', name: 'New Year Day 2025', date: '2025-01-01', type: 'National', isFixed: true },
  { id: '14', name: 'National Day 2025', date: '2025-02-25', type: 'National', isFixed: true },
  { id: '15', name: 'Liberation Day 2025', date: '2025-02-26', type: 'National', isFixed: true },
  { id: '16', name: 'New Year Day 2026', date: '2026-01-01', type: 'National', isFixed: true },
  { id: '17', name: 'National Day 2026', date: '2026-02-25', type: 'National', isFixed: true },
  { id: '18', name: 'Liberation Day 2026', date: '2026-02-26', type: 'National', isFixed: true },
  { id: '19', name: 'Bridge Holiday 2026', date: '2026-03-01', type: 'National', isFixed: false }
];

export const OFFICE_LOCATIONS: OfficeLocation[] = [
  { id: 'shuwaikh', name: 'Shuwaikh Industrial Zone', lat: 29.3400, lng: 47.9200, radius: 500 },
  { id: 'sulaibiya', name: 'Sulaibiya Logistics Hub', lat: 29.2800, lng: 47.8100, radius: 500 },
  { id: 'hq', name: 'Kuwait City HQ (Al Hamra)', lat: 29.3785, lng: 47.9902, radius: 200 }
];
