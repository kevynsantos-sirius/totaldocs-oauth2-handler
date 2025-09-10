import { createContext } from "react";

export interface AuthData {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  createdAt: number;
}

export interface AuthContextType {
  auth: AuthData | null;
  login: () => void;
  logout: () => void;
  handleCallback: (code: string) => Promise<void>;
  checkLogin: (redirectBack?: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  auth: null,
  login: () => {},
  logout: () => {},
  handleCallback: async () => {},
  checkLogin: () => {},
});

export default AuthContext;
