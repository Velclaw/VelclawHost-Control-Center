import { cookieValue, openSession, SESSION_COOKIE } from "../../server/auth-session.mjs";
import { safeDeployments } from "../../server/deployment-registry.mjs";

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer"
  },
  body: JSON.stringify(body)
});

export default async (event) => {
  if (event.httpMethod !== "GET") {
    return { ...response(405, { error: "method_not_allowed" }), headers: { ...response(405, {}).headers, allow: "GET" } };
  }

  const session = openSession(cookieValue(event.headers?.cookie, SESSION_COOKIE));
  if (!session) return response(401, { error: "authentication_required" });
  if (session.user.role !== "admin") return response(403, { error: "admin_required" });

  const token = process.env.NETLIFY_AUTH_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID || process.env.SITE_ID;
  if (!token || !siteId) return response(503, { error: "netlify_provider_not_configured" });

  try {
    const upstream = await fetch(`https://api.netlify.com/api/v1/sites/${encodeURIComponent(siteId)}/deploys?per_page=20`, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
        "user-agent": "VelclawHost-Control-Center"
      },
      signal: AbortSignal.timeout(8000)
    });
    if (!upstream.ok) {
      return response(upstream.status === 401 || upstream.status === 403 ? 502 : 503, {
        error: "netlify_provider_unavailable"
      });
    }
    const deployments = safeDeployments(await upstream.json());
    return response(200, {
      deployments,
      count: deployments.length,
      readOnly: true,
      source: "Netlify API",
      generatedAt: new Date().toISOString()
    });
  } catch {
    return response(503, { error: "netlify_provider_unavailable" });
  }
};
