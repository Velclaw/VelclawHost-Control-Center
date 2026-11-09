export const PROJECTS = Object.freeze([
  { id: "ocodejs-profile", name: "OCode.js Profile", repository: "OCodejs/ocodejs.github.io", purpose: "Profile and ecosystem portal" },
  { id: "ask-ocodejs", name: "Ask OCode.js", repository: "zskbot/ask-ocodejs", purpose: "AI assistant and workspace" },
  { id: "ocodejs-docs", name: "OCode.js Docs", repository: "OCodejs/docs-ocodejs", purpose: "Documentation and guides" }
]);

export function safeRepositoryMetadata(repository, payload) {
  if (!payload || typeof payload !== "object") {
    return { repository, connection: "unavailable" };
  }

  return {
    repository,
    connection: "connected",
    isPublic: payload.private === false,
    archived: payload.archived === true,
    defaultBranch: typeof payload.default_branch === "string" ? payload.default_branch : null,
    description: typeof payload.description === "string" ? payload.description : null,
    updatedAt: typeof payload.updated_at === "string" ? payload.updated_at : null,
    url: typeof payload.html_url === "string" ? payload.html_url : null
  };
}

export function isAllowedRepository(repository) {
  return PROJECTS.some((project) => project.repository === repository);
}
