import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types';

const SUPABASE_URL = (import.meta as any).env?.'https://kmsydkynixmgozxoszie.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env?.'sb_publishable_r0f2nkUiwyHiST6Xpoiu2A_Ek3_duAC';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
