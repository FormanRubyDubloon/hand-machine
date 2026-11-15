// The page Supabase Auth sends you to when Claude asks to connect (its OAuth server's
// authorization_url_path, in supabase/config.toml). You sign in if you aren't already, see what
// Claude will be able to do, and allow or cancel. Supabase then hands Claude a token for your
// account, and the MCP server (server.ts) acts as you with it.
//
// It often opens inside the Claude phone app, so it's laid out for a phone first. An email link
// opens in the phone's default browser, not back here, so password is the first option.
import * as React from "react"
import { CheckIcon, MailIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { sendSignInLink, signInWithPassword, useAuthSession } from "../../shared/src/auth"
import { Field } from "../../pantry-app/src/components"

type Details = { client: { name: string; uri?: string }; user: { email: string }; scope: string }
type State =
  | { kind: "loading" }
  | { kind: "ask"; details: Details }
  | { kind: "leaving"; message: string }
  | { kind: "error"; message: string }

const authorizationId = new URLSearchParams(location.search).get("authorization_id")

const CAN = [
  ["Read", "Pantry stock, the shopping list and your saved recipes, and search them"],
  ["Add", "Items, stock, shopping list entries and recipes"],
  ["Take off stock", "When you tell it what you've used"],
]
const ASKS = [
  ["Edit", "Change an item, a minimum, a recipe or a list entry"],
  ["Delete", "Remove anything"],
]

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh justify-center bg-background px-4 py-10 text-foreground sm:items-center">
      <div className="flex w-full max-w-md flex-col gap-8">
        <span className="text-base font-semibold tracking-[0.12em] uppercase">Pantry</span>
        {children}
      </div>
    </div>
  )
}

function Rules({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <section className="flex flex-col">
      <span className="pb-1 text-[10px] font-semibold tracking-[0.1em] uppercase">{title}</span>
      {rows.map(([name, sub]) => (
        <div key={name} className="flex flex-col border-b border-border py-2.5">
          <span className="text-sm font-semibold">{name}</span>
          <span className="text-xs text-muted-foreground">{sub}</span>
        </div>
      ))}
    </section>
  )
}

function SignIn() {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [sent, setSent] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const valid = /.+@.+\..+/.test(email)
  const run = async (fn: () => Promise<string | null>, after?: () => void) => {
    setBusy(true)
    setError(null)
    const failed = await fn()
    setBusy(false)
    if (failed) setError(failed)
    else after?.()
  }
  if (sent) {
    return (
      <div className="flex flex-col gap-2">
        <MailIcon className="size-6" />
        <h2 className="text-[22px] font-semibold tracking-[0.04em] uppercase">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          We sent a sign-in link to {email}. Open it in this same browser to carry on connecting Claude. On a phone it may open somewhere else;
          if it does, come back here and use your password.
        </p>
        <Button variant="link" className="self-start p-0 text-xs" onClick={() => setSent(false)}>Use your password instead</Button>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-[22px] font-semibold tracking-[0.04em] uppercase">Connect Claude</h1>
        <p className="text-sm text-muted-foreground">Sign in with your pantry account to let Claude use your pantry.</p>
      </div>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (valid && password && !busy) void run(() => signInWithPassword(email.trim(), password)) }}>
        <Field label="Email">
          <Input type="email" autoComplete="email" value={email} placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" disabled={!valid || !password || busy}>{busy ? "Signing in" : "Sign in"}</Button>
      </form>
      <Button variant="link" className="self-start p-0 text-xs" disabled={!valid || busy} onClick={() => void run(() => sendSignInLink(email.trim()), () => setSent(true))}>
        Email me a sign-in link instead
      </Button>
    </div>
  )
}

export function Consent() {
  const { signedIn, session } = useAuthSession()
  const [state, setState] = React.useState<State>(
    authorizationId
      ? { kind: "loading" }
      : { kind: "error", message: "This page opens when you add the pantry as a connector in Claude. Start from Claude's Connectors settings." },
  )
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!authorizationId || !session) return
    let gone = false
    supabase.auth.oauth.getAuthorizationDetails(authorizationId).then(({ data, error }) => {
      if (gone) return
      if (error || !data) setState({ kind: "error", message: error?.message ?? "Couldn't read the request from Claude. Try connecting again from Claude." })
      // Already allowed before: Supabase says where to go straight away.
      else if ("redirect_url" in data) {
        setState({ kind: "leaving", message: "Already connected. Taking you back to Claude." })
        location.assign(data.redirect_url)
      } else setState({ kind: "ask", details: data as Details })
    })
    return () => { gone = true }
  }, [session])

  const decide = async (allow: boolean) => {
    if (!authorizationId) return
    setBusy(true)
    const fn = allow ? supabase.auth.oauth.approveAuthorization : supabase.auth.oauth.denyAuthorization
    const { data, error } = await fn.call(supabase.auth.oauth, authorizationId, { skipBrowserRedirect: true })
    if (error || !data) {
      setBusy(false)
      setState({ kind: "error", message: error?.message ?? "Something went wrong. Try connecting again from Claude." })
      return
    }
    setState({ kind: "leaving", message: allow ? "Connected. Taking you back to Claude." : "Cancelled. Taking you back to Claude." })
    location.assign(data.redirect_url)
  }

  if (state.kind === "error") {
    return (
      <Shell>
        <h1 className="text-[22px] font-semibold tracking-[0.04em] uppercase">Can't connect</h1>
        <p className="text-sm text-muted-foreground">{state.message}</p>
      </Shell>
    )
  }
  if (signedIn === false || (signedIn && !session)) return <Shell><SignIn /></Shell>
  if (state.kind === "leaving") {
    return (
      <Shell>
        <p className="flex items-center gap-2 text-sm"><CheckIcon className="size-4" />{state.message}</p>
      </Shell>
    )
  }
  if (state.kind === "loading") return <Shell><p className="text-sm text-muted-foreground">Checking the request from Claude…</p></Shell>

  const { details } = state
  return (
    <Shell>
      <div className="flex flex-col gap-2">
        <h1 className="text-[22px] font-semibold tracking-[0.04em] uppercase">Connect {details.client.name || "Claude"}</h1>
        <p className="text-sm text-muted-foreground">
          {details.client.name || "Claude"} is asking to use the pantry for {details.user.email}. It works from the Claude phone app, desktop and web.
        </p>
      </div>
      <Rules title="Claude can, without asking" rows={CAN} />
      <Rules title="Claude asks you first, in the chat" rows={ASKS} />
      <p className="text-xs text-muted-foreground">Every change shows in the pantry app's History, marked Claude, and can be undone there the same day. You can disconnect in the pantry app's Settings.</p>
      <div className="flex flex-col gap-3">
        <Button size="lg" disabled={busy} onClick={() => void decide(true)}>Allow</Button>
        <Button size="lg" variant="outline" disabled={busy} onClick={() => void decide(false)}>Cancel</Button>
        <Button variant="link" className="self-start p-0 text-xs" disabled={busy} onClick={() => void supabase.auth.signOut()}>Not {details.user.email}? Sign out</Button>
      </div>
    </Shell>
  )
}
