# Environment and secrets

## Local setup

Install the 1Password CLI, enable desktop-app integration, and sign in with access to the existing items. Then run `bun run dev`; use `bun run env:check` or `bun run env:check:prod` to validate development or production configuration. Varlock resolves credentials in memory. Production-only app and Cloudflare settings are not required for development.

The schemas use Varlock's `op(op://...)` resolver; importing a plain `.env.tpl` leaves references literal. Keep references and validation in `apps/website/.env.schema`. Never commit resolved values, local env files, or credential-bearing artifacts.

## CI and deployment

CI has no production credentials. Gitleaks scans repository history; the build artifact is credential-free. Run `bun run env:scan` after a build with production 1Password access to scan source and output for resolved sensitive values.

The pinned 1Password action loads Cloudflare credentials for deploy/reconciliation and application credentials only for successful `main` pushes. Preview, cleanup, and reconciliation paths do not load app secrets. The pinned Alchemy action retains production authorization, preview-SHA validation, and lifecycle management; preview lifecycle still requires the account-scoped Cloudflare token.

Restrict the GitHub 1Password service account to required vaults. Alchemy binds app secrets only to production Workers and manages Turnstile. Varlock's Cloudflare runtime response-leak integration is not enabled because Alchemy owns Worker binding and deployment.

## Adding or rotating credentials

Add sensitive references to the owning schema and require them only in the environments that use them. Keep CI references in the production-only action step and action pins immutable. Rotate the existing 1Password field, verify the relevant path, then revoke the old credential; never put values in logs, PRs, or artifacts.
