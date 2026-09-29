import "server-only";

import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

/**
 * Optional sign-in for the gym (Google only), fully stateless: no database.
 * The session is an encrypted cookie (JWE) that refreshes itself; OAuth state
 * and the account live in cookies too. The durable member record is the Bold
 * viewer (see lib/gym-viewer.ts), keyed by email.
 */
export const auth = betterAuth({
  appName: "The GTM Gym",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      prompt: "select_account",
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 30,
      strategy: "jwe",
      refreshCache: true,
    },
  },
  plugins: [nextCookies()],
});
