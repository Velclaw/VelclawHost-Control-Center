import { sameOrigin, OAUTH_STATE_COOKIE, SESSION_COOKIE } from "../../server/auth-session.mjs";

export default async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { allow: "POST", "cache-control": "no-store" }, body: "" };
  }
  if (!sameOrigin(event)) {
    return { statusCode: 403, headers: { "cache-control": "no-store" }, body: JSON.stringify({ error: "origin_forbidden" }) };
  }
  return {
    statusCode: 204,
    multiValueHeaders: {
      "set-cookie": [
        `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
        `${OAUTH_STATE_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
      ]
    },
    headers: { "cache-control": "no-store" },
    body: ""
  };
};
