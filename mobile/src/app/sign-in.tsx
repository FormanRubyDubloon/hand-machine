// Sign in: email and password, the same account as Collca on the web. Sign-up isn't designed yet (handoff
// open question 5), so new accounts are made on the web.
import { StatusBar } from "expo-status-bar"
import * as React from "react"
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { DEMO } from "../data/supabase"
import { useStore } from "../data/store"
import { SignInEmblem } from "../ui/art"
import { Body, Button, Caption, Field } from "../ui/kit"
import { font, light, SPLASH } from "../ui/theme"

// The sign-in screen sits on the emblem's tan in both themes, so its text and button use the dark ink, and the
// fields stay cream so they read as places to type.
const INK = light.ink
const onTan = { style: { backgroundColor: light.bg, color: light.ink, borderColor: INK }, placeholderTextColor: light.placeholder, labelColour: INK }

export default function SignIn() {
  const { signIn } = useStore()
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
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: SPLASH }}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 20, paddingBottom: 40, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", paddingTop: 8, paddingBottom: 8 }}>
          <SignInEmblem width={240} />
        </View>
        <Text accessibilityRole="header" style={{ fontFamily: font.serif, fontWeight: "700", fontSize: 32, letterSpacing: 1.2, textTransform: "uppercase", color: INK }}>Sign in</Text>
        <Body colour={INK}>Your list, pantry and recipes, on this phone.</Body>
        <Field {...onTan} label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
        <Field {...onTan} label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={() => email && password && void go()} />
        {error && <Text accessibilityRole="alert" style={{ fontFamily: font.semibold, fontSize: 15, color: light.danger }}>{error}</Text>}
        <Button style={{ backgroundColor: INK, borderColor: INK }} label={busy ? "Signing in…" : "Sign in"} disabled={!email.trim() || !password || busy} onPress={() => void go()} />
        <Caption colour={INK}>{DEMO ? "This is the demo. Any email and password will do, and nothing reaches your real pantry." : "No account yet? Make one in Collca on the web, then sign in here."}</Caption>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
