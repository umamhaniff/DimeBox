import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'your_supabase_anon_key_here') {
  console.warn(
    'Supabase credentials are not fully configured. Please set VITE_SUPABASE_ANON_KEY in your frontend/.env file.'
  )
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')
