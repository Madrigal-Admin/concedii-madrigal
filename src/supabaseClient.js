import { createClient } from '@supabase/supabase-js'

// Aceste două valori vin din Netlify (Site settings -> Environment variables)
// sau, în dezvoltare locală, din fișierul .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Lipsesc variabilele VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Vezi README.md.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
