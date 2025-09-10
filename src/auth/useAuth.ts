import { useContext } from "react";
import AuthContext from "./AuthContext";
import type { AuthContextType } from "./AuthContext";

export default function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
