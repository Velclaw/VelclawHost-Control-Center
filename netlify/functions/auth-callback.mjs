import { timingSafeEqual } from "node:crypto";
import { adminUsernames, cookieValue, isOAuthConfigured, OAUTH_STATE_COOKIE, safeGitHubUser, sealSession, SESSION_COOKIE } from "../../server/auth-session.mjs";

const clearState = `${OAUTH_STATE_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
const clearSession = `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
const sessionCookie = (value) => `${SESSION_COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=43200`;
const redirect = (location, cookies = [clearState]) => ({
  statusCode: 302,
  headers: { location, "cache-control": "no-store", "referrer-policy": "no-referrer" },
  multiValueHeaders: { "set-cookie": cookies },
  body: ""
});
const equal = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

export default async (event) => {
  const base = process.env.SITE_URL || "https://velclawhost-control-center.netlify.app";
  const fail = (reason) => redirect(new URL(`/?auth_error=${encodeURIComponent(reason)}`, base).toString(), [clearState, clearSession]);
  if (!isOAuthConfigured()) return fail("oauth_not_configured");

  const params = new URLSearchParams(event.rawQuery || "");
  const code = params.get("code");
  const state = params.get("state");
  const storedState = cookieValue(event.headers?.cookie, OAUTH_STATE_COOKIE);
  if (params.has("error") || !code || !equal(state, storedState)) return fail("oauth_state_invalid");

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json", "user-agent": "VelclawHost-Control-Center" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_OAUTH_CLIENT_ID,
        client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_OAUTH_CALLBACK_URL
      }),
      signal: AbortSignal.timeout(8000)
    });
    if (!tokenResponse.ok) return fail("oauth_exchange_failed");
    const tokenData = await tokenResponse.json();
    if (typeof tokenData.access_token !== "string" || tokenData.error) return fail("oauth_exchange_failed");

    const profileResponse = await fetch("https://api.github.com/user", {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${tokenData.access_token}`,
        "x-github-api-version": "2022-11-28",
        "user-agent": "VelclawHost-Control-Center"
      },
      signal: AbortSignal.timeout(8000)
    });
    if (!profileResponse.ok) return fail("github_profile_failed");
    const profile = safeGitHubUser(await profileResponse.json(), adminUsernames());
    const sealed = sealSession(profile);
    return redirect(new URL("/", base).toString(), [clearState, sessionCookie(sealed)]);
  } catch {
    return fail("oauth_callback_failed");
  }
};
