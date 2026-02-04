
export type UserRole = 'Admin' | 'Manager' | 'Employee' | 'HR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  avatar?: string;
}

export interface LeaveBalances {
  annual: number;
  sick: number;
  emergency: number;
  annualUsed: number;
  sickUsed: number;
  emergencyUsed: number;
}

export interface Employee {
  id: string;
  name: string;
  nationality: 'Kuwaiti' | 'Expat';
  civilId?: string;
  civilIdExpiry?: string;
  pifssNumber?: string;
  passportNumber?: string;
  passportExpiry?: string;
  iznAmalExpiry?: string; // New field for Work Permit
  department: string;
  position: string;
  joinDate: string;
  salary: number;
  status: 'Active' | 'On Leave' | 'Terminated';
  managerId?: string;
  managerName?: string;
  leaveBalances: LeaveBalances;
  trainingHours: number;
  workDaysPerWeek: number;
  pifssStatus?: 'Registered' | 'Pending' | 'Exempt';
  lastResetYear?: number;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  location: string;
  status: 'On-Site' | 'Off-Site' | 'Late';
  coordinates: { lat: number; lng: number };
}

export interface OfficeLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number; // in meters
}

export interface PublicHoliday {
  id: string;
  name: string;
  date: string;
  type: 'National' | 'Religious' | 'Other';
  isFixed: boolean;
}

export interface SettlementResult {
  tenureYears: number;
  tenureMonths: number;
  tenureDays: number;
  indemnityAmount: number;
  leavePayout: number;
  totalSettlement: number;
  dailyRate: number;
  breakdown: {
    baseIndemnity: number;
    multiplierApplied: number;
    firstFiveYearAmount: number;
    subsequentYearAmount: number;
    leaveDaysEncashed: number;
  };
}

export type LeaveType = 
  | 'Annual' 
  | 'Sick' 
  | 'Emergency' 
  | 'Maternity' 
  | 'Hajj' 
  | 'Marriage' 
  | 'Compassionate' 
  | 'Paternity';

export interface LeaveHistoryEntry {
  user: string;
  role: string;
  action: string;
  timestamp: string;
  note?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'Pending' | 'Manager_Approved' | 'HR_Approved' | 'Resumed' | 'Rejected' | 'HR_Finalized' | 'Paid';
  managerId: string;
  createdAt: string;
  actualReturnDate?: string;
  medicalCertificateUrl?: string;
  history: LeaveHistoryEntry[];
}

export interface PayrollRun {
  id: string;
  period_key: string;
  cycle_type: 'Monthly' | 'Bi-Weekly';
  status: 'Draft' | 'Finalized';
  total_disbursement: number;
  created_at: string;
}

export interface PayrollItem {
  id: string;
  run_id: string;
  employee_id: string;
  employee_name?: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  pifss_deduction: number;
  net_salary: number;
  verified_by_hr: boolean;
  variance?: number;
}

export interface PayrollEntry {
  id?: string;
  employee_id: string;
  leave_id: string;
  deduction_amount: number;
  month_year: string;
  created_at?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'urgent' | 'reminder' | 'success';
  category: 'leave_start' | 'leave_return' | 'pending_approval' | 'payroll_alert' | 'document_expiry';
  timestamp: string;
  isRead: boolean;
  linkId?: string;
}

export interface DepartmentMetric {
  name: string;
  kuwaitiCount: number;
  expatCount: number;
  targetRatio: number;
}

export interface InsightReport {
  summary: string;
  recommendations: string[];
  complianceStatus: 'Compliant' | 'Warning' | 'Non-Compliant';
}

export enum View {
  Dashboard = 'dashboard',
  Directory = 'directory',
  Insights = 'insights',
  Compliance = 'compliance',
  Profile = 'profile',
  Leaves = 'leaves',
  Payroll = 'payroll',
  Settlement = 'settlement',
  Attendance = 'attendance'
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: ToastType;
}
