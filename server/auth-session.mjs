import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE = "vh_session";
export const OAUTH_STATE_COOKIE = "vh_oauth_state";
export const SESSION_TTL_SECONDS = 60 * 60 * 12;
const b64url = (value) => Buffer.from(value).toString("base64url");

export function oauthCallbackUrl(env = process.env) {
  return env.CONTEXT === "deploy-preview"
    ? env.GITHUB_OAUTH_CALLBACK_URL_PREVIEW
    : env.GITHUB_OAUTH_CALLBACK_URL;
}

function sessionKey(secret = process.env.SESSION_SECRET) {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters");
  }
  return createHash("sha256").update(secret, "utf8").digest();
}

export function isOAuthConfigured(env = process.env) {
  return Boolean(
    env.GITHUB_OAUTH_CLIENT_ID &&
    env.GITHUB_OAUTH_CLIENT_SECRET &&
    oauthCallbackUrl(env) &&
    typeof env.SESSION_SECRET === "string" &&
    env.SESSION_SECRET.length >= 32
  );
}

export function sealSession(user, secret = process.env.SESSION_SECRET, now = Date.now()) {
  const key = sessionKey(secret);
  const iv = randomBytes(12);
  const payload = {
    user: {
      id: Number(user.id),
      login: String(user.login),
      name: typeof user.name === "string" ? user.name : null,
      avatarUrl: typeof user.avatarUrl === "string" ? user.avatarUrl : null,
      role: user.role === "admin" ? "admin" : "member"
    },
    exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS
  };
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return b64url(Buffer.concat([iv, cipher.getAuthTag(), encrypted]));
}

export function openSession(value, secret = process.env.SESSION_SECRET, now = Date.now()) {
  try {
    if (typeof value !== "string" || value.length > 4096) return null;
    const packed = Buffer.from(value, "base64url");
    if (packed.length < 29) return null;
    const iv = packed.subarray(0, 12);
    const tag = packed.subarray(12, 28);
    const encrypted = packed.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", sessionKey(secret), iv);
    decipher.setAuthTag(tag);
    const clear = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const payload = JSON.parse(clear.toString("utf8"));
    if (!payload || !Number.isFinite(payload.exp) || payload.exp <= Math.floor(now / 1000)) return null;
    const user = payload.user;
    if (!user || !Number.isSafeInteger(user.id) || !/^[a-zA-Z0-9-]{1,39}$/.test(user.login)) return null;
    if (!["admin", "member"].includes(user.role)) return null;
    return { user, expiresAt: payload.exp };
  } catch {
    return null;
  }
}

export function adminUsernames(value = process.env.ADMIN_GITHUB_USERS || "") {
  return new Set(value.split(",").map((name) => name.trim().toLowerCase()).filter(Boolean));
}

export function cookieValue(cookieHeader = "", name) {
  for (const part of String(cookieHeader).split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return null;
}

export function safeGitHubUser(payload, admins = adminUsernames()) {
  if (!payload || !Number.isSafeInteger(payload.id) || typeof payload.login !== "string" ||
      !/^[a-zA-Z0-9-]{1,39}$/.test(payload.login)) {
    throw new Error("GitHub returned an invalid user profile");
  }
  return {
    id: payload.id,
    login: payload.login,
    name: typeof payload.name === "string" ? payload.name.slice(0, 120) : null,
    avatarUrl: typeof payload.avatar_url === "string" && payload.avatar_url.startsWith("https://") ? payload.avatar_url : null,
    role: admins.has(payload.login.toLowerCase()) ? "admin" : "member"
  };
}

export function sameOrigin(event) {
  const origin = event?.headers?.origin;
  const host = event?.headers?.host;
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    const forwardedProto = event.headers["x-forwarded-proto"]?.split(",")[0]?.trim();
    const expectedProtocol = forwardedProto === "http" ? "http:" : "https:";
    return parsed.host.toLowerCase() === host.toLowerCase() && parsed.protocol === expectedProtocol;
  } catch {
    return false;
  }
}
