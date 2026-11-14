// The Supabase client for the hand-machine "pantry" project (ref bgwlqmpyjfqsvoqgpdtn).
// The URL and public key come from .env.local, which git ignores. Only the publishable key goes
// there: it's safe in the browser, and row level security decides what it can read and write.
// The prototypes read the pantry items through it at startup (prototypes/shared/src/supabase-seed.ts).
// The pantry app signs in with Supabase Auth and syncs its changes back (prototypes/pantry-app/src/sync.ts).
import { createClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn("Supabase isn't configured: add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.")
}

// PKCE: the email link comes back as ?code=..., not a #access_token that the hash router would read as a route.
export const supabase = createClient(url ?? "http://localhost", key ?? "missing-key", { auth: { flowType: "pkce" } })
