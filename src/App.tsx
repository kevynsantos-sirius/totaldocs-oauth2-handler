// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthProvider from "./auth/AuthProvider";
import CallbackRoute from "./CallbackRoute";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <CallbackRoute />
          <Route path="*" element={null} /> {/* nada visível na rota principal */}
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
