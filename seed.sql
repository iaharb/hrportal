-- SEED INITIAL EMPLOYEES
INSERT INTO employees (name, nationality, department, position, join_date, salary, status, leave_balances)
VALUES 
('Ahmed Al-Sabah', 'Kuwaiti', 'Executive', 'Director', '2015-01-10', 4500, 'Active', '{"annual": 22, "sick": 15, "emergency": 4, "annualUsed": 8, "sickUsed": 0, "emergencyUsed": 2}'),
('Sarah Al-Ghanim', 'Kuwaiti', 'IT', 'IT Manager', '2018-05-20', 3200, 'Active', '{"annual": 18, "sick": 12, "emergency": 5, "annualUsed": 12, "sickUsed": 3, "emergencyUsed": 1}'),
('John Doe', 'Expat', 'IT', 'Systems Architect', '2019-03-15', 2800, 'Active', '{"annual": 10, "sick": 14, "emergency": 2, "annualUsed": 20, "sickUsed": 1, "emergencyUsed": 4}'),
('Raj Patel', 'Expat', 'IT', 'Senior Developer', '2020-02-10', 2400, 'Active', '{"annual": 25, "sick": 15, "emergency": 6, "annualUsed": 5, "sickUsed": 0, "emergencyUsed": 0}'),
('Yousef Al-Enezi', 'Kuwaiti', 'IT', 'Junior Dev', '2023-09-01', 1500, 'Active', '{"annual": 30, "sick": 15, "emergency": 6, "annualUsed": 0, "sickUsed": 0, "emergencyUsed": 0}');

-- SEED INITIAL LEAVE REQUESTS
INSERT INTO leave_requests (employee_id, employee_name, department, type, start_date, end_date, days, reason, status, manager_id)
VALUES 
('2', 'Sarah Al-Ghanim', 'IT', 'Annual', '2024-03-01', '2024-03-05', 3, 'Family vacation', 'Approved', '1'),
('4', 'Raj Patel', 'IT', 'Annual', '2024-03-15', '2024-03-20', 4, 'Personal leave', 'Approved', '2'),
('9', 'Yousef Al-Enezi', 'IT', 'Sick', '2024-03-10', '2024-03-11', 2, 'Medical appointment', 'Pending', '2');
