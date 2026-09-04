import { betterAuth } from 'better-auth';
import { D1Dialect } from 'kysely-d1';
import { authOptions } from './auth-options';

export function createAuth(env: PlatformEnv) {
  return betterAuth({
    ...authOptions,
    secret: env.AUTH_SECRET,
    baseURL: env.PUBLIC_ORIGIN,
    database: {
      dialect: new D1Dialect({ database: env.DB }),
      type: 'sqlite',
      transaction: false,
    },
    trustedOrigins: [env.PUBLIC_ORIGIN],
    advanced: { useSecureCookies: env.PUBLIC_ORIGIN.startsWith('https://') },
  });
}
