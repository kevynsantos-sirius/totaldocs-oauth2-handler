// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import {AuthProvider} from "./auth/AuthContext";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="*" element={null} /> {/* rota default vazia */}
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
