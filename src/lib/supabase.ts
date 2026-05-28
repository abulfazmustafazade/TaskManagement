import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'YOUR-ANON-KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
