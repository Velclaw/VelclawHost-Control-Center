import { randomBytes } from "node:crypto";
import { isOAuthConfigured, OAUTH_STATE_COOKIE } from "../../server/auth-session.mjs";

const secureCookie = (value) => `${OAUTH_STATE_COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`;

export const handler = async () => {
  if (!isOAuthConfigured()) {
    return {
      statusCode: 503,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      body: JSON.stringify({ error: "oauth_not_configured", message: "GitHub OAuth server settings are not configured." })
    };
  }

  const state = randomBytes(32).toString("base64url");
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", process.env.GITHUB_OAUTH_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", process.env.GITHUB_OAUTH_CALLBACK_URL);
  authorize.searchParams.set("scope", "read:user");
  authorize.searchParams.set("state", state);

  return {
    statusCode: 302,
    headers: {
      location: authorize.toString(),
      "set-cookie": secureCookie(state),
      "cache-control": "no-store",
      "referrer-policy": "no-referrer"
    },
    body: ""
  };
};
