export function safeDeployment(payload) {
  if (!payload || typeof payload !== "object" ||
      typeof payload.id !== "string" ||
      !/^[a-zA-Z0-9-]{1,80}$/.test(payload.id)) return null;

  const rawUrl = payload.deploy_ssl_url || payload.ssl_url || payload.deploy_url || null;
  let url = null;
  if (typeof rawUrl === "string") {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol === "https:" && parsed.hostname.endsWith(".netlify.app")) url = parsed.toString();
    } catch {}
  }

  return {
    id: payload.id,
    title: typeof payload.title === "string" ? payload.title.slice(0, 160) : null,
    state: typeof payload.state === "string" ? payload.state.slice(0, 40) : "unknown",
    context: typeof payload.context === "string" ? payload.context.slice(0, 40) : null,
    branch: typeof payload.branch === "string" ? payload.branch.slice(0, 120) : null,
    commitRef: typeof payload.commit_ref === "string" ? payload.commit_ref.slice(0, 12) : null,
    createdAt: typeof payload.created_at === "string" ? payload.created_at : null,
    publishedAt: typeof payload.published_at === "string" ? payload.published_at : null,
    url,
    hasError: Boolean(payload.error_message)
  };
}

export function safeDeployments(payload) {
  if (!Array.isArray(payload)) return [];
  return payload.map(safeDeployment).filter(Boolean).slice(0, 20);
}
