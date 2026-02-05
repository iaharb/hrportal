
import { Employee, LeaveRequest, DepartmentMetric, PublicHoliday, OfficeLocation } from './types.ts';

export const MOCK_EMPLOYEES: Employee[] = [
  { 
    id: '00000000-0000-0000-0000-000000000000', 
    name: 'Dr. Faisal Al-Sabah', 
    nameArabic: 'د. فيصل الصباح',
    nationality: 'Kuwaiti', department: 'Executive', position: 'Director', positionArabic: 'مدير',
    joinDate: '2010-01-01', salary: 6500, status: 'Active',
    trainingHours: 120, workDaysPerWeek: 5, civilIdExpiry: '2026-12-31',
    leaveBalances: { annual: 30, sick: 15, emergency: 6, annualUsed: 0, sickUsed: 0, emergencyUsed: 0 },
    iban: 'KW001234567890123456789012', bankCode: 'NBK'
  },
  { 
    id: '11111111-1111-1111-1111-111111111111', 
    name: 'Ahmed Al-Sabah', 
    nameArabic: 'أحمد الصباح',
    nationality: 'Kuwaiti', department: 'Executive', position: 'Deputy Director', positionArabic: 'نائب مدير',
    joinDate: '2015-01-10', salary: 4500, status: 'Active',
    trainingHours: 85, workDaysPerWeek: 5, civilIdExpiry: '2024-06-15',
    leaveBalances: { annual: 22, sick: 15, emergency: 4, annualUsed: 8, sickUsed: 0, emergencyUsed: 2 },
    iban: 'KW001234567890123456789013', bankCode: 'NBK'
  },
  { 
    id: '55555555-5555-5555-5555-555555555555', 
    name: 'Layla Al-Fadhli', 
    nameArabic: 'ليلى الفضلي',
    nationality: 'Kuwaiti', department: 'HR', position: 'HR Director', positionArabic: 'مدير الموارد البشرية',
    joinDate: '2017-03-12', salary: 3200, status: 'Active',
    trainingHours: 65, workDaysPerWeek: 5, civilIdExpiry: '2025-01-20',
    leaveBalances: { annual: 30, sick: 15, emergency: 6, annualUsed: 4, sickUsed: 1, emergencyUsed: 0 },
    iban: 'KW001234567890123456789014', bankCode: 'KFH'
  },
  { 
    id: '22222222-2222-2222-2222-222222222222', 
    name: 'Sarah Al-Ghanim', 
    nameArabic: 'سارة الغانم',
    nationality: 'Kuwaiti', department: 'IT', position: 'IT Manager', positionArabic: 'مدير تقنية معلومات',
    joinDate: '2018-05-20', salary: 3800, status: 'Active',
    trainingHours: 45, workDaysPerWeek: 5, civilIdExpiry: '2026-04-10',
    leaveBalances: { annual: 18, sick: 12, emergency: 5, annualUsed: 12, sickUsed: 3, emergencyUsed: 1 },
    iban: 'KW001234567890123456789015', bankCode: 'NBK'
  },
  { 
    id: '33333333-3333-3333-3333-333333333333', 
    name: 'John Doe', 
    nameArabic: 'جون دو',
    nationality: 'Expat', department: 'IT', position: 'Systems Architect', positionArabic: 'مهندس أنظمة',
    joinDate: '2019-03-15', salary: 2800, status: 'Active',
    trainingHours: 32, workDaysPerWeek: 6, civilIdExpiry: '2025-05-15', passportExpiry: '2024-03-20', iznAmalExpiry: '2024-04-01',
    leaveBalances: { annual: 10, sick: 14, emergency: 2, annualUsed: 20, sickUsed: 1, emergencyUsed: 4 },
    iban: 'KW001234567890123456789016', bankCode: 'BURGAN'
  }
];

export const MOCK_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: 'lr01', employeeId: '22222222-2222-2222-2222-222222222222', employeeName: 'Sarah Al-Ghanim', department: 'IT', type: 'Annual',
    startDate: '2025-10-10', endDate: '2025-10-15', days: 3, reason: 'Family event', status: 'Manager_Approved',
    managerId: '11111111-1111-1111-1111-111111111111', createdAt: '2025-09-20T10:00:00Z', history: []
  },
  {
    id: 'lr02', employeeId: '33333333-3333-3333-3333-333333333333', employeeName: 'John Doe', department: 'IT', type: 'Sick',
    startDate: '2026-01-02', endDate: '2026-01-05', days: 3, reason: 'Flu recovery', status: 'Paid',
    managerId: '22222222-2222-2222-2222-222222222222', createdAt: '2026-01-01T08:00:00Z', history: []
  }
];

export const DEPARTMENT_METRICS: DepartmentMetric[] = [
  { name: 'Executive', kuwaitiCount: 3, expatCount: 0, targetRatio: 50 },
  { name: 'IT', kuwaitiCount: 5, expatCount: 4, targetRatio: 40 },
  { name: 'HR', kuwaitiCount: 3, expatCount: 1, targetRatio: 60 },
  { name: 'Sales', kuwaitiCount: 3, expatCount: 3, targetRatio: 30 },
  { name: 'Operations', kuwaitiCount: 2, expatCount: 4, targetRatio: 25 },
  { name: 'Finance', kuwaitiCount: 4, expatCount: 0, targetRatio: 40 }
];

export const KUWAIT_PUBLIC_HOLIDAYS: PublicHoliday[] = [
  { id: '13', name: 'New Year Day 2025', date: '2025-01-01', type: 'National', isFixed: true },
  { id: '14', name: 'National Day 2025', date: '2025-02-25', type: 'National', isFixed: true },
  { id: '15', name: 'Liberation Day 2025', date: '2025-02-26', type: 'National', isFixed: true },
  { id: '16', name: 'Eid Al-Fitr 2025', date: '2025-03-31', type: 'Religious', isFixed: false },
  { id: '17', name: 'National Day 2026', date: '2026-02-25', type: 'National', isFixed: true },
  { id: '18', name: 'Liberation Day 2026', date: '2026-02-26', type: 'National', isFixed: true }
];

export const OFFICE_LOCATIONS: OfficeLocation[] = [
  { id: 'hq', name: 'Kuwait City HQ (Al Hamra)', lat: 29.3785, lng: 47.9902, radius: 250 },
  { id: 'shuwaikh-active', name: 'Shuwaikh Active Workspace', lat: 29.3375, lng: 47.9172, radius: 500 },
  { id: 'shuwaikh-main', name: 'Shuwaikh Branch (Block 1)', lat: 29.3458, lng: 47.9351, radius: 600 },
  { id: 'shuwaikh-ind', name: 'Shuwaikh Industrial Zone', lat: 29.3400, lng: 47.9200, radius: 800 },
  { id: 'sulaibiya', name: 'Sulaibiya Logistics Hub', lat: 29.2884, lng: 47.8164, radius: 1000 }
];
