
export type UserRole = 'Admin' | 'Manager' | 'Employee';

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
  department: string;
  position: string;
  joinDate: string;
  salary: number;
  status: 'Active' | 'On Leave' | 'Terminated';
  managerId?: string;
  managerName?: string;
  leaveBalances: LeaveBalances;
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
  status: 'Pending' | 'Approved' | 'Rejected' | 'Resumed - Awaiting Approval' | 'Completed';
  managerId: string;
  createdAt: string;
  actualReturnDate?: string;
  medicalCertificateUrl?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'urgent' | 'reminder' | 'success';
  category: 'leave_start' | 'leave_return' | 'pending_approval';
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
  Leaves = 'leaves'
}
