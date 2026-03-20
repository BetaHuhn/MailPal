# MailPal — Copilot Coding Agent Instructions

## Project Overview

MailPal is a **self-hosted email alias forwarding dashboard** built entirely on Cloudflare's free tier (Pages + Workers + KV). It lets users create and manage email aliases (e.g. `swift-meadow-412@yourdomain.com`) that forward to a real inbox, with per-alias enable/disable controls, wildcard mode, stats tracking, multi-domain support, and optional password protection.

There are two deployable units that share a single KV namespace:
- **SvelteKit app** (`/`) — management UI + REST API, deployed to Cloudflare Pages
- **Email worker** (`email-worker/`) — intercepts incoming mail via Cloudflare Email Routing and forwards or rejects based on KV state, deployed as a Cloudflare Worker

---

## Technology Stack

| Layer | Technology |
|---|---|
| UI framework | Svelte 5 + SvelteKit 2 |
| Styling | Tailwind CSS 3 (custom dark theme) + PostCSS + Autoprefixer |
| UI components | bits-ui 2 (headless Svelte components) |
| Build tool | Vite 5 |
| Type safety | TypeScript 5 (strict mode) |
| Deployment target | Cloudflare Pages (frontend) + Cloudflare Workers (email worker) |
| Storage | Cloudflare KV |
| Infra CLI | Wrangler 4 |
| CF types | @cloudflare/workers-types 4 |

There is **no traditional database, no persistent Node.js server in production, and no test framework** — the production runtime runs entirely on Cloudflare's edge (Node.js is used only for local development and build tooling).

---

## Repository Structure

```
MailPal/
├── src/                         # SvelteKit application
│   ├── app.css                  # Global CSS (Tailwind base)
│   ├── app.d.ts                 # Global TS types (KV binding on platform.env)
│   ├── app.html                 # HTML template
│   ├── hooks.server.ts          # Auth middleware — runs before every request
│   ├── lib/
│   │   ├── auth.ts              # HMAC session cookie sign/verify helpers
│   │   ├── kv.ts                # KV namespace read/write helpers
│   │   ├── sluggen.ts           # Random alias slug generator (adjective-noun-number)
│   │   ├── types.ts             # Shared TypeScript interfaces (DomainConfig, AliasConfig, etc.)
│   │   └── components/          # 11 Svelte UI components (dialogs, forms, sidebar, etc.)
│   └── routes/
│       ├── +layout.server.ts    # Layout server (passes auth state to all pages)
│       ├── +layout.svelte       # App shell
│       ├── +page.server.ts      # Home: loads domains, aliases, destinations from KV
│       ├── +page.svelte         # Main dashboard UI (~1700 lines)
│       ├── login/               # Login form + action
│       ├── logout/              # Logout endpoint (clears cookie)
│       ├── domains/[domain]/    # Domain sub-page (redirects to home with domain selected)
│       └── api/                 # REST API endpoints (see API section below)
├── email-worker/
│   ├── src/index.ts             # Cloudflare Email Worker (email forwarding logic)
│   ├── package.json
│   ├── tsconfig.json
│   └── wrangler.toml            # Wrangler config for the email worker
├── package.json                 # Main project scripts and dependencies
├── svelte.config.js             # SvelteKit config (adapter-cloudflare)
├── vite.config.ts               # Vite config (sveltekit plugin)
├── tailwind.config.ts           # Tailwind theme (custom `app.*` color tokens)
├── tsconfig.json                # TS config (extends .svelte-kit/tsconfig.json)
├── wrangler.toml                # Wrangler config for Cloudflare Pages
└── postcss.config.js
```

---

## Build, Lint, and Dev Commands

### Main project (SvelteKit app)

```bash
npm install                  # Install dependencies
npm run dev                  # Start Vite dev server at http://localhost:5173
npm run build                # Build for Cloudflare Pages (.svelte-kit/cloudflare/)
npm run check                # svelte-check — type-check all Svelte + TS files (primary linter)
npm run check:watch          # Same, in watch mode
npm run deploy:frontend      # build + wrangler pages deploy
npm run deploy               # deploy:frontend + deploy:worker
```

