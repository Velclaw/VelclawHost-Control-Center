import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const build = readFileSync(new URL("../.github/workflows/netlify-preview.yml", import.meta.url), "utf8");
const deploy = readFileSync(new URL("../.github/workflows/netlify-preview-deploy.yml", import.meta.url), "utf8");

test("PR workflow builds only and uploads a short-lived static artifact", () => {
  assert.match(build, /^on:\n  pull_request:\n    branches: \[main\]/m);
  assert.match(build, /^permissions:\n  contents: read$/m);
  assert.match(build, /uses: actions\/checkout@v4\n        with:\n          persist-credentials: false/);
  assert.match(build, /run: npm ci/);
  assert.match(build, /run: npm run build/);
  assert.match(build, /uses: actions\/upload-artifact@v4/);
  assert.match(build, /name: netlify-preview-dist/);
  assert.match(build, /path: dist\//);
  assert.match(build, /retention-days: 1/);
  assert.doesNotMatch(build, /secrets\.|NETLIFY_AUTH_TOKEN|NETLIFY_SITE_ID|netlify-cli|--prod/);
});

test("trusted deployment workflow runs only after successful same-repository PR builds targeting main", () => {
  assert.match(deploy, /^on:\n  workflow_run:\n    workflows: \["Netlify Preview Build"\]\n    types: \[completed\]/m);
  assert.match(deploy, /github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(deploy, /github\.event\.workflow_run\.event == 'pull_request'/);
  assert.match(deploy, /github\.event\.workflow_run\.head_repository\.full_name == github\.repository/);
  assert.match(deploy, /github\.event\.workflow_run\.pull_requests\[0\]\.base\.ref == 'main'/);
  assert.match(deploy, /uses: actions\/download-artifact@v4/);
  assert.match(deploy, /run-id: \$\{\{ github\.event\.workflow_run\.id \}\}/);
  assert.match(deploy, /name: netlify-preview-dist/);
  assert.doesNotMatch(deploy, /actions\/checkout|pull_request_target|--prod|--alias|--force/);
});

test("deployment secrets exist only in the trusted deploy step", () => {
  const deployStep = deploy.slice(deploy.indexOf("      - name: Create Netlify draft deploy"));
  assert.match(deployStep, /NETLIFY_AUTH_TOKEN: \$\{\{ secrets\.NETLIFY_AUTH_TOKEN \}\}/);
  assert.match(deployStep, /NETLIFY_SITE_ID: \$\{\{ secrets\.NETLIFY_SITE_ID \}\}/);
  assert.doesNotMatch(deploy.slice(0, deploy.indexOf("      - name: Create Netlify draft deploy")), /secrets\.|NETLIFY_AUTH_TOKEN|NETLIFY_SITE_ID/);
  assert.match(deployStep, /netlify-cli@23\.11\.0 deploy/);
  assert.match(deployStep, /--dir=dist/);
  assert.match(deployStep, /--site="\$NETLIFY_SITE_ID"/);
  assert.match(deployStep, /result\.deploy_url \|\| result\.deploy_ssl_url \|\| ""/);
  assert.doesNotMatch(deployStep, /--prod/);
});

test("missing credentials skip deployment without leaking secret values", () => {
  assert.match(deploy, /if: env\.NETLIFY_AUTH_TOKEN == '' \|\| env\.NETLIFY_SITE_ID == ''/);
  assert.match(deploy, /::notice::Preview build passed/);
  assert.match(deploy, /if: env\.NETLIFY_AUTH_TOKEN != '' && env\.NETLIFY_SITE_ID != ''/);
});
