// Opening the app lands on the list, or on Sign in when signed out.
import { Redirect } from "expo-router"
import { useStore } from "../data/store"

export default function Index() {
  const { state } = useStore()
  return <Redirect href={state.owner ? "/list" : "/sign-in"} />
}
