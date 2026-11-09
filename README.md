# VelclawHost Control Center

Staging-first control plane for repositories and hosting deployments.

## Included
- Responsive dark operations dashboard.
- Initial registry for OCode.js Profile, Ask OCode.js and OCode.js Docs.
- Vite + React static frontend and Netlify build configuration.
- CI build workflow.

## Current implementation boundary
This is the frontend foundation only. GitHub OAuth, Netlify OAuth/API integration, deployment actions, environment-variable management, domain operations, audit logs and server provisioning are not implemented yet. The UI deliberately labels integrations as not connected and does not fabricate deployment data.

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
