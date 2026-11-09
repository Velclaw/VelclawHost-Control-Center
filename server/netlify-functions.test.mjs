import test from "node:test";
import assert from "node:assert/strict";
import projectsHandler from "../netlify/functions/projects.mjs";
import healthHandler from "../netlify/functions/health.mjs";

test("health endpoint identifies staging and keeps production actions disabled", async () => {
  const response = await healthHandler();
  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(body.ok, true);
  assert.equal(body.mode, "staging");
  assert.equal(body.capabilities.productionActions, false);
  assert.equal(body.capabilities.hostingDeployments, false);
});

test("projects endpoint only reads the fixed public repository allowlist", async () => {
  const originalFetch = globalThis.fetch;
  const requested = [];
  globalThis.fetch = async (url, options) => {
    requested.push({ url: String(url), headers: options.headers });
    const repository = String(url).split("/repos/")[1];
    return new Response(JSON.stringify({
      private: false,
      archived: false,
      default_branch: "main",
      description: "Public repository",
      updated_at: "2026-11-09T00:00:00Z",
      html_url: `https://github.com/${repository}`,
      token: "never-return-this"
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const response = await projectsHandler();
    const body = JSON.parse(response.body);
    assert.equal(response.statusCode, 200);
    assert.equal(body.readOnly, true);
    assert.equal(body.projects.length, 3);
    assert.equal(requested.length, 3);
    assert.ok(requested.every(item => item.url.startsWith("https://api.github.com/repos/")));
    assert.ok(requested.every(item => !("authorization" in item.headers)));
    assert.equal(JSON.stringify(body).includes("never-return-this"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
