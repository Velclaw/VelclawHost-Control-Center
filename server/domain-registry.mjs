export const DOMAIN_INVENTORY_CHECKED_AT = "2026-11-09T22:10:00+07:00";

// Read-only snapshot retrieved from the connected Cloudflare account.
// DNS records are intentionally not modified by this registry.
export const DOMAINS = [
  { name: "huynhthuong.xyz", brand: "Personal", status: "active", dns: "apex A record points to Vercel", wildcard: false, assigned: ["apex"], note: "Personal domain; keep existing apex mapping." },
  { name: "ocodejs.dev", brand: "OCode.js", status: "initializing", dns: "apex, www and wildcard A records point to Vercel; CAA records present", wildcard: true, assigned: ["apex", "www", "*"], note: "Existing Vercel routing and wildcard are preserved." },
  { name: "ocodejs.io", brand: "OCode.js", status: "pending", dns: "wildcard CNAME and velclaw/www records point to Vercel", wildcard: true, assigned: ["*", "velclaw", "www"], note: "Existing Vercel routes and mail/security TXT records are preserved." },
  { name: "ocode.org", brand: "OCode", status: "pending", dns: "apex/www/wildcard A records and delegated NS records exist", wildcard: true, assigned: ["apex", "www", "*"], note: "Existing mixed DNS/NS configuration requires review; do not edit automatically." },
  { name: "velclaw.ai", brand: "Velclaw", status: "pending", dns: "www CNAME points to Vercel", wildcard: false, assigned: ["www"], note: "Apex mapping not confirmed; zone is pending." },
  { name: "velclaw.app", brand: "Velclaw", status: "active", dns: "apex, www, ocodejs, ask-ocodejs, auth, auth-host, chat, docs and host CNAME records exist", wildcard: false, assigned: ["apex", "www", "ocodejs", "ask-ocodejs", "auth", "auth-host", "chat", "docs", "host"], note: "Many live-looking project routes exist; no record may be overwritten." },
  { name: "velclaw.site", brand: "Velclaw", status: "active", dns: "apex/www CNAME to Vercel; mcp CNAME to Cloudflare gateway; mcp-origin proxied AAAA", wildcard: false, assigned: ["apex", "www", "mcp", "mcp-origin"], note: "Existing MCP routing must remain untouched." },
  { name: "velclaw.tech", brand: "Velclaw", status: "initializing", dns: "apex/www/wildcard A and AAAA records are proxied; CAA/TXT records exist", wildcard: true, assigned: ["apex", "www", "*"], note: "Wildcard and apex routing exist; do not repoint without identifying origin." },
  { name: "velcli.dev", brand: "VelCLI", status: "active", dns: "apex CNAME to velcli.onrender.com; www A record exists", wildcard: false, assigned: ["apex", "www"], note: "Existing Render origin must remain untouched." }
];

export function getDomainInventory() {
  return {
    checkedAt: DOMAIN_INVENTORY_CHECKED_AT,
    source: "Cloudflare zone and DNS record read-only snapshot",
    readOnly: true,
    domains: DOMAINS
  };
}
