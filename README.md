# VelclawHost Control Center

Staging-first control plane for repositories and hosting deployments.

## Included
- Responsive dark operations dashboard.
- Initial registry for OCode.js Profile, Ask OCode.js and OCode.js Docs.
- Vite + React static frontend and Netlify build configuration.
- CI build workflow.

## Current implementation boundary
GitHub OAuth identity, encrypted sessions and the initial admin/member role claim are implemented in the staging branch. They remain inactive until the Netlify Preview environment variables documented in `docs/GITHUB-OAUTH-SETUP.md` are configured. Netlify deployment management, environment-variable management, domain mutations, audit logs and server provisioning are not implemented yet. Existing Projects and Domains APIs remain read-only; the UI does not fabricate deployment data.

## Development
- Node.js 20.9+
- `npm install`
- `npm run dev`
- `npm run build`

## Netlify
- Build command: `npm run build`
- Publish directory: `dist`

## Security
Never put provider tokens in `VITE_*` variables or browser code. OAuth exchange and provider API calls must run server-side. Production and destructive operations require explicit authorization and role checks.

## Read-only GitHub API phase

Netlify Functions expose:
- `/.netlify/functions/health`
- `/.netlify/functions/projects`

The projects endpoint queries only the three fixed public repositories listed in `server/project-registry.mjs`. It exposes a strict metadata allowlist and has no write operations. The dashboard reads this endpoint when served through Netlify.

Run `npm test` for registry allowlist and metadata-redaction tests, and `npm run check:functions` to validate function syntax.

## Read-only Cloudflare domain inventory

The dashboard's Domains section reads `/.netlify/functions/domains`, backed by `server/domain-registry.mjs`. The registry contains a dated snapshot of nine zones and observed DNS-routing summaries from the connected Cloudflare account.

This is intentionally a read-only snapshot:
- It does not create, update, or delete DNS records.
- It does not claim a domain or subdomain is available based only on the snapshot.
- Existing Vercel, Netlify, Cloudflare Gateway, Render, wildcard, email, and verification records must be preserved.
- Zone status (active/pending/initializing) is not equivalent to website health or provider-side domain verification.

Before enabling live synchronization or domain assignment, configure a least-privilege Cloudflare API token as a server-side Netlify environment variable and add provider-side hostname verification. Never expose that token to the browser or commit it to Git.
