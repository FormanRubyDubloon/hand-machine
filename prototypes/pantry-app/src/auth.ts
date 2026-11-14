// The Supabase Auth session for the pantry app. `undefined` means still checking, `null` signed out.
import * as React from "react"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

export function useAuthSession(): Session | null | undefined {
  const [session, setSession] = React.useState<Session | null | undefined>(undefined)
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])
  return session
}

/** Email and password, for the account made by hand in the dashboard. Returns an error message, or null. */
export async function signInWithPassword(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error ? error.message : null
}

/** Sends a sign-in link back to this page. Only existing users can sign in: sign-ups are off. */
export async function sendSignInLink(email: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${location.origin}${location.pathname}` },
  })
  return error ? error.message : null
}

export const signOutOfSupabase = () => supabase.auth.signOut()
