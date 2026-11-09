const ALLOWED_SCOPES = new Set(["builds", "functions", "runtime", "post_processing"]);
const ALLOWED_CONTEXTS = new Set(["all", "dev", "branch-deploy", "deploy-preview", "production", "branch"]);

export function safeEnvironmentVariable(item) {
  if (!item || typeof item !== "object" || typeof item.key !== "string" ||
      !/^[A-Za-z_][A-Za-z0-9_]{0,99}$/.test(item.key)) return null;
  const scopes = Array.isArray(item.scopes)
    ? item.scopes.filter((scope) => ALLOWED_SCOPES.has(scope))
    : [];
  const contexts = Array.isArray(item.values)
    ? [...new Set(item.values.map((value) => value?.context).filter((context) => ALLOWED_CONTEXTS.has(context)))]
    : [];
  return {
    key: item.key,
    scopes,
    contexts,
    isSecret: item.is_secret !== false,
    updatedAt: typeof item.updated_at === "string" ? item.updated_at : null
  };
}

export function safeEnvironmentVariables(payload) {
  if (!Array.isArray(payload)) return [];
  return payload.map(safeEnvironmentVariable).filter(Boolean).slice(0, 200);
}

export function validateEnvironmentInput(input) {
  if (!input || typeof input !== "object" ||
      typeof input.key !== "string" ||
      !/^[A-Za-z_][A-Za-z0-9_]{0,99}$/.test(input.key) ||
      typeof input.value !== "string" ||
      input.value.length < 1 || input.value.length > 8192) return null;
  const context = input.context ?? "all";
  if (!ALLOWED_CONTEXTS.has(context)) return null;
  if (context === "branch") {
    if (typeof input.contextParameter !== "string" ||
        !/^[A-Za-z0-9._/-]{1,100}$/.test(input.contextParameter) ||
        input.contextParameter.includes("..")) return null;
  }
  return {
    key: input.key,
    value: input.value,
    context,
    contextParameter: context === "branch" ? input.contextParameter : undefined
  };
}
