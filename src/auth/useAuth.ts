import { useContext } from "react";
import AuthContext from "./AuthContext.js";
import type { AuthContextType } from "./AuthContext.js";

export default function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
