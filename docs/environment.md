# Environment and secrets

## Local development

Install dependencies and the 1Password CLI, then enable its desktop-app integration and sign in to the account with access to the existing items. Run `bun run dev` (or `bun run dev:website`). Varlock resolves the website's 1Password references in memory; app credentials are optional in development, and Cloudflare deployment credentials are only loaded for production. `bun run env:check` validates development settings; `bun run env:check:prod` validates the production deployment configuration.

1Password is the source of truth. `.env.schema` and `apps/website/.env.schema` contain references, not credential values. Keep local `.env` files, resolved config, and credential-bearing artifacts uncommitted. Never copy resolved credentials into source or client code.

## CI and deployments

CI has no production credentials. It scans committed history with Gitleaks and builds the Worker artifact. `bun run env:scan` uses Varlock to scan source and build output for actual resolved sensitive values; run it locally after a build with production 1Password access.

The pinned 1Password action loads Cloudflare credentials for deploy and reconciliation. It loads application credentials only on a successful `main` push. Preview deployment, PR close/cleanup, and scheduled reconciliation do not load app credentials. The pinned Alchemy deployment action remains responsible for authorized production deploys, validated preview SHAs, and preview lifecycle. Preview lifecycle still requires the account-scoped Cloudflare token.

Restrict `OP_SERVICE_ACCOUNT_TOKEN` to the required 1Password vaults and keep its GitHub use limited to trusted workflow paths. Alchemy binds app secrets only to production Workers; Turnstile remains an Alchemy-managed binding. This flow does not enable Varlock's Cloudflare runtime response-leak integration because Alchemy owns Worker binding and deployment lifecycle.

## Add or rotate a secret

Add the reference to the owning schema and mark credentials sensitive. Make credentials required only in environments that need them. If GitHub must resolve one, add it to the production-only action step; preserve immutable action pins. For rotation, update the existing 1Password field, verify the relevant local/CI path, then revoke the old credential. Never put resolved values in logs, PRs, or artifacts.
