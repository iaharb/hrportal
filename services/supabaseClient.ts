import { createClient } from '@supabase/supabase-js';

/**
 * Production Readiness: 
 * Ensures all Supabase variables use the VITE_ prefix required by Vite
 * for exposure to the client-side bundle.
 */
const getEnvVar = (key: string, fallback: string): string => {
  try {
    // Cast import.meta to any to avoid "Property 'env' does not exist on type 'ImportMeta'" error
    const meta = import.meta as any;
    if (meta.env && meta.env[key]) {
      return meta.env[key];
    }
  } catch (e) {
    console.warn(`Environment access for ${key} failed, using fallback.`);
  }
  return fallback;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', 'https://tjkapzlfvxgocfitusxb.supabase.co');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqa2Fwemxmdnhnb2NmaXR1c3hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMjU0MjIsImV4cCI6MjA4NTcwMTQyMn0.sZVL7JE8aG8geFzC2z-_xRjMkozSQoIb1Tvohmk53c0');

export const isSupabaseConfigured = 
  !!supabaseUrl && 
  !!supabaseAnonKey && 
  !supabaseUrl.includes('YOUR_SUPABASE_URL_HERE');

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (!isSupabaseConfigured) {
  console.warn("Production Warning: Supabase variables missing. Using mock engine.");
} else {
  console.log("Registry: Production database client initialized.");
}