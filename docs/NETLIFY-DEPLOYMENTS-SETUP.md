# Netlify deployment history (admin-only, read-only)

The `/.netlify/functions/deployments` endpoint reads the latest 20 deployments from the configured Netlify site.

## Required server-side variables

- `NETLIFY_AUTH_TOKEN`: Netlify personal access token with the minimum read permissions needed for site/deploy metadata.
- `NETLIFY_SITE_ID`: the target Netlify site ID.

Set both in Netlify site environment variables, scoped to Functions and Deploy Previews. Never use `VITE_*` prefixes, expose these values to the browser, or commit them to Git.

## Access controls

- Requires a valid GitHub OAuth session.
- Admin role only; role comes from `ADMIN_GITHUB_USERS`.
- GET only. No deploy, cancel, publish, rollback, or configuration mutation endpoint is exposed.
- Response is an allowlist of deployment metadata; provider error text and credentials are never returned.
- Deployment links are accepted only for HTTPS Netlify subdomains.
