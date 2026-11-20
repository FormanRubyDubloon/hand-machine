# Collca for iPhone

> This document was generated with AI.

The native phone app for Collca, built with Expo (React Native). It has three sections: **List**, **Recipes** and **Pantry**. It uses the same Supabase pantry and sign-in as Collca on the web and the Claude connection. It's built to the PROTO-1 handoff (canvas "PANTRY designs", page "Mobile app: simple") and `prototypes/shopping-list/intent.md`.

## Running it

From this folder:

```bash
npm install
```

Copy `.env.example` to `.env.local` and add the Supabase publishable key, the same one the web app's `.env.local` uses:

```bash
cp .env.example .env.local
```

Start it, then open it in **Expo Go** on your iPhone by scanning the QR code:

```bash
npm start
```

Try it without signing in or touching your pantry. Demo mode uses the PROTO-1 prototype's made-up data:

```bash
npm run demo
```

Checks:

```bash
npm run typecheck
```

```bash
npm test
```

Everything the app uses ships with Expo Go (SDK 58), so you don't need your own build to try it. The bundle id (and Android package) is `com.isaacforman.collca`, set in `app.json`. It can't change once the app is uploaded to App Store Connect.

## Building for TestFlight

Builds run on Expo's servers (EAS), set up in `eas.json`. You need an Expo account and a paid Apple Developer account. Run these from this folder.

**Once, before the first build.** Sign in, and link this folder to a new EAS project (it adds the project id to `app.json`; commit that):

```bash
npx eas-cli@latest login
```

```bash
npx eas-cli@latest init
```

`.env.local` isn't uploaded (git ignores it), so the build needs the Supabase address and publishable key as EAS environment variables, for the `production` and `preview` environments. Use the same values as `.env.local`, and never the service-role key:

```bash
npx eas-cli@latest env:set --name EXPO_PUBLIC_SUPABASE_URL --value https://bgwlqmpyjfqsvoqgpdtn.supabase.co --environment production --environment preview --visibility plaintext
```

```bash
npx eas-cli@latest env:set --name EXPO_PUBLIC_SUPABASE_ANON_KEY --environment production --environment preview --visibility sensitive
```

(The second one asks for the key.)

**Each build.** Build, then send it to App Store Connect, where it shows in TestFlight once Apple has processed it:

```bash
npx eas-cli@latest build --platform ios --profile production
```

```bash
npx eas-cli@latest submit --platform ios --latest
```

The first build asks to sign in to Apple and offers to create the App ID, certificate and provisioning profile; let it. The first submit creates the app in App Store Connect. EAS keeps the build number and adds one to it on every production build (`appVersionSource: remote`, `autoIncrement`); change `version` in `app.json` for a new release.

The `preview` profile builds for the iOS Simulator instead, to try a real build without TestFlight.

This folder uses **npm**, not pnpm, and has its own `package-lock.json`. Expo works best with npm, and keeping it apart means the web app's build and Netlify aren't affected.

## How it fits together

- **Shared code.** The app reuses the pantry's own model and sync code from `../prototypes`: `pantry-app/src/model.ts` (stock rules, recipes, the list), `pantry-app/src/sync.ts` (the three-way merges for categories, stores and recipes), `shared/src/rows.ts` and `shared/src/pantry-remote.ts` (rows in and out of Supabase). Metro watches that folder (`metro.config.js`). Those files import the Supabase client as `@/lib/supabase`; here that name points at `src/data/supabase.ts`, which keeps the session on the phone.
- **State** (`src/data/store.tsx`): everything is saved on the phone (AsyncStorage) after every change, so it works with no signal.
- **Sync** (`src/data/sync.ts`): there's no Sync button. The app syncs shortly after any change, when it comes back to the front, when signal returns, when Collca on the web or Claude changes something (a new History row, heard through Supabase Realtime), and every two minutes while open. Items merge field by field (`src/logic/merge.ts`). If the same field changed here and elsewhere, the phone keeps its value, doesn't send it, and asks which to keep.
- **History**: each change made on the phone goes to Collca's History, marked `phone`, with what the items were before, so it can be undone there the same day. Taps in a row on one thing (ticking eggs one at a time) are one entry.
- **The shop** (`src/logic/list.ts`): ticking adds stock straight away. The shop remembers what was on the list, so ticked rows stay on screen, struck through, until you tap **Start a new list** (or after 10 hours).
- **Screens** are in `src/app` (Expo Router). The rules behind them are pure functions in `src/logic` with tests in `test/`.

## Where it differs from the prototype or the handoff

- **Sync** happens by itself. The handoff's Sync sheet and Signal switch are gone. A one-line note under the tabs appears only when changes are waiting with no signal, or a sync failed. Settings shows when it last synced. Pull down on any list to sync now.
- **Shop done** says the pantry is up to date (or that it will be once there's signal), and offers **Start a new list**.
- **Fonts**: Figtree stands in for Stevie Sans, and Georgia for Dejanire, until the Adobe Fonts licence is checked for app embedding (handoff open question 10).
- **Counter** isn't a location: the database allows fridge, freezer, cupboard and household only.
- **New items**: something added on the phone that isn't in the pantry becomes a pantry item at once (minimum 0, marked New), so the desktop app and Claude see it. As in the rest of the system, the New mark clears once some is bought. That differs from the intent's "New until reviewed".
- **Aisle with no number**: items whose aisle has no number at the current store are listed last, under "No aisle number", never hidden.
- **Splash** shows only while the app loads (handoff open question 12).
