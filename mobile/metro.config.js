// Metro, Expo's bundler. Two additions to Expo's defaults:
// 1. The app reuses the pantry's model and sync code from ../prototypes (the same files the desktop app and
//    the Claude connection run), so Metro watches that folder too.
// 2. Those files import the Supabase client as "@/lib/supabase" (the web app's path alias). Here that
//    name points at the phone's own client, which keeps the session on the phone instead of in a browser.
// Packages for the shared files come from mobile/node_modules (they only import plain TypeScript and the client).
const path = require("path")
const { getDefaultConfig } = require("expo/metro-config")

const config = getDefaultConfig(__dirname)
const prototypes = path.resolve(__dirname, "../prototypes")
const phoneClient = path.resolve(__dirname, "src/data/supabase.ts")

config.watchFolders = [...(config.watchFolders ?? []), prototypes]
// The shared files live outside mobile/, so point them at mobile's packages too.
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")]

const resolve = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, name, platform) => {
  if (name === "@/lib/supabase") return { type: "sourceFile", filePath: phoneClient }
  return (resolve ?? context.resolveRequest)(context, name, platform)
}

module.exports = config
