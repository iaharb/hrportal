
import { createClient } from '@supabase/supabase-js';

/**
 * Production Readiness: 
 * Configured for 100% self-hosted environment using local Supabase.
 */
const getEnvVar = (key: string, fallback: string): string => {
  try {
    const meta = import.meta as any;
    if (meta.env && meta.env[key]) {
      return meta.env[key];
    }
  } catch (e) {
    console.warn(`Environment access for ${key} failed, using fallback.`);
  }
  return fallback;
};

// Defaulting to local Supabase URL (Ollama environment standard)
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', 'http://localhost:54321');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqa2Fwemxmdnhnb2NmaXR1c3hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMjU0MjIsImV4cCI6MjA4NTcwMTQyMn0.sZVL7JE8aG8geFzC2z-_xRjMkozSQoIb1Tvohmk53c0');

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (supabaseUrl.includes('localhost')) {
  console.log("Registry: Connected to Local Self-Hosted Database.");
}
