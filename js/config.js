/**
 * ============================================================================
 * ONLINE TEST / EXAM PLATFORM - CONFIGURATION & SUPABASE CLIENT INITIALIZATION
 * ============================================================================
 */

export const CONFIG = {
  SUPABASE_URL: 'https://oxzafpicjvlelajyyrhs.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_mE5hpBuSMOTzvgkEPaNzYg_UytihuPO',
  APP_NAME: 'ApexExam Pro',
  DEFAULT_PASSING_PERCENTAGE: 40.0,
  DEFAULT_DURATION_MINUTES: 30,
  AUTOSAVE_INTERVAL_MS: 3000, // 3 seconds autosave
  WARNING_TIME_SECONDS: 300,  // 5 minutes remaining warning
  DANGER_TIME_SECONDS: 60,   // 1 minute remaining warning
};

// Initialize Supabase Client using the globally loaded CDN script
let _supabase = null;

export function getSupabase() {
  if (!_supabase) {
    if (typeof window.supabase === 'undefined') {
      console.error('Supabase library is not loaded in window scope.');
      return null;
    }
    _supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return _supabase;
}