### Email worker

```bash
cd email-worker
npm install
npm run dev                  # wrangler dev (local email worker simulation)
npm run deploy               # wrangler deploy (deploy to Cloudflare)
```

### No test suite

There are **no automated tests** in this repository (no Vitest, Jest, etc.). Validation is done via:
- `npm run check` — svelte-check (type errors + Svelte-specific warnings)
- `npm run build` — catches TypeScript compilation errors
- Manual testing against a real or local Cloudflare environment

When making changes, always run `npm run check` before committing. The build step is also a reliable gate.

---

## Key Source Files and Patterns

### Data types (`src/lib/types.ts`)

```typescript
interface DomainConfig {
  domain: string
  targetEmail: string        // Default forwarding destination
  wildcardEnabled: boolean   // Auto-create aliases on first email received
  enabled: boolean
  createdAt: number
  color?: string             // Optional hex color for UI sidebar
}

interface AliasConfig {
  localPart: string          // The part before '@' in the alias address
  domain: string
  targetEmail: string | null // null means inherit domain's targetEmail
  enabled: boolean
  createdAt: number
  forwardedCount: number
  blockedCount: number
  lastUsedAt: number | null
  autoCreated: boolean       // true if created automatically by wildcard mode
}
```

Additional types: `DestinationConfig`, `DomainStats`, `Session`.

### KV data schema (`src/lib/kv.ts`)

| KV Key | Value |
|---|---|
| `domain:{domain}` | JSON-serialized `DomainConfig` |
| `alias:{domain}/{localPart}` | JSON-serialized `AliasConfig` |
| `destination:{email}` | JSON-serialized `DestinationAddress` |

All KV reads/writes go through helpers in `src/lib/kv.ts`. The KV binding is named `KV` and accessed via `platform.env.KV` in server code.

### Authentication (`src/lib/auth.ts`, `src/hooks.server.ts`)

- Optional password auth via `AUTH_PASSWORD` Pages secret
- Sessions are HMAC-signed cookies (no server-side session store)
- If `AUTH_PASSWORD` is not set, authentication is skipped entirely (rely on Cloudflare Access)
- The auth middleware in `hooks.server.ts` redirects unauthenticated requests to `/login`

### API endpoints (`src/routes/api/`)

```
GET    /api/auth/status
GET    /api/domains                             List domains
POST   /api/domains                             Create domain
GET    /api/domains/[domain]                    Get domain config
PATCH  /api/domains/[domain]                    Update domain (settings, color, toggle)
DELETE /api/domains/[domain]                    Delete domain (and all its aliases)
GET    /api/domains/[domain]/aliases            List aliases
POST   /api/domains/[domain]/aliases            Create alias (auto-slug or custom)
GET    /api/domains/[domain]/aliases/[localPart]
PATCH  /api/domains/[domain]/aliases/[localPart]  Update alias (enable, target override, etc.)
DELETE /api/domains/[domain]/aliases/[localPart]
GET    /api/destinations                        List destination emails
POST   /api/destinations                        Add destination email
DELETE /api/destinations/[email]               Remove destination email
```

All API handlers return JSON. Error responses use standard HTTP status codes.

### Email worker (`email-worker/src/index.ts`)

The email worker:
1. Receives an email via the `email()` Cloudflare handler
2. Looks up `domain:{domain}` in KV to check if domain is enabled
3. Looks up `alias:{domain}/{localPart}` for the alias
4. If wildcard is enabled and alias doesn't exist, auto-creates it
5. Forwards to `targetEmail` (alias-level override or domain default) via `message.forward()`
6. Rejects with a reason if the alias is disabled or domain is disabled
7. Updates `forwardedCount`/`blockedCount` and `lastUsedAt` in KV

### Slug generator (`src/lib/sluggen.ts`)

