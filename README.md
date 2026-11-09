# VelclawHost Control Center

Staging-first control plane for repositories and hosting deployments.

## Included
- Responsive dark operations dashboard.
- Initial registry for OCode.js Profile, Ask OCode.js and OCode.js Docs.
- Vite + React static frontend and Netlify build configuration.
- CI build workflow.
- Read-only GitHub repository metadata through Netlify Functions.

## Current implementation boundary
This is the frontend and read-only integration foundation. GitHub OAuth, Netlify OAuth/API integration, authenticated deployment actions, environment-variable management, domain operations, audit logs and server provisioning are not implemented yet. The UI deliberately labels integrations as not connected and does not fabricate deployment data.

## Development
- Node.js 20.9+
- `npm install`
- `npm run dev`
- `npm test`
- `npm run check:functions`
- `npm run build`

## Netlify project
- Build command: `npm run build`
- Publish directory: `dist`
- Project: `velclawhost-control-center`
- Local Netlify state is excluded through `.gitignore`.

## Preview deployment (GitHub Actions)
The `.github/workflows/netlify-preview.yml` workflow creates a **draft Netlify deploy only** for pull requests opened from this repository. It never uses `--prod` and does not publish to the production site URL.

Configure these repository Actions secrets before the workflow can upload a preview:
- `NETLIFY_AUTH_TOKEN`: a Netlify personal access token, stored only in GitHub Actions Secrets.
- `NETLIFY_SITE_ID`: the existing Netlify project ID for `velclawhost-control-center`.

Do not put either value in source code, `netlify.toml`, a `VITE_*` variable, or a chat message. The workflow skips the deploy step when either secret is absent. Fork-originated pull requests are excluded so repository secrets are never exposed to untrusted code.

The workflow installs the pinned Netlify CLI and uploads the already-built `dist` directory as a non-production draft deploy. It does not link or rename projects, change domains, or alter production settings.

## Security
Never put provider tokens in browser code or client-exposed variables. OAuth exchange and provider API calls must run server-side. Production and destructive operations require explicit authorization and role checks.

## Read-only GitHub API
Netlify Functions expose:
- `/.netlify/functions/health`
- `/.netlify/functions/projects`

The projects endpoint queries only the three fixed public repositories listed in `server/project-registry.mjs`. It exposes a strict metadata allowlist and has no write operations. The dashboard reads this endpoint when served through Netlify.

Run `npm test` for registry allowlist and metadata-redaction tests, and `npm run check:functions` to validate function syntax.
