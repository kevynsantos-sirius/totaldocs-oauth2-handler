import Callback from "./pages/Callback";
import { Route } from "react-router-dom";

export function getCallbackRoute() {
  // Retorna sempre um Route válido, ou um fragment vazio
  return <Route path="/" element={<Callback />} />;
}
