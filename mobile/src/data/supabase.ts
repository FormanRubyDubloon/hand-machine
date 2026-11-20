// The phone's Supabase client: the same project and public key as the web app, with the session kept on the
// phone (AsyncStorage) instead of in a browser. The shared pantry code imports this as "@/lib/supabase"
// (metro.config.js and tsconfig.json point that name here).
import "react-native-url-polyfill/auto"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { createClient } from "@supabase/supabase-js"
import { AppState, Platform } from "react-native"

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

/** Demo mode runs on made-up data and never touches Supabase. Set EXPO_PUBLIC_DEMO=1 (npm run demo). */
export const DEMO = process.env.EXPO_PUBLIC_DEMO === "1"
export const configured = !!url && !!key

if (!configured && !DEMO) console.warn("Supabase isn't configured: add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to mobile/.env.local.")

export const supabase = createClient(url ?? "http://localhost", key ?? "missing-key", {
  auth: {
    // On the web preview, the browser's own storage; on the phone, AsyncStorage.
    ...(Platform.OS === "web" ? {} : { storage: AsyncStorage }),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Refresh the session only while the app is open, as Supabase recommends for React Native.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (s) => {
    if (s === "active") supabase.auth.startAutoRefresh()
    else supabase.auth.stopAutoRefresh()
  })
}
