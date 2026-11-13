import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(new URL("../.github/workflows/netlify-preview.yml", import.meta.url), "utf8");
const readStep = (name) => {
  const marker = `      - name: ${name}\n`;
  const start = workflow.indexOf(marker);
  assert.notEqual(start, -1, `Missing step: ${name}`);
  const end = workflow.indexOf("\n      - name:", start + marker.length);
  return workflow.slice(start + marker.length, end < 0 ? undefined : end);
};

test("Preview runs only for same-repository pull requests targeting main", () => {
  assert.match(workflow, /^on:\n  pull_request:\n    branches: \[main\]/m);
  assert.match(workflow, /^    if: github\.event\.pull_request\.head\.repo\.full_name == github\.repository$/m);
  assert.match(workflow, /^permissions:\n  contents: read$/m);
  assert.match(workflow, /^concurrency:\n  group: netlify-preview-pr-\$\{\{ github\.event\.pull_request\.number \}\}\n  cancel-in-progress: true$/m);
});

test("Netlify credentials are not exposed to install or build steps", () => {
  const install = readStep("Install dependencies");
  const build = readStep("Build preview");
  assert.doesNotMatch(install, /NETLIFY_AUTH_TOKEN|NETLIFY_SITE_ID|secrets\./);
  assert.doesNotMatch(build, /NETLIFY_AUTH_TOKEN|NETLIFY_SITE_ID|secrets\./);
  assert.doesNotMatch(workflow, /^  env:/m);
});

test("credential check requires both secrets and exports only a boolean output", () => {
  const check = readStep("Check Netlify credentials");
  assert.match(check, /^        id: netlify-credentials$/m);
  assert.match(check, /NETLIFY_AUTH_TOKEN: \$\{\{ secrets\.NETLIFY_AUTH_TOKEN \}\}/);
  assert.match(check, /NETLIFY_SITE_ID: \$\{\{ secrets\.NETLIFY_SITE_ID \}\}/);
  assert.match(check, /\[\[ -n "\$NETLIFY_AUTH_TOKEN" && -n "\$NETLIFY_SITE_ID" \]\]/);
  assert.match(check, /configured=true/);
  assert.match(check, /configured=false/);
  assert.doesNotMatch(check, /npx|netlify-cli/);
});

test("draft deploy runs only after successful credential check and never promotes to production", () => {
  const deploy = readStep("Create Netlify draft deploy");
  assert.match(deploy, /^        if: steps\.netlify-credentials\.outputs\.configured == 'true'$/m);
  assert.match(deploy, /NETLIFY_AUTH_TOKEN: \$\{\{ secrets\.NETLIFY_AUTH_TOKEN \}\}/);
  assert.match(deploy, /NETLIFY_SITE_ID: \$\{\{ secrets\.NETLIFY_SITE_ID \}\}/);
  assert.match(deploy, /netlify-cli@23\.11\.0 deploy/);
  assert.match(deploy, /--dir=dist/);
  assert.match(deploy, /--site="\$NETLIFY_SITE_ID"/);
  assert.doesNotMatch(deploy, /--prod|--alias|--force/);
});

test("workflow validates the returned draft URL and propagates failure", () => {
  const deploy = readStep("Create Netlify draft deploy");
  assert.match(deploy, /result\.deploy_url \|\| result\.deploy_ssl_url \|\| ""/);
  assert.match(deploy, /if \[ -z "\$PREVIEW_URL" \]; then/);
  assert.match(deploy, /::error::Netlify CLI did not return a preview URL/);
  assert.match(deploy, /set -euo pipefail/);
});
