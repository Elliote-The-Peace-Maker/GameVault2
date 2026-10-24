export const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL?.trim() || '';
export const SUPABASE_KEY = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || '';
export const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_KEY);
