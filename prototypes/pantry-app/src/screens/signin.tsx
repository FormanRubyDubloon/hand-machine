// AUTH-01: email and password, or an email link. Real Supabase Auth: the link comes back to this page.
// Create account makes a new account with its own empty pantry. Supabase emails a link to confirm the
// address; opening it signs you in here, and Setup (screens/setup.tsx) runs once.
import * as React from "react"
import { MailIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createAccount, sendSignInLink, signInWithPassword } from "../../../shared/src/auth"
import { Field } from "../components"

const MIN_PASSWORD = 8

export function SignIn() {
  const [mode, setMode] = React.useState<"signin" | "create">("signin")
  const [email, setEmail] = React.useState("")
  const [sent, setSent] = React.useState<false | "link" | "confirm">(false)
  const [password, setPassword] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const valid = /.+@.+\..+/.test(email)

  const signIn = async () => {
    setBusy(true)
    setError(null)
    const failed = await signInWithPassword(email.trim(), password)
    setBusy(false)
    if (failed) setError(failed)
  }

  const send = async () => {
    setBusy(true)
    setError(null)
    const failed = await sendSignInLink(email.trim())
    setBusy(false)
    if (failed) setError(failed)
    else setSent("link")
  }

  const create = async () => {
    setBusy(true)
    setError(null)
    const result = await createAccount(email.trim(), password)
    setBusy(false)
    if ("error" in result) setError(result.error)
    // Without confirmation the account is signed in already, and the app moves on to Setup by itself.
    else if (result.confirm) setSent("confirm")
  }

  const switchTo = (next: "signin" | "create") => {
    setMode(next)
    setError(null)
    setPassword("")
  }

  return (
    <div className="grid min-h-dvh grid-cols-[1.1fr_1fr] bg-background">
      <div className="flex flex-col justify-between bg-primary p-12 text-primary-foreground">
        <span className="text-base font-semibold tracking-[0.12em] uppercase">Pantry</span>
        <div className="flex max-w-lg flex-col gap-4">
          <h1 className="text-[40px] leading-[1.05] font-semibold tracking-[0.02em] uppercase">What you have, what to cook, what to buy</h1>
          <p className="text-primary-foreground/70">
            Your pantry, recipes and shopping list in one place, kept in step with the shopping app, the kitchen app and Claude.
          </p>
        </div>
        <span className="text-xs tracking-widest text-primary-foreground/70 uppercase">Private to you</span>
      </div>
      <div className="flex items-center justify-center p-12">
        <div className="flex w-full max-w-sm flex-col gap-8">
          {sent ? (
            <>
              <div className="flex flex-col gap-2">
                <MailIcon className="size-6" />
                <h2 className="text-[22px] font-semibold tracking-[0.04em] uppercase">Check your email</h2>
                <p className="text-sm text-muted-foreground">
                  {sent === "confirm"
                    ? `We sent a link to ${email} to confirm it's yours. Open it in this browser and your account is ready. It can take a minute to arrive; check spam if it doesn't.`
                    : `We sent a sign-in link to ${email}. Open it in this browser to sign in.`}
                </p>
              </div>
              <Button variant="link" className="self-start p-0 text-xs" onClick={() => setSent(false)}>Use a different email</Button>
            </>
          ) : mode === "create" ? (
            <>
              <div className="flex flex-col gap-2">
                <h2 className="text-[22px] font-semibold tracking-[0.04em] uppercase">Create account</h2>
                <p className="text-sm text-muted-foreground">Your own pantry, recipes and shopping list, private to you.</p>
              </div>
              <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (valid && password.length >= MIN_PASSWORD && !busy) void create() }}>
                <Field label="Email">
                  <Input type="email" autoComplete="email" value={email} placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} />
                </Field>
                <Field label="Password" hint={`At least ${MIN_PASSWORD} characters.`}>
                  <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </Field>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                <Button type="submit" size="lg" disabled={!valid || password.length < MIN_PASSWORD || busy}>{busy ? "Creating account" : "Create account"}</Button>
              </form>
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <button type="button" className="font-semibold text-foreground underline underline-offset-4" onClick={() => switchTo("signin")}>Sign in</button>
              </p>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <h2 className="text-[22px] font-semibold tracking-[0.04em] uppercase">Sign in</h2>
                <p className="text-sm text-muted-foreground">One account for the pantry, kitchen and shopping apps.</p>
              </div>
              <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (valid && password && !busy) void signIn() }}>
                <Field label="Email">
                  <Input type="email" autoComplete="email" value={email} placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} />
                </Field>
                <Field label="Password">
                  <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </Field>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                <Button type="submit" size="lg" disabled={!valid || !password || busy}>{busy ? "Signing in" : "Sign in"}</Button>
              </form>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" />
              </div>
              <Button variant="outline" size="lg" className="border-primary" disabled={!valid || busy} onClick={() => void send()}>
                <MailIcon />
                Email me a sign-in link
              </Button>
              <p className="text-xs text-muted-foreground">You stay signed in on this computer until you sign out.</p>
              <p className="border-t border-border pt-6 text-sm text-muted-foreground">
                New here?{" "}
                <button type="button" className="font-semibold text-foreground underline underline-offset-4" onClick={() => switchTo("create")}>Create an account</button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
