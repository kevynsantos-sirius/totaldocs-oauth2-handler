import { Routes, Route } from "react-router-dom";
import Callback from "./pages/Callback";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/callback" element={<Callback />} />
      <Route path="*" element={null} /> {/* nada visível na rota principal */}
    </Routes>
  );
}
