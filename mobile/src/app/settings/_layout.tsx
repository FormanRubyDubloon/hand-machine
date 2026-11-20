import { Stack } from "expo-router"
import { useColours } from "../../ui/theme"

export default function Layout() {
  const c = useColours()
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />
}
