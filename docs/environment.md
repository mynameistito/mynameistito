# Environment and secrets

## Architecture

- `/.env.schema` owns shared Cloudflare deployment settings.
- `/apps/website/.env.schema` imports only those shared keys and owns website credentials/validation.
- 1Password remains the source of truth. The schema contains secret references, not credential values.
- The existing opaque 1Password references remain committed: they are locators, not access credentials, and replacing them with ignored/CI-supplied locator settings would add duplicated configuration without changing authorization. Access still requires authenticated 1Password CLI or the CI service account.
- Local Alchemy commands use Varlock's 1Password plugin. GitHub deployment and release jobs keep the pinned `1Password/load-secrets-action`; they do not install or run Varlock to retrieve CI credentials.
- Alchemy binds production app credentials to the Worker as secrets. CI preview builds have no deployment credentials and preview deployments receive no production app credentials. The deploy action still needs the account-scoped Cloudflare deployment token to create/destroy preview Workers.

## Local setup

1. Install dependencies with `bun install --frozen-lockfile`.
2. Install 1Password CLI and enable its desktop-app integration, then sign in to the account that can read the existing credential items. Varlock uses desktop authentication; no `.env` file or service-account token is required for ordinary local development.
3. Run `bun run dev` (or `bun run dev:website`). These commands resolve and validate website configuration in-memory and pass it to Alchemy; they do not resolve Cloudflare deployment credentials. `bun run --cwd apps/website deploy` loads the production-only Cloudflare settings and deploys the production stage.
4. Use `bun run env:check` to validate local-development config with sensitive values redacted. Use `bun run env:check:prod` to validate production deployment config. These commands resolve 1Password references and therefore require local 1Password authentication.
5. Use `bun run env:scan` to scan website source and generated `dist` output for resolved sensitive values, including production-only deployment credentials. Run after a build when checking bundle output.

Varlock's subprocess mode passes resolved values to its child process. It redacts sensitive values from piped output, but it is not a sandbox; only run trusted commands under `varlock run`.

## Files that must stay local

Keep `.env`, `.env.local`, `.env.*.local`, `apps/website/.env`, `apps/website/.env.local`, and `apps/website/.env.*.local` gitignored. Prefer 1Password references in the committed schema over copying credentials into local env files. Never commit resolved `.env` output, generated config containing resolved values, or credential-bearing build artifacts.

## GitHub Actions and Cloudflare

- The CI workflow runs Gitleaks on repository history without deployment secrets. Its credential-free Worker artifact is used only for a same-repository PR head SHA validated by `mynameistito/alchemy-deploy`.
- Deployment/reconciliation retrieve only Cloudflare credentials from the pinned 1Password action. App secrets are resolved only for a successful `main` push; preview/cleanup paths do not load them. The external action gates production to the authorized branch, uses the exact successful CI run/head SHA for previews, handles PR closure, and reconciles missed cleanup on schedule.
- `OP_SERVICE_ACCOUNT_TOKEN` is GitHub's secret-zero credential for trusted deployment/release jobs; restrict its 1Password service-account access to only the vaults containing the required items. GitHub-generated tokens and the optional `CODECOV_TOKEN` remain workflow-only and are not application configuration.
- Release credentials use the same pinned 1Password action. `update-readme.yml` only uses GitHub's workflow token and needs no 1Password secrets.
- Alchemy receives app credentials only for production deployment, where `ConfigRedacted` marks secrets. Turnstile values are managed by Alchemy. No resolved values are written to the repository or workflow artifacts.

## Adding or rotating a secret

1. Create/update the credential in the existing authorized 1Password vault, preserving the existing item when rotating. Keep access limited to the people and automation that need it.
2. Add one schema entry at the owning scope (`.env.schema` for shared infra, or `apps/website/.env.schema` for website-only config). Use `op()` with the 1Password field reference, mark credentials `@sensitive`, set `@required` where needed, and add a concrete `@type` for structured non-secret values.
3. If GitHub must resolve it, add the field reference and output mapping to the appropriate workflow step. Gate production-only values so preview, fork, cleanup, and reconciliation paths do not load them. Keep action pins immutable.
4. Run `bun run env:check`, `bun run env:scan`, and the repository checks. Inspect client output; secrets must never be read by client code.
5. For rotation, update the existing 1Password field, verify the relevant local/CI deployment path, then revoke the old credential at its provider. Do not put either value in PR descriptions, logs, or artifacts.

## Limitations and trust boundary

Varlock supports runtime redaction/response leak detection through its Cloudflare integration, but that integration uploads bindings through `varlock-wrangler`; it is not compatible with this repository's Alchemy deployment flow without changing who owns Worker binding lifecycle. This migration intentionally keeps Alchemy and the external deployment action authoritative. Accordingly, Varlock provides local schema validation, secret resolution, output redaction, and source/bundle scanning; runtime response scanning is not enabled. The shared Cloudflare API token is needed by the action for both production operations and preview lifecycle, so its account-level scope should be reviewed periodically and kept to the minimum Workers permissions Cloudflare supports.
