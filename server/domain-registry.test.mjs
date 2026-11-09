import test from "node:test";
import assert from "node:assert/strict";
import { DOMAINS, getDomainInventory } from "./domain-registry.mjs";

test("domain inventory contains unique normalized domains", () => {
  const names = DOMAINS.map((domain) => domain.name);
  assert.equal(new Set(names).size, names.length);
  for (const name of names) assert.match(name, /^[a-z0-9.-]+\.[a-z]{2,}$/);
});

test("inventory is read-only and includes all discovered zones", () => {
  const inventory = getDomainInventory();
  assert.equal(inventory.readOnly, true);
  assert.equal(inventory.domains.length, 9);
  assert.equal(inventory.domains.find((domain) => domain.name === "velclaw.app").assigned.includes("docs"), true);
  assert.equal(inventory.domains.find((domain) => domain.name === "velclaw.site").assigned.includes("mcp"), true);
  assert.equal(inventory.domains.find((domain) => domain.name === "velcli.dev").dns.includes("onrender.com"), true);
});

test("no domain is represented as automatically available", () => {
  for (const domain of DOMAINS) {
    assert.ok(domain.status);
    assert.ok(domain.note);
    assert.equal("available", domain.status);
  }
});
