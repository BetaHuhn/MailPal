#!/usr/bin/env bun
/**
 * MailPal Setup Script
 *
 * Clones the repo, creates a Cloudflare KV namespace, deploys the email worker
 * and the Pages dashboard — all in one go.
 *
 * Usage:
 *   bun run https://raw.githubusercontent.com/betahuhn/mailpal/main/scripts/setup.ts
 */

import { $ } from "bun";
import { createInterface } from "readline";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, resolve } from "path";

// ── Terminal styling ──────────────────────────────────────────────────────────

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

const log = {
  info: (msg: string) => console.log(`  ${c.cyan}→${c.reset} ${msg}`),
  success: (msg: string) => console.log(`  ${c.green}✓${c.reset} ${msg}`),
  warn: (msg: string) => console.log(`  ${c.yellow}⚠${c.reset}  ${msg}`),
  error: (msg: string) => console.error(`  ${c.red}✗${c.reset} ${msg}`),
  blank: () => console.log(),
  step: (n: number, total: number, title: string) => {
    console.log(
      `\n${c.bold}${c.cyan}Step ${n}/${total}${c.reset}${c.bold}  ${title}${c.reset}`
    );
    console.log(`${c.dim}${"─".repeat(40)}${c.reset}`);
  },
};

// ── User input ────────────────────────────────────────────────────────────────

const rl = createInterface({ input: process.stdin, output: process.stdout });

function prompt(question: string, defaultVal = ""): Promise<string> {
  const hint = defaultVal ? ` ${c.dim}(${defaultVal})${c.reset}` : "";
  return new Promise((resolve) => {
    rl.question(`  ${c.bold}?${c.reset} ${question}${hint}: `, (answer) => {
      resolve(answer.trim() || defaultVal);
    });
  });
}

async function confirm(question: string, defaultYes = true): Promise<boolean> {
  const hint = defaultYes ? "Y/n" : "y/N";
  const answer = await prompt(`${question} ${c.dim}[${hint}]${c.reset}`);
  if (!answer) return defaultYes;
  return answer.toLowerCase().startsWith("y");
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*[mGKHF]/g, "");
}

async function commandExists(cmd: string): Promise<boolean> {
  try {
    await $`which ${cmd}`.quiet();
    return true;
  } catch {
    return false;
  }
}

// Wrangler may live globally, in node_modules/.bin, or be fetched via bunx.
// Prefer local install (faster after `bun install`) then fall back to bunx.
function wrangler(repoPath?: string): string[] {
  if (repoPath) {
    const local = join(repoPath, "node_modules", ".bin", "wrangler");
    if (existsSync(local)) return [local];
  }
  return ["bunx", "--bun", "wrangler"];
}

// ── Step 1: Prerequisites ─────────────────────────────────────────────────────

async function checkPrerequisites(): Promise<void> {
  log.step(1, STEPS, "Checking prerequisites");

  if (!(await commandExists("git"))) {
    log.error("git is not installed. Please install git and try again.");
    process.exit(1);
  }
  log.success("git found");
  log.success("Bun runtime detected");
}

// ── Step 2: Cloudflare authentication ────────────────────────────────────────

async function ensureWranglerAuth(): Promise<void> {
  log.step(2, STEPS, "Cloudflare authentication");

  log.info("Checking Wrangler login status…");

  let authenticated = false;
  try {
    const result = await $`${wrangler()} whoami`.quiet();
    const text = stripAnsi(result.text());
    // Wrangler prints "You are logged in" or shows an account table on success.
    authenticated =
      text.includes("You are logged in") ||
      text.includes("Account Name") ||
      text.includes("account");
  } catch {
    authenticated = false;
  }

  if (authenticated) {
    log.success("Already authenticated with Cloudflare");
    return;
  }

  log.info("Opening Cloudflare login in your browser…");
  log.blank();

  try {
    await $`${wrangler()} login`;
    log.success("Authenticated with Cloudflare");
  } catch {
    log.error(
      "Wrangler login failed. Run `wrangler login` manually then re-run this script."
    );
    process.exit(1);
  }
}

// ── Step 3: Clone repository ──────────────────────────────────────────────────

