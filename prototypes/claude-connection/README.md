# Claude connection

The fourth part of the pantry system (see `../shopping-list/intent.md` and `../pantry-app/HANDOFF.md`): an MCP server that lets Claude (phone app, desktop, web) read and change the pantry, the shopping list and recipes.

## What's here

| Path | What it is |
| --- | --- |
| `src/server.ts` | The MCP endpoint: Streamable HTTP, stateless, JSON only. Checks the token, answers `initialize`, `tools/list`, `tools/call`. Serves the OAuth protected-resource metadata. |
| `src/tools.ts` | The 17 tools and the rules from the intent. Reads and adds run straight away; edits and deletes refuse without `confirmed: true`. Every change goes to History as `claude`, with an undo snapshot the pantry app can use. |
| `src/backend.ts` | Reads and writes Supabase as the signed-in user, so row-level security applies to Claude too. |
| `src/text.ts` | How items, recipes and list rows read to Claude. |
| `src/consent.tsx` | The page Supabase Auth sends you to when Claude connects: sign in, see what Claude can do, Allow or Cancel. Served at `/prototypes/claude-connection/`. |
| `edge/index.ts` | The Supabase Edge Function entry (Deno). |
| `build.mjs`, `build-options.mjs` | Bundles the server into `supabase/functions/mcp/index.js` (`pnpm build:mcp`). The bundle is generated: don't edit it. `test/bundle.test.ts` fails when it no longer matches the source, for example after a change to `model.ts`: rebuild, commit, and redeploy. |
| `test/` | Tool tests against an in-memory pantry: `pnpm exec vitest run --project claude-connection`. |

The stock, list and recipe rules are imported from `../pantry-app/src/model.ts`, and the row mapping from `../shared/src/rows.ts`, so the server and the apps can't drift apart.

## How sign-in works

Supabase Auth is the OAuth server. Claude is registered by hand as one OAuth app (dynamic registration is off, so nobody else can register an app with a convincing name). Claude finds the sign-in settings from the server's 401 response and sends you to the consent page on the Netlify site. Once you allow it, Claude gets a Supabase token for your account. Disconnect in the pantry app (Settings > Claude connection) revokes it.

## Deploying

1. Supabase dashboard > Authentication > OAuth Server: turn it on, set the authorization path to `/prototypes/claude-connection/`, leave dynamic client registration off. (`supabase/config.toml` says the same, but CLI 2.75 doesn't push these settings.)
2. Authentication > OAuth Apps: add an app called Claude, **public** (no secret), redirect URI `https://claude.ai/api/mcp/auth_callback`. Not confidential: Claude sends a secret in the form body (`client_secret_post`), and a confidential app in Supabase only accepts it in a header (`client_secret_basic`), so sign-in fails after Allow with "Authorization with Claude failed". The Supabase auth log says "client is registered for 'client_secret_basic' but 'client_secret_post' was used". If an app's auth method can be set to `client_secret_post`, a confidential app works too. A public app is still safe here: the redirect only goes to claude.ai, sign-in uses PKCE, and sign-ups are off.
3. `supabase config push` for the consent page's redirect URLs.
4. `pnpm build:mcp && supabase functions deploy mcp --use-api --no-verify-jwt`
5. The consent page goes live with the next Netlify deploy of `main`.
6. In Claude: Settings > Connectors > Add custom connector, address `https://bgwlqmpyjfqsvoqgpdtn.supabase.co/functions/v1/mcp`, and the client ID under Advanced settings (leave the secret empty).
