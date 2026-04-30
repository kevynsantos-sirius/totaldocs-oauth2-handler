const env = (() => {
  // Vite (principal)
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env;
  }

  // fallback seguro SEM quebrar TypeScript
  const globalAny = globalThis as any;

  if (typeof globalAny.process !== "undefined" && globalAny.process.env) {
    return globalAny.process.env;
  }

  return {};
})();

export const AUTH_URL =
  env.VITE_OAUTH2_AUTH_URL ||
  env.REACT_APP_OAUTH2_AUTH_URL ||
  "";

export const TOKEN_URL =
  env.VITE_OAUTH2_TOKEN_URL ||
  env.REACT_APP_OAUTH2_TOKEN_URL ||
  "";

export const CLIENT_ID =
  env.VITE_OAUTH2_CLIENT_ID ||
  env.REACT_APP_OAUTH2_CLIENT_ID ||
  "";

export const REDIRECT_URI =
  env.VITE_OAUTH2_REDIRECT_URI ||
  env.REACT_APP_OAUTH2_REDIRECT_URI ||
  "";