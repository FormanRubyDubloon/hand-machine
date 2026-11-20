// Sign in: email and password, the same account as Collca on the web. Sign-up isn't designed yet (handoff
// open question 5), so new accounts are made on the web.
import { Image } from "expo-image"
import * as React from "react"
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { DEMO } from "../data/supabase"
import { useStore } from "../data/store"
import { Body, Button, Caption, Field } from "../ui/kit"
import { font, SPLASH, useColours } from "../ui/theme"

export default function SignIn() {
  const { signIn } = useStore()
  const c = useColours()
  const insets = useSafeAreaInsets()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const go = async () => {
    setBusy(true)
    setError(await signIn(email, password))
    setBusy(false)
  }
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 20, paddingBottom: 40, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ backgroundColor: SPLASH, borderRadius: 8, overflow: "hidden", alignItems: "center", paddingVertical: 12 }}>
          <Image source={require("../../assets/splash.png")} style={{ width: 200, height: 224 }} contentFit="contain" accessibilityLabel="Collca: what you have, what to cook, what to buy" />
        </View>
        <Text accessibilityRole="header" style={{ fontFamily: font.serif, fontWeight: "700", fontSize: 32, letterSpacing: 1.2, textTransform: "uppercase", color: c.ink }}>Sign in</Text>
        <Body colour={c.muted}>Your list, pantry and recipes, on this phone.</Body>
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={() => email && password && void go()} />
        {error && <Text accessibilityRole="alert" style={{ fontFamily: font.medium, fontSize: 15, color: c.danger }}>{error}</Text>}
        <Button label={busy ? "Signing in…" : "Sign in"} disabled={!email.trim() || !password || busy} onPress={() => void go()} />
        <Caption>{DEMO ? "This is the demo. Any email and password will do, and nothing reaches your real pantry." : "No account yet? Make one in Collca on the web, then sign in here."}</Caption>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
