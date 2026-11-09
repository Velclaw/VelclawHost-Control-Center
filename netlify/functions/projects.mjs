import { PROJECTS, safeRepositoryMetadata } from "../../server/project-registry.mjs";

const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=60, stale-while-revalidate=120",
  "x-content-type-options": "nosniff"
};

export default async () => {
  const projects = await Promise.all(PROJECTS.map(async (project) => {
    try {
      const response = await fetch(`https://api.github.com/repos/${project.repository}`, {
        headers: {
          accept: "application/vnd.github+json",
          "x-github-api-version": "2022-11-28",
          "user-agent": "VelclawHost-Control-Center"
        },
        signal: AbortSignal.timeout(6000)
      });

      if (!response.ok) {
        return {
          ...project,
          metadata: {
            repository: project.repository,
            connection: response.status === 404 ? "not_found" : response.status === 403 ? "rate_limited_or_forbidden" : "unavailable"
          }
        };
      }

      return {
        ...project,
        metadata: safeRepositoryMetadata(project.repository, await response.json())
      };
    } catch {
      return {
        ...project,
        metadata: { repository: project.repository, connection: "unavailable" }
      };
    }
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      projects,
      readOnly: true,
      source: "GitHub public repository API",
      generatedAt: new Date().toISOString()
    })
  };
};
