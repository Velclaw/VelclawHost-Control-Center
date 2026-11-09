# Netlify Functions

## Endpoints

- `/.netlify/functions/health` — service health and explicit capability flags.
- `/.netlify/functions/projects` — read-only metadata for the fixed public repository allowlist.

## Security boundary

The projects endpoint cannot accept arbitrary owner/repository names and cannot mutate GitHub. It reads only public GitHub repository metadata and returns a strict field allowlist. No GitHub token or provider secret is required or exposed.

Hosting-provider OAuth, deployment mutations, domains, environment variables, user sessions, and audit-log writes are intentionally not implemented in this phase.
