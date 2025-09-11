import { Routes, Route } from "react-router-dom";
import Callback from "./pages/Callback";

export default function CallbackRoute() {
  return (
      <Route path="/callback" element={<Callback />} />
  );
}
