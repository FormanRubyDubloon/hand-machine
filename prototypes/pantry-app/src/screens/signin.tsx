// AUTH-01: email link or passkey, no password. Faked: Continue "sends" a link you open from here.
import * as React from "react"
import { KeyRoundIcon, MailIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { usePantry } from "../state"
import { Eyebrow, Field } from "../components"

export function SignIn() {
  const { actions, db } = usePantry()
  const [email, setEmail] = React.useState("")
  const [sent, setSent] = React.useState(false)
  const valid = /.+@.+\..+/.test(email)
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
                <p className="text-sm text-muted-foreground">We sent a sign-in link to {email}. Open it on this computer to sign in.</p>
              </div>
              <div className="flex flex-col gap-2 border border-dashed border-ring p-4">
                <Eyebrow>Prototype</Eyebrow>
                <span className="text-sm">There's no email. Pretend you opened the link.</span>
                <Button className="mt-2" onClick={() => actions.signIn(email)}>Open the link</Button>
              </div>
              <Button variant="link" className="self-start p-0 text-xs" onClick={() => setSent(false)}>Use a different email</Button>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <h2 className="text-[22px] font-semibold tracking-[0.04em] uppercase">Sign in</h2>
                <p className="text-sm text-muted-foreground">One account for the pantry, kitchen and shopping apps.</p>
              </div>
              <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (valid) setSent(true) }}>
                <Field label="Email">
                  <Input type="email" autoComplete="email" value={email} placeholder={db.email} onChange={(e) => setEmail(e.target.value)} />
                </Field>
                <Button type="submit" size="lg" disabled={!valid}>Continue</Button>
              </form>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" />
              </div>
              <Button variant="outline" size="lg" className="border-primary" onClick={() => actions.signIn()}>
                <KeyRoundIcon />
                Sign in with a passkey
              </Button>
              <p className="text-xs text-muted-foreground">Continue sends a sign-in link to your email. You stay signed in on this computer until you sign out.</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
