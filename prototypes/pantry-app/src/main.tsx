import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@/index.css"
import { App } from "./app"
import { loadSeedFromSupabase } from "../../shared/src/supabase-seed"
import { followSystemTheme } from "../../shopping-list/src/system-theme"

followSystemTheme()

// The pantry comes from Supabase, so load it before the app builds its first state.
loadSeedFromSupabase().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
})
