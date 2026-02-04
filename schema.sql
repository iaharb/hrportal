-- 1. CLEANUP (Optional: Uncomment if you want to reset)
-- DROP TABLE IF EXISTS leave_requests;
-- DROP TABLE IF EXISTS employees;

-- 2. EMPLOYEES TABLE
-- Stores profile data, PIFSS/PAM related info, and leave balances
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  nationality TEXT CHECK (nationality IN ('Kuwaiti', 'Expat')),
  department TEXT NOT NULL,
  position TEXT NOT NULL,
  join_date DATE DEFAULT CURRENT_DATE,
  salary NUMERIC NOT NULL,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'On Leave', 'Terminated')),
  -- JSONB for flexible balance tracking (Annual, Sick, Emergency)
  leave_balances JSONB DEFAULT '{
    "annual": 30, 
    "sick": 15, 
    "emergency": 6, 
    "annualUsed": 0, 
    "sickUsed": 0, 
    "emergencyUsed": 0
  }',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. LEAVE REQUESTS TABLE
-- Tracks leave lifecycle, medical evidence, and resumption dates
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  department TEXT NOT NULL,
  type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'Pending' CHECK (status IN (
    'Pending', 
    'Approved', 
    'Rejected', 
    'Resumed - Awaiting Approval', 
    'Completed'
  )),
  manager_id TEXT NOT NULL,
  actual_return_date DATE,
  medical_certificate_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. SECURITY & PERMISSIONS
-- Disable RLS for easier initial development (Enable and add Policies for Production)
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests DISABLE ROW LEVEL SECURITY;

-- Grant access to standard roles
GRANT ALL ON TABLE employees TO anon, authenticated, service_role;
GRANT ALL ON TABLE leave_requests TO anon, authenticated, service_role;

-- 5. INDEXES (Optimization for HR Search)
CREATE INDEX IF NOT EXISTS idx_employee_name ON employees (name);
CREATE INDEX IF NOT EXISTS idx_leave_emp_id ON leave_requests (employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests (status);
