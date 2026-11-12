import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { runInNewContext } from "node:vm";

const workflow = readFileSync(new URL("../.github/workflows/netlify-preview.yml", import.meta.url), "utf8");
const repositoryRoot = new URL("../", import.meta.url);

// Read the named step from the actual workflow so the tests exercise its script.
function step(name) {
  const marker = `      - name: ${name}\n`;
  const start = workflow.indexOf(marker);
  assert.notEqual(start, -1, `Missing workflow step: ${name}`);
  const end = workflow.indexOf("\n      - name:", start + marker.length);
  return workflow.slice(start + marker.length, end === -1 ? undefined : end);
}

function condition(source) {
  const match = source.match(/^\s+if: (.+)$/m);
  assert.ok(match, "Expected a workflow condition");
  return match[1];
}

function evaluate(expression, context) {
  // These guards use the equality/boolean subset shared by Actions and JS.
  assert.match(expression, /^[\w.\s=!&|'()]+$/);
  return runInNewContext(expression, context, { timeout: 100 });
}

const deployStep = step("Create Netlify draft deploy");
const skipStep = step("Skip deploy when Netlify secrets are not configured");
const scriptMatch = deployStep.match(/        run: \|\n([\s\S]+)/);
assert.ok(scriptMatch, "Expected a literal deploy script");
const deployScript = scriptMatch[1].replace(/^          /gm, "");

function runDeploy(t, response, cliStatus = 0) {
  const directory = mkdtempSync(join(tmpdir(), "netlify-preview-test-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const trace = join(directory, "arguments");
  // A shell function intercepts npx; no package install or network is possible.
  const fakeCli = `npx() {
    printf '%s\\n' "$@" > "$TEST_TRACE"
    printf '%s' "$TEST_RESPONSE"
    return "$TEST_CLI_STATUS"
  }
`;
  const script = deployScript.replaceAll("${{ github.event.pull_request.number }}", "42");
  assert.equal(script.includes("${{"), false, "Unexpected unevaluated Actions expression");
  const result = spawnSync("bash", ["--noprofile", "--norc"], {
    input: fakeCli + script,
    encoding: "utf8",
    timeout: 5000,
    env: {
      PATH: process.env.PATH,
      NETLIFY_AUTH_TOKEN: "synthetic-test-token",
      NETLIFY_SITE_ID: "synthetic-site-id",
      TEST_TRACE: trace,
      TEST_RESPONSE: response,
      TEST_CLI_STATUS: String(cliStatus)
    }
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  return { ...result, args: readFileSync(trace, "utf8").trimEnd().split("\n") };
}

test("preview runs only for the supported pull request events targeting main", () => {
  const trigger = workflow.match(/^on:\n([\s\S]*?)(?=^\S)/m)?.[1];
  assert.ok(trigger);
  assert.match(trigger, /^  pull_request:$/m);
  assert.match(trigger, /^    branches: \[main\]$/m);
  assert.match(trigger, /^    types: \[opened, synchronize, reopened, ready_for_review\]$/m);
  assert.equal(trigger.includes("pull_request_target"), false);
  assert.deepEqual([...trigger.matchAll(/^  ([\w]+):/gm)].map(match => match[1]), ["pull_request"]);
  assert.match(workflow, /^permissions:\n  contents: read\n/m);
  assert.ok(workflow.includes("uses: actions/checkout@v4\\n        with:\\n          persist-credentials: false"));
  assert.match(workflow, /^concurrency:\n  group: netlify-preview-pr-\$\{\{ github.event.pull_request.number \}\}\n  cancel-in-progress: true$/m);
});

test("fork pull requests cannot run the preview job", () => {
  const guard = condition(workflow.slice(workflow.indexOf("jobs:"), workflow.indexOf("    runs-on:")));
  for (const [headRepository, allowed] of [["Velclaw/VelclawHost-Control-Center", true], ["attacker/VelclawHost-Control-Center", false]]) {
    assert.equal(evaluate(guard, {
      github: {
        repository: "Velclaw/VelclawHost-Control-Center",
        event: { pull_request: { head: { repo: { full_name: headRepository } } } }
      }
    }), allowed);
  }
});

test("deploy requires both secrets and skip notice covers every missing-secret case", () => {
  for (const source of [skipStep, deployStep]) {
    assert.match(source, /^        env:\n          NETLIFY_AUTH_TOKEN: \$\{\{ secrets.NETLIFY_AUTH_TOKEN \}\}\n          NETLIFY_SITE_ID: \$\{\{ secrets.NETLIFY_SITE_ID \}\}$/m);
  }
  assert.doesNotMatch(workflow, /^  env:/m);
  for (const token of ["", "synthetic-token"]) {
    for (const site of ["", "synthetic-site"]) {
      const context = { env: { NETLIFY_AUTH_TOKEN: token, NETLIFY_SITE_ID: site } };
      const configured = Boolean(token && site);
      assert.equal(evaluate(condition(deployStep), context), configured);
      assert.equal(evaluate(condition(skipStep), context), !configured);
    }
  }
  assert.match(skipStep, /::notice::/);
  assert.equal(skipStep.includes("npx"), false);
});

test("dependencies and build run before the draft upload", () => {
  assert.match(step("Install dependencies"), /run: npm install/);
  assert.match(step("Build preview"), /run: npm run build/);
  assert.ok(workflow.indexOf("name: Install dependencies") < workflow.indexOf("name: Build preview"));
  assert.ok(workflow.indexOf("name: Build preview") < workflow.indexOf("name: Create Netlify draft deploy"));
  assert.match(deployStep, /^        shell: bash$/m);
});

for (const [name, response, url] of [
  ["prefers deploy_url", { deploy_url: "https://draft.example.test", deploy_ssl_url: "https://ssl.example.test" }, "https://draft.example.test"],
  ["falls back to deploy_ssl_url", { deploy_ssl_url: "https://ssl.example.test" }, "https://ssl.example.test"],
  ["falls back when deploy_url is empty", { deploy_url: "", deploy_ssl_url: "https://ssl.example.test" }, "https://ssl.example.test"]
]) {
  test(`draft upload ${name}`, t => {
    const result = runDeploy(t, JSON.stringify(response));
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.args, ["--yes", "netlify-cli@23.11.0", "deploy", "--dir=dist", "--no-build", "--site=synthetic-site-id", "--message=Preview for PR #42", "--json"]);
    assert.ok(result.stdout.includes(`Netlify draft preview: ${url}\n`));
    assert.equal(result.stdout.includes("synthetic-test-token"), false);
  });
}

for (const response of ["{}", '{"deploy_url":"","deploy_ssl_url":""}', '{"deploy_url":null}', '{"url":"https://production.example.test"}']) {
  test(`missing preview URL rejects CLI response ${response}`, t => {
    const result = runDeploy(t, response);
    assert.equal(result.status, 1);
    assert.ok(result.stdout.includes("::error::Netlify CLI did not return a preview URL."));
    assert.equal(result.stdout.includes("Netlify draft preview:"), false);
  });
}

test("invalid CLI JSON fails without reporting a successful deploy", t => {
  const result = runDeploy(t, "not JSON");
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout.includes("Netlify draft preview:"), false);
});

test("CLI failure propagates even if it prints a valid preview URL", t => {
  const result = runDeploy(t, '{"deploy_url":"https://draft.example.test"}', 17);
  assert.equal(result.status, 17);
  assert.equal(result.stdout.includes("Netlify draft preview:"), false);
});

test("git ignores local Netlify state, secrets and artifacts while allowing the env example", () => {
  const paths = [".netlify/state.json", ".netlify/config.json", ".env", ".env.local", ".env.production", "node_modules/package/index.js", "dist/index.html", ".cache/data", ".vite/cache", "build.log", ".env.example", "server/netlify-preview.test.mjs"];
  const result = spawnSync("git", ["-c", "core.excludesFile=/dev/null", "check-ignore", "--no-index", "--stdin"], {
    cwd: repositoryRoot,
    input: paths.join("\n") + "\n",
    encoding: "utf8",
    timeout: 5000
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trimEnd().split("\n"), paths.slice(0, -2));
});
