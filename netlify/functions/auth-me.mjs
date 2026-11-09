import { cookieValue, isOAuthConfigured, openSession, SESSION_COOKIE } from "../../server/auth-session.mjs";

export default async (event) => {
  const session = openSession(cookieValue(event.headers?.cookie, SESSION_COOKIE));
  return {
    statusCode: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer"
    },
    body: JSON.stringify({
      authenticated: Boolean(session),
      user: session?.user || null,
      oauthConfigured: isOAuthConfigured()
    })
  };
};
