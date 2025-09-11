import { Route } from "react-router-dom";
import Callback from "./pages/Callback";

export function getCallbackRoute() {
  return <Route path="/callback" element={<Callback />} />;
}
