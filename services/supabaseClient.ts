
import { createClient } from '@supabase/supabase-js';

/**
 * SUPABASE SQL SCHEMA (UPDATED):
 * 
 * -- 1. Create Employees Table
 * CREATE TABLE IF NOT EXISTS employees (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   name TEXT NOT NULL,
 *   nationality TEXT CHECK (nationality IN ('Kuwaiti', 'Expat')),
 *   department TEXT NOT NULL,
 *   position TEXT NOT NULL,
 *   join_date DATE DEFAULT CURRENT_DATE,
 *   salary NUMERIC NOT NULL,
 *   status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'On Leave', 'Terminated')),
 *   leave_balances JSONB DEFAULT '{"annual": 30, "sick": 15, "emergency": 6, "annualUsed": 0, "sickUsed": 0, "emergencyUsed": 0}',
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
 * );
 * 
 * -- 2. Create Leave Requests Table (Includes Resumption & Medical Certificate support)
 * CREATE TABLE IF NOT EXISTS leave_requests (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   employee_id TEXT NOT NULL,
 *   employee_name TEXT NOT NULL,
 *   department TEXT NOT NULL,
 *   type TEXT NOT NULL,
 *   start_date DATE NOT NULL,
 *   end_date DATE NOT NULL,
 *   days INTEGER NOT NULL,
 *   reason TEXT,
 *   status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Resumed - Awaiting Approval', 'Completed')),
 *   manager_id TEXT NOT NULL,
 *   actual_return_date DATE,
 *   medical_certificate_url TEXT,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
 * );
 */

const supabaseUrl = (process.env as any).SUPABASE_URL || 'https://tjkapzlfvxgocfitusxb.supabase.co';
const supabaseAnonKey = (process.env as any).SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqa2Fwemxmdnhnb2NmaXR1c3hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMjU0MjIsImV4cCI6MjA4NTcwMTQyMn0.sZVL7JE8aG8geFzC2z-_xRjMkozSQoIb1Tvohmk53c0';

export const isSupabaseConfigured = 
  !!supabaseUrl && 
  !!supabaseAnonKey && 
  !supabaseUrl.includes('YOUR_SUPABASE_URL_HERE');

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (!isSupabaseConfigured) {
  console.warn("Supabase is not configured. The app is running in 'Demo Mode' using local mock data.");
}
