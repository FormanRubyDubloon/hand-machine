// A stand-in for the pantry the shopping app syncs with. It lives in localStorage under its own key.
// Changes made in the pantry app or by Claude show up here. Swap this file for real API calls
// (through a small server) in the next pass.
import { seedRemote, type Items } from "./model"

const KEY = "hm-shopping-list:pantry:v2"

export function readRemote(): Items {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* fall through to seed */
  }
  const seeded = seedRemote()
  writeRemote(seeded)
  return seeded
}

export function writeRemote(items: Items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    /* storage full or blocked: ignore in the mock */
  }
}

export function resetRemote() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
