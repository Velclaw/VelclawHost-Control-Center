import test from "node:test";
import assert from "node:assert/strict";
import { safeEnvironmentVariables, validateEnvironmentInput } from "./environment-registry.mjs";

test("environment metadata never returns secret values", () => {
  const result = safeEnvironmentVariables([{
    key: "GITHUB_OAUTH_CLIENT_SECRET",
    scopes: ["functions", "unknown"],
    is_secret: true,
    values: [{ context: "all", value: "do-not-return-this" }],
    updated_at: "2026-11-09T00:00:00Z"
  }]);
  assert.equal(result.length, 1);
  assert.equal(result[0].key, "GITHUB_OAUTH_CLIENT_SECRET");
  assert.deepEqual(result[0].scopes, ["functions"]);
  assert.deepEqual(result[0].contexts, ["all"]);
  assert.equal(JSON.stringify(result).includes("do-not-return-this"), false);
});

test("invalid keys and malformed provider records are discarded", () => {
  assert.deepEqual(safeEnvironmentVariables([{ key: "bad key" }, null, { key: "OK_NAME" }]).map(x => x.key), ["OK_NAME"]);
});

test("input validation constrains keys, values, contexts and branch names", () => {
  assert.equal(validateEnvironmentInput({ key: "API_TOKEN", value: "secret" }).context, "all");
  assert.equal(validateEnvironmentInput({ key: "API TOKEN", value: "secret" }), null);
  assert.equal(validateEnvironmentInput({ key: "API_TOKEN", value: "" }), null);
  assert.equal(validateEnvironmentInput({ key: "API_TOKEN", value: "secret", context: "unknown" }), null);
  assert.equal(validateEnvironmentInput({ key: "API_TOKEN", value: "secret", context: "branch", contextParameter: "../main" }), null);
  assert.equal(validateEnvironmentInput({ key: "API_TOKEN", value: "secret", context: "branch", contextParameter: "staging" }).contextParameter, "staging");
});