Generates random alias slugs in the format `adjective-noun-number` using hard-coded word lists. Used when creating aliases without a custom local part.

---

## Cloudflare Environment

### Environment variables / secrets

| Name | Where set | Description |
|---|---|---|
| `AUTH_PASSWORD` | Wrangler Pages secret | Dashboard login password. Omit to disable password auth. |
| `KV` | `wrangler.toml` binding | Shared KV namespace (same ID in both wrangler.toml files). |

### Wrangler configuration

- `wrangler.toml` (root) — Cloudflare Pages config; sets `pages_build_output_dir = ".svelte-kit/cloudflare"`, `nodejs_compat` flag, and KV binding
- `email-worker/wrangler.toml` — Cloudflare Worker config; same KV namespace ID

Both must reference the **same KV namespace ID** for the system to work.

### Local dev with KV

The Vite dev server (`npm run dev`) does NOT support KV. To develop with real data:

```bash
npm run build
wrangler pages dev --kv KV=YOUR_KV_NAMESPACE_ID
```

---

## Styling Conventions

Tailwind CSS with a custom dark theme. Use the `app.*` color tokens defined in `tailwind.config.ts` rather than raw Tailwind colors:

| Token | Usage |
|---|---|
| `app-bg` | Main background |
| `app-sidebar` | Sidebar background |
| `app-surface` | Card/panel background |
| `app-hover` | Hover state background |
| `app-border` | Border color |
| `app-text` | Primary text |
| `app-muted` | Secondary/muted text |
| `app-accent` | Accent/primary action color (`#3ddec8` teal) |
| `app-accent-dim` | Accent background dim |

All UI components are in `src/lib/components/`. New UI should follow the existing component patterns (Svelte 5 runes syntax with `$state`, `$derived`, `$props`).

---

## Common Development Workflows

### Adding a new API endpoint

1. Create a `+server.ts` file in the appropriate `src/routes/api/` subdirectory
2. Export named functions for HTTP methods (`GET`, `POST`, `PATCH`, `DELETE`)
3. Access KV via `platform.env.KV` (typed in `src/app.d.ts`)
4. Return `json(data)` or `new Response(...)` with appropriate status codes
5. Run `npm run check` and `npm run build` to validate

### Adding a new Svelte component

1. Create `.svelte` file in `src/lib/components/`
2. Use Svelte 5 runes syntax (`$state`, `$derived`, `$props`, `$effect`)
3. Style with Tailwind utility classes and `app-*` color tokens
4. Import and use in the relevant page or parent component

### Modifying the email worker

1. Edit `email-worker/src/index.ts`
2. Test locally: `cd email-worker && wrangler dev`
3. Deploy: `cd email-worker && wrangler deploy`
4. Both the main app and email worker must reference the same KV namespace

### Modifying KV data structures

1. Update types in `src/lib/types.ts`
2. Update KV helpers in `src/lib/kv.ts`
3. Update the email worker if it reads/writes the same keys
4. Be mindful of backwards compatibility — existing KV entries won't be migrated automatically

---

## Known Issues and Workarounds

- **No `.github/` directory existed** at initial onboarding — it was created as part of adding this file.
- **`npm run check` reports ~9 warnings** (mostly reactive state access in Svelte 5 components) but no errors. These warnings are pre-existing and non-blocking.
- **`tsconfig.json` extends `.svelte-kit/tsconfig.json`** which is auto-generated by `svelte-kit sync` (run as part of `npm run check`). If the `.svelte-kit/` directory doesn't exist, run `npx svelte-kit sync` first.
- **No test framework is configured.** Do not add tests unless the issue specifically requires it. Validate changes via `npm run check` and `npm run build`.
- **KV is not available during `npm run dev`.** Data operations require either `wrangler pages dev` with a real KV binding or deployment to Cloudflare.
- **Deployment requires Wrangler authentication** (`wrangler login`). CI/CD deployments should use a `CLOUDFLARE_API_TOKEN` environment variable.
