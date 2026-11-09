import test from "node:test";
import assert from "node:assert/strict";
import { adminUsernames, cookieValue, isOAuthConfigured, oauthCallbackUrl, openSession, safeGitHubUser, sameOrigin, sealSession } from "./auth-session.mjs";

const secret = "test-session-secret-with-at-least-32-characters";

test("session payload is encrypted, readable and role constrained", () => {
  const value = sealSession({ id: 123, login: "zskbot", role: "admin" }, secret, 1_800_000_000_000);
  assert.equal(value.includes("zskbot"), false);
  assert.deepEqual(openSession(value, secret, 1_800_000_001_000)?.user, {
    id: 123, login: "zskbot", name: null, avatarUrl: null, role: "admin"
  });
  assert.equal(openSession(value, "a-different-session-secret-with-32-chars", 1_800_000_001_000), null);
});

test("expired and tampered sessions are rejected", () => {
  const now = 1_800_000_000_000;
  const value = sealSession({ id: 1, login: "member", role: "member" }, secret, now);
  assert.equal(openSession(value, secret, now + 13 * 60 * 60 * 1000), null);
  assert.equal(openSession(value.slice(0, -2) + "aa", secret, now), null);
});

test("OAuth callback URL is selected by Netlify context", () => {
  const env = {
    GITHUB_OAUTH_CALLBACK_URL: "https://production.example/.netlify/functions/auth-callback",
    GITHUB_OAUTH_CALLBACK_URL_PREVIEW: "https://deploy-preview-19--velclawhost-control-center.netlify.app/.netlify/functions/auth-callback"
  };
  assert.equal(oauthCallbackUrl({ ...env, CONTEXT: "deploy-preview" }), env.GITHUB_OAUTH_CALLBACK_URL_PREVIEW);
  assert.equal(oauthCallbackUrl({ ...env, CONTEXT: "production" }), env.GITHUB_OAUTH_CALLBACK_URL);
});

test("OAuth configuration requires context-specific callback and strong session secret", () => {
  const base = {
    GITHUB_OAUTH_CLIENT_ID: "id",
    GITHUB_OAUTH_CLIENT_SECRET: "secret",
    GITHUB_OAUTH_CALLBACK_URL: "https://example.net/callback",
    SESSION_SECRET: secret
  };
  assert.equal(isOAuthConfigured(base), true);
  assert.equal(isOAuthConfigured({ ...base, CONTEXT: "deploy-preview" }), false);
  assert.equal(isOAuthConfigured({ ...base, CONTEXT: "deploy-preview", GITHUB_OAUTH_CALLBACK_URL_PREVIEW: "https://preview.example/callback" }), true);
  assert.equal(isOAuthConfigured({ GITHUB_OAUTH_CLIENT_ID: "id" }), false);
});

test("admin allowlist is normalized and profile fields are allowlisted", () => {
  const admins = adminUsernames(" ZskBot,Other ");
  assert.equal(safeGitHubUser({ id: 5, login: "zskbot", name: "Z", avatar_url: "https://avatars.example/a", token: "no" }, admins).role, "admin");
  assert.equal(safeGitHubUser({ id: 6, login: "visitor", token: "no" }, admins).role, "member");
  assert.equal(JSON.stringify(safeGitHubUser({ id: 6, login: "visitor", token: "no" }, admins)).includes("token"), false);
});

test("cookie parser handles multiple cookies", () => {
  assert.equal(cookieValue("a=1; vh_session=abc123; c=3", "vh_session"), "abc123");
  assert.equal(cookieValue("a=1", "vh_session"), null);
});

test("logout origin check rejects missing or foreign origins", () => {
  assert.equal(sameOrigin({ headers: { origin: "https://app.example", host: "app.example", "x-forwarded-proto": "https" } }), true);
  assert.equal(sameOrigin({ headers: { origin: "https://evil.example", host: "app.example", "x-forwarded-proto": "https" } }), false);
  assert.equal(sameOrigin({ headers: { host: "app.example" } }), false);
});
