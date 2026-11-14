// The Supabase Auth session, shared by the pantry app and the phone app.
// `undefined` means still checking, `null` signed out.
import * as React from "react"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

/**
 * Where supabase-js keeps the session in localStorage. The phone has to open in a shop with no
 * signal, and supabase-js can't refresh an expired token offline, so getSession() can come back
 * empty even though you never signed out. A stored token means "still signed in": signing out clears it.
 */
const storedKey = `sb-${new URL(import.meta.env.VITE_SUPABASE_URL ?? "http://localhost").hostname.split(".")[0]}-auth-token`
function hasStoredSession() {
  try {
    return !!localStorage.getItem(storedKey)
  } catch {
    return false
  }
}

export function useAuthSession(): { signedIn: boolean | undefined; session: Session | null } {
  const [state, setState] = React.useState<{ session: Session | null; known: boolean }>({ session: null, known: false })
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState({ session: data.session, known: true }))
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setState({ session: next, known: true }))
    return () => data.subscription.unsubscribe()
  }, [])
  if (!state.known) return { signedIn: undefined, session: null }
  return { signedIn: !!state.session || hasStoredSession(), session: state.session }
}

/** Email and password, for the account made by hand in the dashboard. Returns an error message, or null. */
export async function signInWithPassword(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error ? (/invalid login/i.test(error.message) ? "That email and password don't match." : error.message) : null
}

/** Sends a sign-in link back to this page. Only existing users can sign in: sign-ups are off. */
export async function sendSignInLink(email: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${location.origin}${location.pathname}` },
  })
  return error ? (/signups not allowed|not found/i.test(error.message) ? "There's no account for that email." : error.message) : null
}

export const signOutOfSupabase = () => supabase.auth.signOut()
