import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@/index.css"
import { App } from "./app"
import { followSystemTheme } from "../../shopping-list/src/system-theme"

followSystemTheme()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
