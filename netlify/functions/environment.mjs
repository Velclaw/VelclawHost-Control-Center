import { cookieValue, openSession, sameOrigin, SESSION_COOKIE } from "../../server/auth-session.mjs";
import { safeEnvironmentVariables, validateEnvironmentInput } from "../../server/environment-registry.mjs";

const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "vary": "cookie, origin"
};
const response = (statusCode, body, extra = {}) => ({
  statusCode,
  headers: { ...headers, ...extra },
  body: JSON.stringify(body)
});

function parseBody(event) {
  if (typeof event.body !== "string" || event.body.length > 12000) return null;
  try { return JSON.parse(event.body); } catch { return null; }
}

export default async (event) => {
  const method = event.httpMethod || "GET";
  if (!["GET", "POST", "PUT", "DELETE"].includes(method)) {
    return response(405, { error: "method_not_allowed" }, { allow: "GET, POST, PUT, DELETE" });
  }
  const session = openSession(cookieValue(event.headers?.cookie, SESSION_COOKIE));
  if (!session) return response(401, { error: "authentication_required" });
  if (session.user.role !== "admin") return response(403, { error: "admin_required" });
  if (method !== "GET" && !sameOrigin(event)) return response(403, { error: "same_origin_required" });

  const token = process.env.NETLIFY_AUTH_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  const accountId = process.env.NETLIFY_ACCOUNT_ID || "692718fdcab0b70659f1d03f";
  if (!token || !siteId || !accountId || !/^[A-Za-z0-9-]{1,100}$/.test(accountId)) {
    return response(503, { error: "netlify_provider_not_configured" });
  }

  const base = `https://api.netlify.com/api/v1/accounts/${encodeURIComponent(accountId)}/env`;
  const url = (key = "") => `${base}${key ? `/${encodeURIComponent(key)}` : ""}?site_id=${encodeURIComponent(siteId)}`;
  const request = async (path, options = {}) => fetch(path, {
    ...options,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "user-agent": "VelclawHost-Control-Center",
      ...options.headers
    },
    signal: AbortSignal.timeout(8000)
  });

  const isPreviewOnly = async (key) => {
    const upstream = await request(url(key));
    if (upstream.status === 404) return { exists: false, previewOnly: false };
    if (!upstream.ok) throw new Error("provider_unavailable");
    const item = await upstream.json();
    const values = Array.isArray(item?.values) ? item.values : [];
    return {
      exists: true,
      previewOnly: values.length > 0 && values.every((value) => value?.context === "deploy-preview")
    };
  };

  try {
    if (method === "GET") {
      const upstream = await request(url());
      if (!upstream.ok) return response(upstream.status === 401 || upstream.status === 403 ? 502 : 503, { error: "netlify_provider_unavailable" });
      return response(200, { variables: safeEnvironmentVariables(await upstream.json()), readOnlyValues: true, writeContext: "deploy-preview" });
    }

    if (method === "DELETE") {
      const input = parseBody(event);
      if (!input || typeof input.key !== "string" || !/^[A-Za-z_][A-Za-z0-9_]{0,99}$/.test(input.key)) {
        return response(400, { error: "invalid_environment_key" });
      }
      const current = await isPreviewOnly(input.key);
      if (!current.exists) return response(404, { error: "environment_variable_not_found" });
      if (!current.previewOnly) return response(409, { error: "staging_only_variable_required" });
      const upstream = await request(url(input.key), { method: "DELETE" });
      if (!upstream.ok) return response(upstream.status === 404 ? 404 : 502, { error: "environment_delete_failed" });
      return response(200, { deleted: true, key: input.key, context: "deploy-preview" });
    }

    const input = validateEnvironmentInput(parseBody(event));
    if (!input) return response(400, { error: "invalid_environment_input" });
    if (input.context !== "deploy-preview") return response(403, { error: "staging_context_only" });

    if (method === "PUT") {
      const current = await isPreviewOnly(input.key);
      if (!current.exists) return response(404, { error: "environment_variable_not_found" });
      if (!current.previewOnly) return response(409, { error: "staging_only_variable_required" });
    }

    const payload = {
      key: input.key,
      scopes: ["functions"],
      values: [{ context: "deploy-preview", value: input.value }],
      is_secret: true
    };
    const target = method === "POST" ? url() : url(input.key);
    const upstream = await request(target, {
      method,
      body: JSON.stringify(payload)
    });
    if (!upstream.ok) return response(upstream.status === 409 ? 409 : 502, { error: "environment_save_failed" });
    let saved = null;
    try { saved = await upstream.json(); } catch {}
    return response(method === "POST" ? 201 : 200, {
      saved: true,
      variable: safeEnvironmentVariables(saved ? [saved] : [])[0] ?? { key: input.key, scopes: ["functions"], contexts: ["deploy-preview"], isSecret: true, updatedAt: null }
    });
  } catch {
    return response(503, { error: "netlify_provider_unavailable" });
  }
};
