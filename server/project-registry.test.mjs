import test from "node:test";
import assert from "node:assert/strict";
import { PROJECTS, isAllowedRepository, safeRepositoryMetadata } from "./project-registry.mjs";

test("registry contains only the three approved OCode.js repositories", () => {
  assert.equal(PROJECTS.length, 3);
  assert.equal(isAllowedRepository("OCodejs/ocodejs.github.io"), true);
  assert.equal(isAllowedRepository("zskbot/ask-ocodejs"), true);
  assert.equal(isAllowedRepository("OCodejs/docs-ocodejs"), true);
  assert.equal(isAllowedRepository("attacker/other-repo"), false);
});

test("safe metadata returns only explicitly selected public fields", () => {
  const result = safeRepositoryMetadata("OCodejs/docs-ocodejs", {
    private: false,
    archived: false,
    default_branch: "main",
    description: "Documentation",
    updated_at: "2026-11-09T00:00:00Z",
    html_url: "https://github.com/OCodejs/docs-ocodejs",
    secrets: { token: "must-not-leak" }
  });

  assert.deepEqual(result, {
    repository: "OCodejs/docs-ocodejs",
    connection: "connected",
    isPublic: true,
    archived: false,
    defaultBranch: "main",
    description: "Documentation",
    updatedAt: "2026-11-09T00:00:00Z",
    url: "https://github.com/OCodejs/docs-ocodejs"
  });
  assert.equal(JSON.stringify(result).includes("must-not-leak"), false);
});

test("missing provider metadata is reported as unavailable", () => {
  assert.deepEqual(safeRepositoryMetadata("OCodejs/docs-ocodejs", null), {
    repository: "OCodejs/docs-ocodejs",
    connection: "unavailable"
  });
});
