
-- 1. ENSURE EMPLOYEES TABLE EXISTS WITH BASE COLUMNS
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  nationality TEXT CHECK (nationality IN ('Kuwaiti', 'Expat')),
  department TEXT NOT NULL,
  position TEXT NOT NULL,
  salary NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. MIGRATION: ADD MISSING COLUMNS IF THEY DON'T EXIST
-- This prevents the "column does not exist" error when running seed scripts.
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='employees' AND COLUMN_NAME='name_arabic') THEN
        ALTER TABLE employees ADD COLUMN name_arabic TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='employees' AND COLUMN_NAME='position_arabic') THEN
        ALTER TABLE employees ADD COLUMN position_arabic TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='employees' AND COLUMN_NAME='civil_id') THEN
        ALTER TABLE employees ADD COLUMN civil_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='employees' AND COLUMN_NAME='civil_id_expiry') THEN
        ALTER TABLE employees ADD COLUMN civil_id_expiry DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='employees' AND COLUMN_NAME='passport_number') THEN
        ALTER TABLE employees ADD COLUMN passport_number TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='employees' AND COLUMN_NAME='passport_expiry') THEN
        ALTER TABLE employees ADD COLUMN passport_expiry DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='employees' AND COLUMN_NAME='izn_amal_expiry') THEN
        ALTER TABLE employees ADD COLUMN izn_amal_expiry DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='employees' AND COLUMN_NAME='status') THEN
        ALTER TABLE employees ADD COLUMN status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'On Leave', 'Terminated'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='employees' AND COLUMN_NAME='leave_balances') THEN
        ALTER TABLE employees ADD COLUMN leave_balances JSONB DEFAULT '{"annual": 30, "sick": 15, "emergency": 6, "annualUsed": 0, "sickUsed": 0, "emergencyUsed": 0}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='employees' AND COLUMN_NAME='training_hours') THEN
        ALTER TABLE employees ADD COLUMN training_hours NUMERIC DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='employees' AND COLUMN_NAME='work_days_per_week') THEN
        ALTER TABLE employees ADD COLUMN work_days_per_week INTEGER DEFAULT 6;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='employees' AND COLUMN_NAME='iban') THEN
        ALTER TABLE employees ADD COLUMN iban TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='employees' AND COLUMN_NAME='bank_code') THEN
        ALTER TABLE employees ADD COLUMN bank_code TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='employees' AND COLUMN_NAME='join_date') THEN
        ALTER TABLE employees ADD COLUMN join_date DATE DEFAULT CURRENT_DATE;
    END IF;
END $$;

-- 3. ENSURE OTHER TABLES EXIST
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
  manager_id UUID NOT NULL,
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
    basic_salary NUMERIC NOT NULL,
    allowances NUMERIC DEFAULT 0,
    deductions NUMERIC DEFAULT 0,
    pifss_deduction NUMERIC DEFAULT 0,
    net_salary NUMERIC NOT NULL,
    verified_by_hr BOOLEAN DEFAULT FALSE,
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

-- 4. DISABLE RLS FOR SIMPLICITY IN DEMO
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public_holidays DISABLE ROW LEVEL SECURITY;

-- 5. GRANT PERMISSIONS
GRANT ALL ON TABLE employees TO anon, authenticated, service_role;
GRANT ALL ON TABLE leave_requests TO anon, authenticated, service_role;
GRANT ALL ON TABLE payroll_runs TO anon, authenticated, service_role;
GRANT ALL ON TABLE payroll_items TO anon, authenticated, service_role;
GRANT ALL ON TABLE public_holidays TO anon, authenticated, service_role;
