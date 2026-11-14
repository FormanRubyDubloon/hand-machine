// The Supabase client for the hand-machine "pantry" project (ref bgwlqmpyjfqsvoqgpdtn).
// The URL and public key come from .env.local, which git ignores. Only the publishable key goes
// there: it's safe in the browser, and row level security decides what it can read and write.
// The prototypes still use localStorage; nothing imports this yet.
import { createClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn("Supabase isn't configured: add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.")
}

export const supabase = createClient(url ?? "http://localhost", key ?? "missing-key")
