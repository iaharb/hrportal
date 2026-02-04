import { createClient } from '@supabase/supabase-js';

// Safely access Vite environment variables
const getEnvVar = (key: string): string | undefined => {
  try {
    // @ts-ignore - Vite environment variables
    return import.meta.env[key];
  } catch (e) {
    return undefined;
  }
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || 'https://tjkapzlfvxgocfitusxb.supabase.co';
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqa2Fwemxmdnhnb2NmaXR1c3hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMjU0MjIsImV4cCI6MjA4NTcwMTQyMn0.sZVL7JE8aG8geFzC2z-_xRjMkozSQoIb1Tvohmk53c0';

if (!getEnvVar('VITE_SUPABASE_URL')) {
  console.warn("Supabase VITE_ variables not detected in import.meta.env. Falling back to default keys.");
}

export const isSupabaseConfigured = !!supabaseUrl && !supabaseUrl.includes('YOUR_SUPABASE_URL_HERE');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);