
-- 1. BASE TABLES
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_arabic TEXT,
  nationality TEXT CHECK (nationality IN ('Kuwaiti', 'Expat')),
  civil_id TEXT,
  civil_id_expiry DATE,
  pifss_number TEXT,
  passport_number TEXT,
  passport_expiry DATE,
  izn_amal_expiry DATE,
  department TEXT NOT NULL,
  position TEXT NOT NULL,
  position_arabic TEXT,
  join_date DATE DEFAULT CURRENT_DATE,
  salary NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'On Leave', 'Terminated')),
  leave_balances JSONB DEFAULT '{"annual": 30, "sick": 15, "emergency": 6, "annualUsed": 0, "sickUsed": 0, "emergencyUsed": 0}',
  training_hours NUMERIC DEFAULT 0,
  work_days_per_week INTEGER DEFAULT 6,
  iban TEXT,
  bank_code TEXT,
  face_token TEXT, -- Stores Base64 biometric reference image
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- MIGRATION: ADD face_token IF MISSING (For existing deployments)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='face_token') THEN
    ALTER TABLE employees ADD COLUMN face_token TEXT;
  END IF;
END $$;

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
  status TEXT DEFAULT 'Pending',
  manager_id UUID,
  history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_key TEXT NOT NULL UNIQUE, 
    cycle_type TEXT,
    status TEXT DEFAULT 'Draft',
    total_disbursement NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS payroll_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id),
    employee_name TEXT,
    basic_salary NUMERIC NOT NULL,
    allowances NUMERIC DEFAULT 0,
    deductions NUMERIC DEFAULT 0,
    pifss_deduction NUMERIC DEFAULT 0,
    net_salary NUMERIC NOT NULL,
    verified_by_hr BOOLEAN DEFAULT FALSE,
    variance NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public_holidays (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT,
  is_fixed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. SYSTEM DEFINITION TABLES
CREATE TABLE IF NOT EXISTS office_locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  radius NUMERIC NOT NULL DEFAULT 250,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS department_metrics (
  name TEXT PRIMARY KEY,
  kuwaiti_count INTEGER DEFAULT 0,
  expat_count INTEGER DEFAULT 0,
  target_ratio NUMERIC DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in TIME,
  clock_out TIME,
  location TEXT,
  status TEXT,
  coordinates JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. PERMISSIONS
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public_holidays DISABLE ROW LEVEL SECURITY;
ALTER TABLE office_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE department_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
