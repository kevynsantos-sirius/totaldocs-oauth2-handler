interface ImportMetaEnv {
  readonly VITE_OAUTH2_AUTH_URL?: string;
  readonly VITE_OAUTH2_TOKEN_URL?: string;
  readonly VITE_OAUTH2_CLIENT_ID?: string;
  readonly VITE_OAUTH2_REDIRECT_URI?: string;

  readonly REACT_APP_OAUTH2_AUTH_URL?: string;
  readonly REACT_APP_OAUTH2_TOKEN_URL?: string;
  readonly REACT_APP_OAUTH2_CLIENT_ID?: string;
  readonly REACT_APP_OAUTH2_REDIRECT_URI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}