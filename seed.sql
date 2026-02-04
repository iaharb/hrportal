
-- Clean existing if necessary
TRUNCATE TABLE leave_requests CASCADE;
TRUNCATE TABLE employees CASCADE;
TRUNCATE TABLE public_holidays CASCADE;

-- 1. Insert Employees
INSERT INTO employees (id, name, nationality, civil_id, civil_id_expiry, izn_amal_expiry, department, position, join_date, salary, status, leave_balances, work_days_per_week)
VALUES 
('00000000-0000-0000-0000-000000000000', 'Dr. Faisal Al-Sabah', 'Kuwaiti', '280010101234', '2026-12-31', NULL, 'Executive', 'Director', '2010-01-01', 6000, 'Active', '{"annual": 30, "sick": 15, "emergency": 6, "annualUsed": 0, "sickUsed": 0, "emergencyUsed": 0}', 5),
('11111111-1111-1111-1111-111111111111', 'Ahmed Al-Sabah', 'Kuwaiti', '285010105678', '2024-06-15', NULL, 'Executive', 'Director', '2015-01-10', 4500, 'Active', '{"annual": 22, "sick": 15, "emergency": 4, "annualUsed": 8, "sickUsed": 0, "emergencyUsed": 2}', 5),
('55555555-5555-5555-5555-555555555555', 'Layla Al-Fadhli', 'Kuwaiti', '290031209876', '2025-01-20', NULL, 'HR', 'HR Specialist', '2017-03-12', 2800, 'Active', '{"annual": 30, "sick": 15, "emergency": 6, "annualUsed": 4, "sickUsed": 1, "emergencyUsed": 0}', 5),
('22222222-2222-2222-2222-222222222222', 'Sarah Al-Ghanim', 'Kuwaiti', '295052001122', '2024-04-10', NULL, 'IT', 'IT Manager', '2018-05-20', 3200, 'Active', '{"annual": 18, "sick": 12, "emergency": 5, "annualUsed": 12, "sickUsed": 3, "emergencyUsed": 1}', 5),
('33333333-3333-3333-3333-333333333333', 'John Doe', 'Expat', '289031503344', '2025-05-15', '2024-05-01', 'IT', 'Systems Architect', '2019-03-15', 2800, 'Active', '{"annual": 10, "sick": 14, "emergency": 2, "annualUsed": 20, "sickUsed": 1, "emergencyUsed": 4}', 6),
('44444444-4444-4444-4444-444444444444', 'Raj Patel', 'Expat', '292021005566', '2024-12-01', '2024-12-01', 'IT', 'Senior Developer', '2020-02-10', 2400, 'Active', '{"annual": 25, "sick": 15, "emergency": 6, "annualUsed": 5, "sickUsed": 0, "emergencyUsed": 0}', 6),
('99999999-9999-9999-9999-999999999999', 'Yousef Al-Enezi', 'Kuwaiti', '303090107788', '2024-05-25', NULL, 'IT', 'Junior Dev', '2023-09-01', 1500, 'Active', '{"annual": 30, "sick": 15, "emergency": 6, "annualUsed": 0, "sickUsed": 0, "emergencyUsed": 0}', 5)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  nationality = EXCLUDED.nationality,
  civil_id = EXCLUDED.civil_id,
  salary = EXCLUDED.salary;

-- 2. Insert Public Holidays
INSERT INTO public_holidays (id, name, date, type, is_fixed)
VALUES 
('13', 'New Year Day 2025', '2025-01-01', 'National', true),
('14', 'National Day 2025', '2025-02-25', 'National', true),
('15', 'Liberation Day 2025', '2025-02-26', 'National', true),
('16', 'New Year Day 2026', '2026-01-01', 'National', true),
('17', 'National Day 2026', '2026-02-25', 'National', true),
('18', 'Liberation Day 2026', '2026-02-26', 'National', true),
('19', 'Bridge Holiday 2026', '2026-03-01', 'National', false)
ON CONFLICT (id) DO UPDATE SET 
  date = EXCLUDED.date,
  name = EXCLUDED.name;

-- 3. Insert Dept Configs
INSERT INTO department_configs (dept_name, target_ratio, headcount_goal)
VALUES 
('Executive', 50, 5),
('IT', 40, 15),
('HR', 60, 10),
('Sales', 25, 30)
ON CONFLICT (dept_name) DO UPDATE SET target_ratio = EXCLUDED.target_ratio;

-- 4. Insert Announcements
INSERT INTO announcements (title, content, priority)
VALUES 
('Workforce Strategy 2026', 'Focusing on the March 1st holiday transition and Q1 training modules.', 'Normal'),
('Article 69 Updates', 'Important: New sick leave deduction thresholds are now live in the system.', 'High'),
('PAM Quota Alert', 'Executive department has reached 100% Kuwaitization goal! 🎉', 'Urgent');
