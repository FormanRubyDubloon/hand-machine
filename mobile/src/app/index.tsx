// Opening the app lands on Home (Batch 5, 24 Nov 2026), or on Sign in when signed out.
import { Redirect } from "expo-router"
import { useStore } from "../data/store"

export default function Index() {
  const { state } = useStore()
  return <Redirect href={state.owner ? "/home" : "/sign-in"} />
}
