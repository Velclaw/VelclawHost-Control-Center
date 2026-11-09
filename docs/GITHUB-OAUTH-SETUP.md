# GitHub OAuth setup (staging first)

This repository implements GitHub OAuth login and an encrypted, stateless server-side session. The GitHub access token is used only to read the authenticated profile during callback and is discarded; it is never returned to the browser or stored in the session.

## 1. Create a GitHub OAuth App

Open https://github.com/settings/developers and create an OAuth App.

- Application name: VelclawHost Control Center (Staging)
- Homepage URL: the exact Netlify Preview URL being tested
- Authorization callback URL: the exact URL ending in `/.netlify/functions/auth-callback`

GitHub OAuth Apps accept one callback URL. For a stable staging callback, use a stable staging hostname before creating the OAuth App. Do not use a temporary deploy hash as a permanent callback.

## 2. Configure Netlify environment variables

Set these in the Netlify site's environment variable settings, scoped to Deploy Previews/branch deploys where possible:

- `GITHUB_OAUTH_CLIENT_ID`: OAuth App client ID
- `GITHUB_OAUTH_CLIENT_SECRET`: OAuth App client secret
- `GITHUB_OAUTH_CALLBACK_URL`: exact registered callback URL
- `SESSION_SECRET`: cryptographically random secret with at least 32 characters
- `ADMIN_GITHUB_USERS`: comma-separated GitHub usernames allowed to receive the admin role, e.g. `zskbot`
- `SITE_URL`: canonical staging URL used after callback

Never add these values to Git, Vite `VITE_*` variables, frontend code, screenshots, or chat messages. Do not reuse production secrets in Preview.

## 3. Role model and current boundaries

- Usernames in `ADMIN_GITHUB_USERS` receive the `admin` role.
- Other authenticated GitHub users receive `member`.
- The session is encrypted with AES-256-GCM, stored in an HttpOnly, Secure, SameSite=Lax cookie, and expires after 12 hours.
- OAuth state is random, short-lived and compared in constant time.
- Logout is POST-only and validates the request Origin.
- This first phase establishes identity and role claims only. Existing project/domain endpoints remain read-only; privileged write actions are not enabled by this change.
- A future database-backed authorization/audit layer is required before enabling deploy, environment, domain, or server mutations.

## 4. Validation

Run `npm test`, `npm run check:functions`, and `npm run build`.
