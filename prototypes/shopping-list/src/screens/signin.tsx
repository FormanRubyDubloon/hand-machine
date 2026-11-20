import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { sendSignInLink, signInWithPassword } from "../../../shared/src/auth"

/**
 * SIGNIN-01: Supabase Auth, email and password or an email link, once per phone.
 * Same account as the pantry app. There's no sign-up: the account is made by hand in the Supabase
 * dashboard. The session stays on the phone, so the list still opens with no signal.
 */
export function SignIn() {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [sentTo, setSentTo] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const validEmail = /.+@.+\..+/.test(email)

  const enter = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" as const } },
    exit: { opacity: 0, transition: { duration: 0.1 } },
  }

  const run = async (task: () => Promise<string | null>, onDone?: () => void) => {
    setBusy(true)
    setError(null)
    const failed = await task()
    setBusy(false)
    if (failed) setError(failed)
    else onDone?.()
  }

  return (
    <div className="flex h-dvh flex-col bg-background px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.75rem,env(safe-area-inset-bottom))]">
      <span className="text-xs font-semibold tracking-[0.2em] uppercase">Collca</span>
      <AnimatePresence mode="wait" initial={false}>
        {sentTo ? (
          <motion.div key="sent" className="flex flex-1 flex-col" {...enter}>
            <div className="mt-[22dvh] flex flex-col gap-3">
              <h1 className="text-3xl leading-none font-semibold tracking-[0.04em] uppercase">Check your email</h1>
              <p className="text-sm leading-5 text-muted-foreground">
                We sent a sign-in link to <strong className="font-semibold text-foreground">{sentTo}</strong>. Open it on this phone, in this browser.
              </p>
            </div>
            <div className="mt-auto flex flex-col gap-2.5">
              <Button variant="outline" size="lg" className="border-primary" onClick={() => setSentTo(null)}>
                Use a different email
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            className="flex flex-1 flex-col"
            {...enter}
            onSubmit={(e) => {
              e.preventDefault()
              if (validEmail && password && !busy) void run(() => signInWithPassword(email.trim(), password))
            }}
          >
            <div className="mt-[22dvh] flex flex-col gap-3">
              <h1 className="text-3xl leading-none font-semibold tracking-[0.04em] uppercase">Sign in</h1>
              <p className="text-sm leading-5 text-muted-foreground">
                The same account as the pantry app. You only do this once on this phone.
              </p>
              <div className="mt-2 flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="signin-email" className="text-[10px] tracking-widest text-muted-foreground">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="signin-password" className="text-[10px] tracking-widest text-muted-foreground">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              </div>
            </div>
            <div className="mt-auto flex flex-col gap-2.5">
              <Button type="submit" size="lg" disabled={!validEmail || !password || busy}>
                {busy ? "Signing in" : "Sign in"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="border-primary"
                disabled={!validEmail || busy}
                onClick={() => void run(() => sendSignInLink(email.trim()), () => setSentTo(email.trim()))}
              >
                Email me a sign-in link
              </Button>
              <p className="px-2 text-center text-xs leading-4 text-muted-foreground">
                You stay signed in, so the list still opens in a shop with no signal.
              </p>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
