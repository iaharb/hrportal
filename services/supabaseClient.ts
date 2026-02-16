import { createClient } from '@supabase/supabase-js';

/**
 * Robust helper to safely access environment variables in both dev and production (Docker) environments.
 */
const getEnvVar = (key: string): string | undefined => {
  try {
    // Check injected globals from vite.config.ts first (Production/Docker build)
    if (typeof process !== 'undefined' && process.env) {
      const val = (process.env as any)[key];
      if (val) return val;
    }
    
    // Check Vite standard (Development)
    const meta = import.meta as any;
    if (meta && meta.env) {
      const val = meta.env[key];
      if (val) return val;
    }
  } catch (e) {}
  return undefined;
};

// Use injected variables or fallback to the provided default
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || 'https://tjkapzlfvxgocfitusxb.supabase.co';
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqa2Fwemxmdnhnb2NmaXR1c3hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMjU0MjIsImV4cCI6MjA4NTcwMTQyMn0.sZVL7JE8aG8geFzC2z-_xRjMkozSQoIb1Tvohmk53c0';

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (isSupabaseConfigured) {
  console.log("Supabase infrastructure linked.");
}
