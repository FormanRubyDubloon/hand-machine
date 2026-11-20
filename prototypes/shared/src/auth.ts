// The Supabase Auth session, shared by the pantry app and the phone app.
// `undefined` means still checking, `null` signed out.
import * as React from "react"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { DB_KEY, ITEMS_KEY, PHONE_KEY } from "./pantry"

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

/** Which account the pantry kept in this browser belongs to. Both apps share the one local copy. */
const OWNER_KEY = "hm-pantry:owner"
const LOCAL_KEYS = [ITEMS_KEY, DB_KEY, PHONE_KEY]

/**
 * Each account has its own pantry, but both apps keep a copy in this browser's localStorage. When a
 * different account signs in, that copy is someone else's: clear it and reload, so the apps start from
 * this account's pantry and the next sync can't push the last account's items into it. Returns true when
 * it's reloading. The first account to sign in once this existed keeps what's there (until then there was
 * only one account).
 */
export function claimLocalPantry(userId: string): boolean {
  try {
    const previous = localStorage.getItem(OWNER_KEY)
    if (previous === userId) return false
    localStorage.setItem(OWNER_KEY, userId)
    if (previous === null) return false
    for (const key of LOCAL_KEYS) localStorage.removeItem(key)
  } catch {
    return false
  }
  location.reload()
  return true
}

/** Whether any account has signed in on this browser before. The sign-in screen opens on Sign in if so. */
export function signedInHereBefore(): boolean {
  try {
    return localStorage.getItem(OWNER_KEY) !== null
  } catch {
    return false
  }
}

export function useAuthSession(): { signedIn: boolean | undefined; session: Session | null } {
  const [state, setState] = React.useState<{ session: Session | null; known: boolean }>({ session: null, known: false })
  React.useEffect(() => {
    const seen = (session: Session | null) => {
      if (session && claimLocalPantry(session.user.id)) return
      setState({ session, known: true })
    }
    supabase.auth.getSession().then(({ data }) => seen(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, next) => seen(next))
    return () => data.subscription.unsubscribe()
  }, [])
  if (!state.known) return { signedIn: undefined, session: null }
  return { signedIn: !!state.session || hasStoredSession(), session: state.session }
}

/** Email and password. Returns an error message, or null. */
export async function signInWithPassword(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error ? (/invalid login/i.test(error.message) ? "That email and password don't match." : error.message) : null
}

/** Sends a sign-in link back to this page. Only signs in an existing account: it never makes one. */
export async function sendSignInLink(email: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${location.origin}${location.pathname}` },
  })
  return error ? (/signups not allowed|not found/i.test(error.message) ? "There's no account for that email." : error.message) : null
}

/**
 * Makes an account. Supabase emails a link to confirm the address and the account works once it's opened,
 * so this normally comes back with `confirm: true`. If the project doesn't ask for confirmation, the new
 * account is signed in straight away. An email that already has an account looks the same as a new one
 * (Supabase doesn't say, so nobody can find out who has an account here).
 */
export async function createAccount(email: string, password: string): Promise<{ error: string } | { confirm: boolean }> {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${location.origin}${location.pathname}` } })
  if (error) {
    if (/signups? not allowed|disabled/i.test(error.message)) return { error: "New accounts aren't open yet." }
    if (/password/i.test(error.message)) return { error: error.message.replace(/^Password should/, "The password should") }
    return { error: error.message }
  }
  return { confirm: !data.session }
}

/** Whether this account has been through the first-run setup (stores, then how to start the pantry). */
export const setupDone = (session: Session | null) => !!session?.user.user_metadata?.setup_done
/** Marks the first-run setup done, on the account, so it isn't shown again on any computer. */
export async function markSetupDone(): Promise<void> {
  await supabase.auth.updateUser({ data: { setup_done: true } })
}

/**
 * Signs out this browser only. Supabase's default signs out every session the account has, which would
 * also cut off the Claude connection and the phone.
 */
export const signOutOfSupabase = () => supabase.auth.signOut({ scope: "local" })
