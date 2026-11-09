import test from "node:test";
import assert from "node:assert/strict";
import { safeDeployment, safeDeployments } from "./deployment-registry.mjs";

test("deployment serializer exposes only allowlisted metadata", () => {
  const result = safeDeployment({
    id: "deploy-123",
    title: "Preview for PR #9",
    state: "ready",
    context: "deploy-preview",
    branch: "feature/demo",
    commit_ref: "abcdef0123456789",
    created_at: "2026-11-09T00:00:00Z",
    deploy_ssl_url: "https://deploy-123--example.netlify.app",
    error_message: "private provider diagnostic",
    env: { SECRET: "never expose" },
    token: "must-not-leak"
  });
  assert.deepEqual(result, {
    id: "deploy-123",
    title: "Preview for PR #9",
    state: "ready",
    context: "deploy-preview",
    branch: "feature/demo",
    commitRef: "abcdef012345",
    createdAt: "2026-11-09T00:00:00Z",
    publishedAt: null,
    url: "https://deploy-123--example.netlify.app/",
    hasError: true
  });
  assert.equal(JSON.stringify(result).includes("private provider diagnostic"), false);
  assert.equal(JSON.stringify(result).includes("must-not-leak"), false);
});

test("unsafe URLs and malformed deployment objects are rejected", () => {
  assert.equal(safeDeployment({ id: "x", deploy_ssl_url: "http://evil.example" }).url, null);
  assert.equal(safeDeployment({ id: "x", deploy_ssl_url: "https://evil.example" }).url, null);
  assert.equal(safeDeployment({ id: "invalid id" }), null);
  assert.deepEqual(safeDeployments({ deployments: [] }), []);
});

test("deployment list is capped at twenty records", () => {
  const records = Array.from({ length: 30 }, (_, i) => ({ id: `deploy-${i}`, state: "ready" }));
  assert.equal(safeDeployments(records).length, 20);
});
