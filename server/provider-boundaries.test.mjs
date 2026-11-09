import test from "node:test";
import assert from "node:assert/strict";
import { safeEnvironmentVariable, safeEnvironmentVariables, validateEnvironmentInput } from "./environment-registry.mjs";
import { safeDeployment, safeDeployments } from "./deployment-registry.mjs";

test("environment writes accept only deploy-preview context", () => {
  assert.deepEqual(validateEnvironmentInput({ key: "PREVIEW_KEY", value: "secret-value", context: "deploy-preview" }), {
    key: "PREVIEW_KEY", value: "secret-value", context: "deploy-preview", contextParameter: undefined
  });
  for (const context of ["all", "production", "branch", "dev", "deploy-preview-production"]) {
    assert.equal(validateEnvironmentInput({ key: "PREVIEW_KEY", value: "x", context }), null);
  }
});

test("environment input rejects malformed keys and oversized or empty values", () => {
  assert.equal(validateEnvironmentInput({ key: "BAD-KEY", value: "x", context: "deploy-preview" }), null);
  assert.equal(validateEnvironmentInput({ key: "OK", value: "", context: "deploy-preview" }), null);
  assert.equal(validateEnvironmentInput({ key: "OK", value: "x".repeat(8193), context: "deploy-preview" }), null);
  assert.equal(validateEnvironmentInput(null), null);
});

test("environment response never exposes values and reports only allowed metadata", () => {
  const result = safeEnvironmentVariable({
    key: "SESSION_SECRET",
    scopes: ["functions", "unknown"],
    values: [{ context: "deploy-preview", value: "must-not-leak" }, { context: "production", value: "also-secret" }],
    is_secret: true,
    updated_at: "2026-11-09T00:00:00Z"
  });
  assert.deepEqual(result, {
    key: "SESSION_SECRET", scopes: ["functions"], contexts: ["deploy-preview"], isSecret: true,
    updatedAt: "2026-11-09T00:00:00Z"
  });
  assert.equal(JSON.stringify(result).includes("must-not-leak"), false);
  assert.equal(JSON.stringify(safeEnvironmentVariables([{ key: "INVALID KEY", values: [] }])).includes("INVALID"), false);
});

test("deployment sanitizer accepts only HTTPS Netlify URLs and allowlisted fields", () => {
  const result = safeDeployment({
    id: "deploy-123", title: "Preview", state: "ready", context: "deploy-preview",
    branch: "feature/test", commit_ref: "1234567890abcdef",
    deploy_ssl_url: "https://deploy-123--example.netlify.app/",
    error_message: "", access_token: "must-not-leak"
  });
  assert.equal(result.url, "https://deploy-123--example.netlify.app/");
  assert.equal(result.commitRef, "1234567890ab");
  assert.equal(JSON.stringify(result).includes("must-not-leak"), false);
  assert.equal(safeDeployment({ id: "bad", deploy_ssl_url: "http://example.netlify.app" }).url, null);
  assert.equal(safeDeployment({ id: "bad", deploy_ssl_url: "https://example.com" }).url, null);
});

test("deployment collections reject malformed records and cap the result set", () => {
  assert.equal(safeDeployments([{ id: "valid-1" }, { id: "invalid id" }]).length, 1);
  assert.equal(safeDeployments(Array.from({ length: 25 }, (_, i) => ({ id: `deploy-${i}` }))).length, 20);
});
