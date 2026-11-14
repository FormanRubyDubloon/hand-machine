import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { KeyRoundIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useApp } from "../state"

/**
 * SIGNIN-01: passkey or an email link, no password, once per phone.
 * There's no real account here. The passkey button signs in straight away, and the email link
 * is simulated with a "Pretend I opened the link" button.
 */
export function SignIn() {
  const { actions } = useApp()
  const [email, setEmail] = React.useState("")
  const [sentTo, setSentTo] = React.useState<string | null>(null)

  const enter = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" as const } },
    exit: { opacity: 0, transition: { duration: 0.1 } },
  }

  return (
    <div className="flex h-dvh flex-col bg-background px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.75rem,env(safe-area-inset-bottom))]">
      <span className="text-xs font-semibold tracking-[0.2em] uppercase">Pantry</span>
      <AnimatePresence mode="wait" initial={false}>
        {sentTo ? (
          <motion.div key="sent" className="flex flex-1 flex-col" {...enter}>
            <div className="mt-[22dvh] flex flex-col gap-3">
              <h1 className="text-3xl leading-none font-semibold tracking-[0.04em] uppercase">Check your email</h1>
              <p className="text-sm leading-5 text-muted-foreground">
                We sent a sign-in link to <strong className="font-semibold text-foreground">{sentTo}</strong>. Open it on this phone.
              </p>
            </div>
            <div className="mt-auto flex flex-col gap-2.5">
              <Button size="lg" onClick={actions.signIn}>
                Pretend I opened the link
              </Button>
              <Button variant="outline" size="lg" className="border-primary" onClick={() => setSentTo(null)}>
                Use a different email
              </Button>
              <p className="px-2 text-center text-xs leading-4 text-muted-foreground">Prototype only: there's no real email.</p>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            className="flex flex-1 flex-col"
            {...enter}
            onSubmit={(e) => {
              e.preventDefault()
              if (email.includes("@")) setSentTo(email.trim())
            }}
          >
            <div className="mt-[22dvh] flex flex-col gap-3">
              <h1 className="text-3xl leading-none font-semibold tracking-[0.04em] uppercase">Sign in</h1>
              <p className="text-sm leading-5 text-muted-foreground">
                The same account as the pantry app. You only do this once on this phone.
              </p>
              <div className="mt-2 flex flex-col gap-1">
                <Label htmlFor="signin-email" className="text-[10px] tracking-widest text-muted-foreground">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email webauthn"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-auto flex flex-col gap-2.5">
              <Button type="button" size="lg" onClick={actions.signIn}>
                <KeyRoundIcon className="size-4" />
                Sign in with a passkey
              </Button>
              <Button type="submit" variant="outline" size="lg" className="border-primary" disabled={!email.includes("@")}>
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
