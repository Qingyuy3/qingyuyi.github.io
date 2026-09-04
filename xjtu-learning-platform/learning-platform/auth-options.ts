import { admin } from 'better-auth/plugins';

// Shared by the runtime and schema generator; no public registration endpoint.
export const authOptions = {
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 30,
    cookieCache: { enabled: false },
  },
  user: {
    additionalFields: {
      mustChangePassword: {
        type: 'boolean' as const,
        defaultValue: true,
        input: false,
      },
      temporaryExpires: {
        type: 'number' as const,
        defaultValue: 0,
        input: false,
      },
      className: { type: 'string' as const, defaultValue: '', input: false },
    },
  },
  plugins: [admin()],
};
