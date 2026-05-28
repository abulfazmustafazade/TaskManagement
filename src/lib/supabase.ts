import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types';

const SUPABASE_URL = 'https://hklmkpjccrmlqyypvkar.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ONb39yuLFABaaX0a_3Bg7A_ZKyjMB5p';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
