# Netlify Environment Manager (Preview)

The Environment page is an admin-only control surface for site-scoped Netlify environment variables.

## Required Netlify Function variables

Configure this directly in Netlify Project configuration > Environment variables. Never commit it or send it through chat:

- `NETLIFY_AUTH_TOKEN`: a Netlify personal access token with the minimum permissions needed to manage environment variables for this site. This is the only required provider variable. Netlify supplies `SITE_ID` at runtime, and the verified account ID is a code default; `NETLIFY_SITE_ID` and `NETLIFY_ACCOUNT_ID` are optional overrides.

All writes are restricted to the `deploy-preview` context. The backend rejects `all`, `production`, development, and branch contexts. It also refuses to update or delete a variable unless every existing value is explicitly scoped to `deploy-preview`.
- Existing GitHub OAuth/session variables: `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`, `GITHUB_OAUTH_CALLBACK_URL`, `SESSION_SECRET`, `ADMIN_GITHUB_USERS`, and `SITE_URL`.

The environment manager returns metadata only. Secret values are never included in GET responses or written to browser storage. New and updated values are always marked secret and receive the Functions scope only. The UI requires a confirmation before overwriting or deleting an existing key. Deletion is permanent.

## Supported operations

- GET: list key names, scopes, contexts and update timestamps.
- POST: create a site-scoped variable.
- PUT: replace the values for an existing key.
- DELETE: delete a key and all its contextual values.

Every write requires an authenticated Admin session and a same-origin request. API errors are normalized; upstream response bodies and credentials are not returned to the browser.

## Apply changes

Netlify environment variable changes require a new build and deploy before they affect the deployed application. This PR does not trigger a Production deploy. Use only a reviewed Preview/Staging deploy until the OAuth callback and runtime variables are verified.

## Security notes

- Never paste tokens, OAuth secrets, or session secrets into GitHub issues, pull request comments, source files, or ChatGPT messages.
- Configure secret values directly in the Netlify UI or a secure provider integration.
- Keep the Netlify token scoped to the intended team/site and revoke it if it is no longer required.
- The interface intentionally cannot reveal existing secret values.
