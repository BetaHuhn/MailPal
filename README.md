<p align="center">
  <img src="./static/icon.svg" alt="MailPal" width="96" height="96" style="border-radius: 22px" />
</p>

<h3 align="center">MailPal</h3>

<p align="center">
  Your friendly guardian for email privacy.<br/>
  A self-hosted email alias manager running entirely on your own Cloudflare account.
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#how-it-works"><strong>How it works</strong></a> ·
  <a href="#setup"><strong>Setup</strong></a> ·
  <a href="#local-development"><strong>Development</strong></a>
</p>

<br/>

## Introduction

MailPal lets you create unique email aliases for every service you sign up to — so your real address is never exposed. When an alias gets spammy, disable it in one click. Every alias forwards to your real inbox, invisibly.

Unlike other alias services, **MailPal runs entirely inside your own Cloudflare account**. Your emails never touch a third-party server. Zero subscriptions, zero data sharing — just your Workers, your KV, and your rules.

## Features

**Aliases**
- Generate random aliases (`swift-meadow-412@yourdomain.com`) or set custom ones
- Per-alias target override — forward a specific alias to a different inbox than the domain default
- Enable / disable any alias instantly without deleting it
- Wildcard mode — automatically create aliases on first use for any address at your domain
- Set an expiry date or a max-forward limit — aliases disable themselves automatically

**Privacy & Control**
- Track forwarded and blocked counts per alias, plus last-used timestamp
- Per-alias activity log — see every email that came through, when, and from where
- Global activity feed — a full chronological view across all aliases and domains
- Bulk actions — enable, disable, or delete multiple aliases at once

**Organization**
- Add notes to any alias to remember what it's for
- Color tags — create named tags and assign them to aliases for filtering
- Filter by status, domain, and tags; full-text search across address, note, and tags
- Sortable by name, creation date, last used, or forwarded count

**Infrastructure**
- Multi-domain — manage multiple domains from a single dashboard
- Auth — password protection via HMAC-signed session cookies, or delegate to Cloudflare Access
- Runs entirely on Cloudflare's free tier (Pages + Workers + KV)
- No subscriptions, no third-party servers, ever

## How it works

```
mailpal/                        ← SvelteKit dashboard → Cloudflare Pages
└── email-worker/               ← Email handler       → Cloudflare Worker
```

Both share one KV namespace. The **SvelteKit app** provides the management UI and a REST API for all alias, domain, tag, and destination operations. The **email worker** intercepts every incoming message on your domain and decides — based on KV state — whether to forward it, reject it, or auto-create a new alias in wildcard mode.

When a message arrives:
1. The worker looks up the alias in KV
2. If active: it forwards to the configured target inbox and appends an entry to the alias activity log
3. If disabled, expired, or over-limit: it rejects silently and logs a blocked entry
4. If no alias exists and wildcard mode is on: it auto-creates one and forwards

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

Copy the `id` from the output and add it to **both** wrangler config files:

**`wrangler.toml`**
```toml
[[kv_namespaces]]
binding = "KV"
id = "YOUR_KV_NAMESPACE_ID"
```

**`email-worker/wrangler.toml`**
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

> Email Routing requires your domain's MX records to point to Cloudflare. The dashboard will offer to update them automatically if needed.

---

### 5. Deploy the dashboard

```bash
npm run build
wrangler pages deploy
```

Wrangler will create a Pages project on first deploy and give you a `*.pages.dev` URL. To use a custom domain, go to **Cloudflare dashboard → Pages → your project → Custom domains**.

---

### 6. Set a login password *(optional)*

```bash
wrangler pages secret put AUTH_PASSWORD
# Enter your password when prompted
```

Without this secret, the dashboard is unprotected. Use [Cloudflare Access](#protect-with-cloudflare-access) instead if you prefer SSO.

---

### 7. Protect with Cloudflare Access *(optional alternative to password)*

1. Go to **Cloudflare dashboard → Zero Trust → Access → Applications**
2. Click **Add an application → Self-hosted**
3. Set the **Application domain** to your dashboard URL
4. Configure an identity provider and policy (e.g. allow your email address only)
5. Leave `AUTH_PASSWORD` unset — MailPal detects its absence and trusts CF Access headers

---

## Local development

To develop against a real KV namespace locally, use `wrangler pages dev`:

```bash
npm run build
wrangler pages dev --kv KV=YOUR_KV_NAMESPACE_ID
```

To run the email worker locally:

```bash
cd email-worker
wrangler dev
```

> The app loads without Cloudflare services, but data operations require a real KV binding.

---

## Adding a domain

1. Open the dashboard and click **+** next to Domains in the sidebar
2. Enter your domain name (must be added to Cloudflare with Email Routing enabled)
3. Set a default target email address (where aliases forward by default)
4. Optionally enable **Wildcard mode**

After adding the domain, make sure the catch-all rule in Cloudflare Email Routing points to `mailpal-email-worker`.

---

## Environment variables

| Name | Where | Description |
|---|---|---|
| `AUTH_PASSWORD` | Pages secret | Password for dashboard login. Omit to disable password auth. |
| `KV` | `wrangler.toml` binding | KV namespace shared between the dashboard and the email worker. |

---

## KV data schema

| Key | Value |
|---|---|
| `domain:{domain}` | `DomainConfig` JSON |
| `alias:{domain}/{localPart}` | `AliasConfig` JSON |
| `destination:{email}` | `DestinationAddress` JSON |
| `tag:{name}` | `Tag` JSON |
| `log:{domain}/{localPart}` | `LogEntry[]` JSON — ring buffer, last 50 entries |
| `settings:onboarded` | `"1"` when the onboarding flow has been completed |

You can inspect or edit values directly in the Cloudflare dashboard under **Workers & Pages → KV → your namespace**.
