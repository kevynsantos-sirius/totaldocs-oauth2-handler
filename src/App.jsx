// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthProvider from "./auth/AuthProvider";
import Callback from "./pages/Callback";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/callback" element={<Callback />} />
          <Route path="*" element={null} /> {/* nada visível na rota principal */}
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

