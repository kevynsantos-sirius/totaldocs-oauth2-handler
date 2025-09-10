// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthProvider from "./auth/AuthProvider.js";
import Callback from "./pages/Callback.js";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/callback" element={<Callback />} />
          <Route path="*" element={null} /> {/* nada visível na rota principal */}
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
