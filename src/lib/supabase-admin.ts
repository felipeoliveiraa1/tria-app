import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Usar service role se disponível, senão usar anon key
const key = serviceRole || anonKey;

export const supabaseAdmin = createClient(url, key, { 
  auth: { 
    persistSession: false 
  } 
});

