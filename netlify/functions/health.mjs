export const handler = async () => ({
  statusCode: 200,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  },
  body: JSON.stringify({
    ok: true,
    service: "velclawhost-control-center",
    mode: "staging",
    capabilities: {
      githubReadOnly: true,
      hostingDeployments: false,
      productionActions: false
    }
  })
});
