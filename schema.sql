
-- 1. EMPLOYEES TABLE
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  nationality TEXT CHECK (nationality IN ('Kuwaiti', 'Expat')),
  civil_id TEXT,
  civil_id_expiry DATE,
  passport_number TEXT,
  passport_expiry DATE,
  izn_amal_expiry DATE,
  department TEXT NOT NULL,
  position TEXT NOT NULL,
  join_date DATE DEFAULT CURRENT_DATE,
  salary NUMERIC NOT NULL,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'On Leave', 'Terminated')),
  leave_balances JSONB DEFAULT '{
    "annual": 30, 
    "sick": 15, 
    "emergency": 6, 
    "annualUsed": 0, 
    "sickUsed": 0, 
    "emergencyUsed": 0
  }',
  training_hours NUMERIC DEFAULT 0,
  work_days_per_week INTEGER DEFAULT 6,
  last_reset_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. LEAVE REQUESTS TABLE
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  department TEXT NOT NULL,
  type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'Pending' CHECK (status IN (
    'Pending', 
    'Manager_Approved', 
    'HR_Approved',
    'Resumed',
    'Rejected', 
    'HR_Finalized',
    'Paid'
  )),
  manager_id UUID NOT NULL,
  actual_return_date DATE,
  medical_certificate_url TEXT,
  history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. PUBLIC HOLIDAYS TABLE
CREATE TABLE IF NOT EXISTS public_holidays (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT CHECK (type IN ('National', 'Religious', 'Other')),
  is_fixed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. PAYROLL RUNS
CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_key TEXT NOT NULL UNIQUE, 
    cycle_type TEXT CHECK (cycle_type IN ('Monthly', 'Bi-Weekly')),
    status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Finalized')),
    total_disbursement NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. PAYROLL ITEMS
CREATE TABLE IF NOT EXISTS payroll_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id),
    basic_salary NUMERIC NOT NULL,
    allowances NUMERIC DEFAULT 0,
    deductions NUMERIC DEFAULT 0,
    pifss_deduction NUMERIC DEFAULT 0,
    net_salary NUMERIC NOT NULL,
    verified_by_hr BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. HISTORICAL PAYROLL ENTRIES
CREATE TABLE IF NOT EXISTS payroll_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_id UUID NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
  deduction_amount NUMERIC NOT NULL DEFAULT 0,
  month_year TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. DEPARTMENT CONFIGS
CREATE TABLE IF NOT EXISTS department_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dept_name TEXT NOT NULL UNIQUE,
  target_ratio INTEGER DEFAULT 30,
  manager_id UUID,
  headcount_goal INTEGER DEFAULT 10,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('Normal', 'High', 'Urgent')) DEFAULT 'Normal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public_holidays DISABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE department_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE employees TO anon, authenticated, service_role;
GRANT ALL ON TABLE leave_requests TO anon, authenticated, service_role;
GRANT ALL ON TABLE public_holidays TO anon, authenticated, service_role;
GRANT ALL ON TABLE payroll_runs TO anon, authenticated, service_role;
GRANT ALL ON TABLE payroll_items TO anon, authenticated, service_role;
GRANT ALL ON TABLE payroll_entries TO anon, authenticated, service_role;
GRANT ALL ON TABLE department_configs TO anon, authenticated, service_role;
GRANT ALL ON TABLE announcements TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_payroll_run_id ON payroll_items (run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_emp_id ON payroll_items (employee_id);
CREATE INDEX IF NOT EXISTS idx_holiday_date ON public_holidays (date);