async function resolveRepo(): Promise<string> {
  log.step(3, STEPS, "Repository");

  // If we're already inside the mailpal repo, use it as-is.
  const cwd = process.cwd();
  const localPkg = join(cwd, "package.json");
  if (existsSync(localPkg)) {
    try {
      const pkg = JSON.parse(readFileSync(localPkg, "utf-8"));
      if (pkg.name === "mailpal") {
        log.success(`Using existing repository at ${cwd}`);
        return cwd;
      }
    } catch {}
  }

  const defaultTarget = join(cwd, "mailpal");
  const target = await prompt("Installation directory", defaultTarget);
  const repoPath = resolve(target);

  if (existsSync(repoPath)) {
    const pkg = join(repoPath, "package.json");
    if (existsSync(pkg)) {
      try {
        const pkgData = JSON.parse(readFileSync(pkg, "utf-8"));
        if (pkgData.name === "mailpal") {
          log.success(`Found existing repository at ${repoPath}`);
          return repoPath;
        }
      } catch {}
    }
    log.error(`Directory already exists and does not look like a MailPal repo: ${repoPath}`);
    process.exit(1);
  }

  log.info(`Cloning into ${repoPath}…`);
  try {
    await $`git clone https://github.com/betahuhn/mailpal.git ${repoPath}`;
    log.success("Repository cloned");
  } catch {
    log.error("git clone failed. Check your internet connection and try again.");
    process.exit(1);
  }

  return repoPath;
}

// ── Step 4: Install dependencies ─────────────────────────────────────────────

async function installDeps(repoPath: string): Promise<void> {
  log.step(4, STEPS, "Installing dependencies");

  log.info("Installing root dependencies…");
  try {
    await $`bun install`.cwd(repoPath);
    log.success("Root dependencies installed");
  } catch {
    log.error("bun install failed in root.");
    process.exit(1);
  }

  log.info("Installing email-worker dependencies…");
  try {
    await $`bun install`.cwd(join(repoPath, "email-worker"));
    log.success("Email-worker dependencies installed");
  } catch {
    log.error("bun install failed in email-worker.");
    process.exit(1);
  }
}

// ── Step 5: KV namespace ──────────────────────────────────────────────────────

async function createKvNamespace(repoPath: string): Promise<string> {
  log.step(5, STEPS, "Creating KV namespace");

  const wr = wrangler(repoPath);
  log.info('Creating KV namespace "mailpal" on Cloudflare…');

  let output = "";
  try {
    // Run from repoPath so wrangler picks up the project name from wrangler.toml.
    const result = await $`${wr} kv namespace create mailpal`.cwd(repoPath);
    output = stripAnsi(result.text());
  } catch (err: any) {
    const stderr = stripAnsi(err?.stderr ?? "");
    const stdout = stripAnsi(err?.stdout ?? "");
    output = stdout + stderr;

    // Gracefully handle "already exists" errors.
    if (
      output.toLowerCase().includes("already exists") ||
      output.toLowerCase().includes("duplicate")
    ) {
      log.warn("A namespace with this name already exists.");
    } else {
      log.warn("wrangler kv namespace create returned an error:");
      log.blank();
      console.log(c.dim + output + c.reset);
      log.blank();
    }
  }

  // Try to extract the namespace ID from the TOML snippet wrangler prints.
  // Matches:  id = "abc123..."   or   "id": "abc123..."
  const match = output.match(/id\s*[=:]\s*"([a-f0-9]{32})"/i);
  if (match) {
    log.success(`KV namespace ID: ${c.cyan}${match[1]}${c.reset}`);
    return match[1];
  }

  // Fallback: ask the user.
  log.warn("Could not auto-detect the KV namespace ID from wrangler output.");
  if (output.trim()) {
    log.blank();
    console.log(c.dim + output.trim() + c.reset);
    log.blank();
  }

  const id = await prompt(
    'Enter the KV namespace ID shown above (32-character hex string)'
  );
  if (!/^[a-f0-9]{32}$/i.test(id)) {
    log.error("That doesn't look like a valid KV namespace ID.");
    process.exit(1);
  }
  return id;
}

// ── Step 6: Patch wrangler configs ───────────────────────────────────────────

