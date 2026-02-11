
-- 1. INSERT/UPDATE EMPLOYEES (UPSERT)
INSERT INTO employees (id, name, name_arabic, nationality, civil_id, civil_id_expiry, passport_number, passport_expiry, izn_amal_expiry, department, position, position_arabic, join_date, salary, status, leave_balances, work_days_per_week, iban, bank_code, face_token)
VALUES 
('00000000-0000-0000-0000-000000000000', 'Dr. Faisal Al-Sabah', 'د. فيصل الصباح', 'Kuwaiti', '280010101234', '2026-12-31', 'K1000001', '2028-01-01', NULL, 'Executive', 'Director', 'مدير', '2010-01-01', 6500, 'Active', '{"annual": 30, "sick": 15, "emergency": 6, "annualUsed": 0, "sickUsed": 0, "emergencyUsed": 0}', 5, 'KW001234567890123456789012', 'NBK', NULL),
('11111111-1111-1111-1111-111111111111', 'Ahmed Al-Sabah', 'أحمد الصباح', 'Kuwaiti', '285010105678', '2024-06-15', 'K1000002', '2024-12-31', NULL, 'Executive', 'Deputy Director', 'نائب مدير', '2015-01-10', 4500, 'Active', '{"annual": 22, "sick": 15, "emergency": 4, "annualUsed": 8, "sickUsed": 0, "emergencyUsed": 2}', 5, 'KW001234567890123456789013', 'NBK', NULL),
('55555555-5555-5555-5555-555555555555', 'Layla Al-Fadhli', 'ليلى الفضلي', 'Kuwaiti', '290031209876', '2025-01-20', 'K1000003', '2027-01-01', NULL, 'HR', 'HR Director', 'مدير الموارد البشرية', '2017-03-12', 3200, 'Active', '{"annual": 30, "sick": 15, "emergency": 6, "annualUsed": 4, "sickUsed": 1, "emergencyUsed": 0}', 5, 'KW001234567890123456789014', 'KFH', NULL),
('22222222-2222-2222-2222-222222222222', 'Sarah Al-Ghanim', 'سارة الغانم', 'Kuwaiti', '295052001122', '2026-04-10', 'K1000004', '2026-01-01', NULL, 'IT', 'IT Manager', 'مدير تقنية معلومات', '2018-05-20', 3800, 'Active', '{"annual": 18, "sick": 12, "emergency": 5, "annualUsed": 12, "sickUsed": 3, "emergencyUsed": 1}', 5, 'KW001234567890123456789015', 'NBK', NULL),
('33333333-3333-3333-3333-333333333333', 'John Doe', 'جون دو', 'Expat', '289031503344', '2025-05-15', 'P500001', '2024-03-20', '2024-04-01', 'IT', 'Systems Architect', 'مهندس أنظمة', '2019-03-15', 2800, 'Active', '{"annual": 10, "sick": 14, "emergency": 2, "annualUsed": 20, "sickUsed": 1, "emergencyUsed": 4}', 6, 'KW001234567890123456789016', 'BURGAN', NULL),
('00000000-0000-0000-0000-000000000001', 'Mariam Al-Kandari', 'مريم الكندري', 'Kuwaiti', '292081501122', '2025-11-01', 'K1000005', '2029-01-01', NULL, 'Finance', 'Finance Head', 'رئيس المالية', '2016-08-15', 3400, 'Active', '{"annual": 30, "sick": 15, "emergency": 6, "annualUsed": 0, "sickUsed": 0, "emergencyUsed": 0}', 5, 'KW001234567890123456789017', 'KFH', NULL),
('00000000-0000-0000-0000-000000000002', 'Bader Al-Mutairi', 'بدر المطيري', 'Kuwaiti', '294112003344', '2024-05-30', 'K1000006', '2024-06-01', NULL, 'Finance', 'Senior Auditor', 'مدقق مالي', '2019-11-20', 2600, 'Active', '{"annual": 30, "sick": 15, "emergency": 6, "annualUsed": 2, "sickUsed": 0, "emergencyUsed": 0}', 5, 'KW001234567890123456789018', 'NBK', NULL),
('00000000-0000-0000-0000-000000000003', 'Chloe Smith', 'كلوي سميث', 'Expat', '296021405566', '2025-08-12', 'P500002', '2025-02-01', '2025-02-15', 'Sales', 'Account Director', 'مدير حسابات', '2021-02-14', 2900, 'Active', '{"annual": 25, "sick": 15, "emergency": 6, "annualUsed": 0, "sickUsed": 0, "emergencyUsed": 0}', 6, 'KW001234567890123456789019', 'NBK', NULL),
('00000000-0000-0000-0000-000000000004', 'Ali Hassan', 'علي حسن', 'Expat', '290060107788', '2024-04-22', 'P500003', '2026-01-01', '2024-05-01', 'Operations', 'Logistics Lead', 'رئيس الخدمات اللوجستية', '2018-06-01', 1800, 'Active', '{"annual": 20, "sick": 15, "emergency": 6, "annualUsed": 5, "sickUsed": 0, "emergencyUsed": 0}', 6, 'KW001234567890123456789020', 'KFH', NULL),
('00000000-0000-0000-0000-000000000005', 'Fatima Al-Zahra', 'فاطمة الزهراء', 'Kuwaiti', '298091009900', '2027-10-10', 'K1000010', '2030-01-01', NULL, 'HR', 'Recruitment Manager', 'مدير توظيف', '2020-09-10', 2800, 'Active', '{"annual": 30, "sick": 15, "emergency": 6, "annualUsed": 0, "sickUsed": 0, "emergencyUsed": 0}', 5, 'KW001234567890123456789021', 'NBK', NULL)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_arabic = EXCLUDED.name_arabic,
  nationality = EXCLUDED.nationality,
  civil_id = EXCLUDED.civil_id,
  civil_id_expiry = EXCLUDED.civil_id_expiry,
  passport_number = EXCLUDED.passport_number,
  passport_expiry = EXCLUDED.passport_expiry,
  izn_amal_expiry = EXCLUDED.izn_amal_expiry,
  department = EXCLUDED.department,
  position = EXCLUDED.position,
  position_arabic = EXCLUDED.position_arabic,
  join_date = EXCLUDED.join_date,
  salary = EXCLUDED.salary,
  status = EXCLUDED.status,
  leave_balances = EXCLUDED.leave_balances,
  work_days_per_week = EXCLUDED.work_days_per_week,
  iban = EXCLUDED.iban,
  bank_code = EXCLUDED.bank_code,
  face_token = EXCLUDED.face_token;
