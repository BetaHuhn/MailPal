# MailPal

Self-hosted email alias forwarding dashboard built on Cloudflare Email Workers and Workers KV. Generate random or custom aliases for any domain you own, forward to any inbox, and toggle them on or off at any time.

## Features

- **Alias management** — Create random (`swift-meadow-412@yourdomain.com`) or custom aliases per domain
- **Per-alias target override** — Forward a specific alias to a different inbox than the domain default
- **Enable/disable** — Instantly block or re-enable any alias without deleting it
- **Wildcard mode** — Automatically create aliases on first use (any address at your domain works until you disable it)
- **Stats** — Track forwarded and blocked counts per alias, plus last-used timestamp
- **Multi-domain** — Manage multiple domains from a single dashboard
- **Auth** — Optional password protection with HMAC-signed session cookies, or delegate to Cloudflare Access
- **Self-hosted** — Runs entirely on Cloudflare's free tier (Pages + Workers + KV)

## Architecture

```
mailpal/                        ← SvelteKit app → Cloudflare Pages
└── email-worker/               ← Email handler → Cloudflare Worker
```

Both share one KV namespace. The SvelteKit app provides the management UI and REST API. The email worker intercepts all incoming mail and forwards or rejects based on KV state.

---

## Setup

### Prerequisites

- A Cloudflare account
- A domain added to Cloudflare (DNS managed by Cloudflare)
- [Node.js](https://nodejs.org) 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed and authenticated (`wrangler login`)

---

### 1. Clone and install

```bash
git clone https://github.com/yourname/mailpal
cd mailpal
npm install
cd email-worker && npm install && cd ..
```

---

### 2. Create a KV namespace

```bash
wrangler kv:namespace create mailpal
```

Copy the `id` from the output and paste it into **both** wrangler config files:

`wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "KV"
id = "YOUR_KV_NAMESPACE_ID"
```

`email-worker/wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "KV"
id = "YOUR_KV_NAMESPACE_ID"   # same ID as above
```

---

### 3. Deploy the email worker

```bash
cd email-worker
wrangler deploy
```

Note the worker name — it defaults to `mailpal-email-worker`.

---

### 4. Configure Cloudflare Email Routing

1. Go to **Cloudflare dashboard → your domain → Email → Email Routing**
2. Enable Email Routing if not already active
3. Under **Routing rules**, add a catch-all rule:
   - **Expression**: Catch-all
   - **Action**: Send to a Worker
   - **Worker**: `mailpal-email-worker`
4. Save the rule

> Email Routing requires your domain's MX records to point to Cloudflare. The dashboard will prompt you to update them automatically if needed.

---

### 5. Deploy the dashboard (Cloudflare Pages)

```bash
npm run build
wrangler pages deploy
```

Wrangler will create a Pages project on first deploy and give you a `*.pages.dev` URL.

To use a custom domain, go to **Cloudflare dashboard → Pages → your project → Custom domains** and add your preferred domain.

---

### 6. Set a login password (optional)

If you want password-protected access to the dashboard:

```bash
wrangler pages secret put AUTH_PASSWORD
# Enter your password when prompted
```

Without this secret, the dashboard is unprotected — use [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/) to restrict it instead (see below).

---

### 7. (Alternative) Protect with Cloudflare Access

Instead of a password, you can gate the dashboard behind Cloudflare Access (supports SSO, email OTP, GitHub login, etc.):

1. Go to **Cloudflare dashboard → Zero Trust → Access → Applications**
2. Click **Add an application → Self-hosted**
3. Set the **Application domain** to your dashboard URL
4. Configure an identity provider and policy (e.g. allow your email address)
5. Do **not** set `AUTH_PASSWORD` — MailPal detects its absence and trusts CF Access headers

---

## Local development

The app runs locally without Cloudflare services, but KV won't be available (all pages will load, but data operations require a real KV binding).

To develop with a real KV namespace locally, use `wrangler pages dev`:

```bash
npm run build
wrangler pages dev --kv KV=YOUR_KV_NAMESPACE_ID
```

Or run the email worker locally:

```bash
cd email-worker
wrangler dev
```

---

## Adding a domain

1. Open the dashboard
2. Click **Add domain**
3. Enter your domain name (must be added to Cloudflare with Email Routing enabled)
4. Enter a default target email address (where aliases forward by default)
5. Optionally enable **Wildcard mode**

After adding the domain, go to Cloudflare Email Routing and make sure the catch-all rule is pointing to `mailpal-email-worker`.

---

## Environment variables / secrets

| Name | Where | Description |
|---|---|---|
| `AUTH_PASSWORD` | Pages secret | Password for dashboard login. Omit to disable password auth. |
| `KV` | `wrangler.toml` binding | KV namespace shared between Pages and email worker. |

---

## KV data schema

| Key | Value |
|---|---|
| `domain:{domain}` | `DomainConfig` JSON |
| `alias:{domain}/{localPart}` | `AliasConfig` JSON |

You can inspect or edit values directly in the Cloudflare dashboard under **Workers & Pages → KV → your namespace**.
