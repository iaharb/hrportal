
import { createClient } from '@supabase/supabase-js';

/**
 * Robust helper to safely access environment variables.
 * Prevents "Cannot read properties of undefined" errors in environments where
 * import.meta.env or process.env might be partially missing or inaccessible.
 */
const getEnvVar = (key: string): string | undefined => {
  try {
    // 1. Try process.env first (Common in many builds/shims)
    if (typeof process !== 'undefined' && process.env) {
      const val = (process.env as any)[key];
      if (val) return val;
    }
    
    // 2. Try import.meta.env (Vite specific)
    // Using cast to 'any' and property check to avoid runtime access errors if env is missing
    const meta = import.meta as any;
    if (meta && meta.env) {
      const val = meta.env[key];
      if (val) return val;
    }
  } catch (e) {
    // Silently fall through to fallback values
  }
  return undefined;
};

// Fallback to hardcoded credentials if environment variables are not injected
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || 'https://tjkapzlfvxgocfitusxb.supabase.co';
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqa2Fwemxmdnhnb2NmaXR1c3hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMjU0MjIsImV4cCI6MjA4NTcwMTQyMn0.sZVL7JE8aG8geFzC2z-_xRjMkozSQoIb1Tvohmk53c0';

// Check if configuration is valid
export const isSupabaseConfigured = 
  !!supabaseUrl && 
  !!supabaseAnonKey && 
  !supabaseUrl.includes('YOUR_SUPABASE_URL_HERE');

// Initialize client if possible, otherwise null
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (!isSupabaseConfigured) {
  console.warn("Supabase configuration missing or invalid. Application will operate in Mock mode.");
} else {
  console.log("Supabase infrastructure linked.");
}
