import { getDomainInventory } from "../../server/domain-registry.mjs";

export default async () => ({
  statusCode: 200,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=300",
    "x-content-type-options": "nosniff"
  },
  body: JSON.stringify(getDomainInventory())
});
