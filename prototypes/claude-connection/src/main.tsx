import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@/index.css"
import { followSystemTheme } from "../../shopping-list/src/system-theme"
import { Consent } from "./consent"

followSystemTheme()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Consent />
  </StrictMode>
)
