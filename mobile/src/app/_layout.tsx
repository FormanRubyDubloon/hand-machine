// The root: fonts, the app's state, the splash, and the screens. Signed out, only Sign in shows.
// Sheets and full-screen views (item sheet, aisle menu, cooking, settings) sit above the tabs.
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, useFonts } from "@expo-google-fonts/figtree"
import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import * as React from "react"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { StoreProvider, useStore } from "../data/store"
import { ConflictDialog } from "../ui/conflict"
import { ToastView } from "../ui/toast"
import { useColours } from "../ui/theme"

void SplashScreen.preventAutoHideAsync()
SplashScreen.setOptions({ fade: true, duration: 350 })

export default function Root() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StoreProvider>
          <App />
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

function App() {
  const { ready, state } = useStore()
  const c = useColours()
  const [fonts] = useFonts({ Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold })
  const loaded = ready && fonts

  // The splash shows only as long as loading takes (handoff open question 12).
  React.useEffect(() => {
    if (loaded) SplashScreen.hide()
  }, [loaded])
  if (!loaded) return null

  const signedIn = !!state.owner
  const sheet = { presentation: "modal" as const, contentStyle: { backgroundColor: c.bg } }
  const full = { presentation: "fullScreenModal" as const, animation: "slide_from_bottom" as const }
  return (
    <>
      <StatusBar style={c.isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="list-item/[id]" options={{ ...full, contentStyle: { backgroundColor: "#3D2B1F" } }} />
          <Stack.Screen name="aisles" options={full} />
          <Stack.Screen name="search" options={full} />
          <Stack.Screen name="add" options={sheet} />
          <Stack.Screen name="aisle" options={sheet} />
          <Stack.Screen name="filters" options={sheet} />
          <Stack.Screen name="skipped" options={sheet} />
          <Stack.Screen name="stores" options={sheet} />
          <Stack.Screen name="cooking/[id]" options={{ ...full, contentStyle: { backgroundColor: "#3D2B1F" } }} />
          <Stack.Screen name="cooked/[id]" options={sheet} />
          <Stack.Screen name="settings" options={full} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
      </Stack>
      {signedIn && <ConflictDialog />}
      <ToastView />
    </>
  )
}
