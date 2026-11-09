# Netlify Environment Manager (Preview)

The Environment page is an admin-only control surface for site-scoped Netlify environment variables.

## Required Netlify Function variables

Configure these directly in Netlify Project configuration > Environment variables. Never commit them or send them through chat:

- `NETLIFY_AUTH_TOKEN`: a Netlify personal access token with the minimum permissions needed to manage environment variables for this site.
- `NETLIFY_SITE_ID`: optional override; Netlify Functions also provides the reserved `SITE_ID` variable at runtime.
- `NETLIFY_ACCOUNT_ID`: the Netlify team/account ID that owns the site.
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