async function patchConfigs(repoPath: string, kvId: string): Promise<void> {
  log.step(6, STEPS, "Updating wrangler configuration files");

  const files = [
    join(repoPath, "wrangler.toml"),
    join(repoPath, "email-worker", "wrangler.toml"),
  ];

  for (const file of files) {
    if (!existsSync(file)) {
      log.warn(`Config not found, skipping: ${file}`);
      continue;
    }
    const original = readFileSync(file, "utf-8");
    // Replace any existing id value under [[kv_namespaces]]
    const patched = original.replace(/(id\s*=\s*")[^"]*(")/g, `$1${kvId}$2`);
    if (patched === original) {
      log.warn(`No id field found to replace in ${file}`);
    } else {
      writeFileSync(file, patched, "utf-8");
      log.success(`Patched ${file.replace(repoPath + "/", "")}`);
    }
  }
}

// ── Step 7: Deploy email worker ───────────────────────────────────────────────

async function deployWorker(repoPath: string): Promise<void> {
  log.step(7, STEPS, "Deploying email worker");

  const workerDir = join(repoPath, "email-worker");
  const wr = wrangler(repoPath);

  log.info("Deploying mailpal-email-worker…");
  try {
    await $`${wr} deploy`.cwd(workerDir);
    log.success("Email worker deployed");
  } catch {
    log.error("Worker deploy failed. Review the output above for details.");
    process.exit(1);
  }
}

// ── Step 8: Build & deploy dashboard ─────────────────────────────────────────

async function deployDashboard(repoPath: string): Promise<void> {
  log.step(8, STEPS, "Building and deploying dashboard");

  log.info("Building dashboard…");
  try {
    await $`bun run build`.cwd(repoPath);
    log.success("Build complete");
  } catch {
    log.error("Build failed. Review the output above for details.");
    process.exit(1);
  }

  const wr = wrangler(repoPath);
  log.info("Deploying to Cloudflare Pages…");
  try {
    // wrangler.toml defines pages_build_output_dir and name, so no extra flags needed.
    await $`${wr} pages deploy`.cwd(repoPath);
    log.success("Dashboard deployed to Cloudflare Pages");
  } catch {
    log.error("Pages deploy failed. Review the output above for details.");
    process.exit(1);
  }
}

// ── Step 9: Optional password auth ───────────────────────────────────────────

async function configureAuth(repoPath: string): Promise<void> {
  log.step(9, STEPS, "Dashboard authentication (optional)");

  console.log(
    `  Without a password the dashboard is publicly accessible to anyone with the URL.`
  );
  console.log(
    `  ${c.dim}You can also protect it via Cloudflare Access (Zero Trust) instead.${c.reset}`
  );
  log.blank();

  const wants = await confirm("Set a login password for the dashboard?", false);
  if (!wants) {
    log.info("Skipping — dashboard will be unprotected.");
    return;
  }

  const password = await prompt("Password");
  if (!password) {
    log.warn("No password entered, skipping.");
    return;
  }

  const wr = wrangler(repoPath);
  try {
    // Pipe the password into wrangler via stdin (non-interactive mode).
    const proc = Bun.spawn([...wr, "pages", "secret", "put", "AUTH_PASSWORD"], {
      cwd: repoPath,
      stdin: new TextEncoder().encode(password + "\n"),
      stdout: "inherit",
      stderr: "inherit",
    });
    const code = await proc.exited;
    if (code === 0) {
      log.success("AUTH_PASSWORD secret saved");
    } else {
      throw new Error(`exit code ${code}`);
    }
  } catch (err: any) {
    log.warn(
      `Could not set secret automatically (${err?.message ?? err}). ` +
        `Run manually:\n\n    wrangler pages secret put AUTH_PASSWORD\n`
    );
  }
}

// ── Next steps ────────────────────────────────────────────────────────────────

function printNextSteps(): void {
  log.blank();
  console.log(`${c.bold}${c.green}  MailPal is deployed!${c.reset}`);
  log.blank();
  console.log(`${c.bold}  What to do next:${c.reset}`);
  console.log(`
  ${c.cyan}1.${c.reset} Enable Email Routing for your domain
     Cloudflare Dashboard → <your domain> → Email → Email Routing
     Turn it on and let Cloudflare update your MX records.

  ${c.cyan}2.${c.reset} Add a catch-all routing rule
     Under "Routing rules" add a catch-all:
       Expression : Catch-all
       Action     : Send to a Worker
       Worker     : ${c.bold}mailpal-email-worker${c.reset}

  ${c.cyan}3.${c.reset} Open your Pages URL and complete onboarding
     Add your first domain and set a default forwarding address.

  ${c.cyan}4.${c.reset} (Optional) Add a custom domain to the Pages project
     Cloudflare Dashboard → Workers & Pages → mailpal → Custom domains
`);
  console.log(
    `  ${c.dim}Docs: https://github.com/betahuhn/mailpal${c.reset}\n`
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const STEPS = 9;

async function main() {
  console.log(`\n${c.bold}${c.cyan}  MailPal Setup${c.reset}`);
  console.log(
    `  ${c.dim}Deploys MailPal to your Cloudflare account in a few steps.${c.reset}\n`
  );

  const go = await confirm("Ready to start?");
  if (!go) {
    console.log("  Setup cancelled.");
    rl.close();
    process.exit(0);
  }

  await checkPrerequisites();
  await ensureWranglerAuth();
  const repoPath = await resolveRepo();
  await installDeps(repoPath);
  const kvId = await createKvNamespace(repoPath);
  await patchConfigs(repoPath, kvId);
  await deployWorker(repoPath);
  await deployDashboard(repoPath);
  await configureAuth(repoPath);

  rl.close();
  printNextSteps();
}

main().catch((err) => {
  log.error(`Unexpected error: ${err?.message ?? err}`);
  rl.close();
  process.exit(1);
});
