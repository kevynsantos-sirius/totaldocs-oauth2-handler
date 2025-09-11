// src/App.jsx
import { Routes, Route } from "react-router-dom";
import AuthProvider from "./auth/AuthProvider";
import {getCallbackRoute} from "./CallbackRoute";

export default function App() {
  return (
      <AuthProvider>
        <Routes>
          {getCallbackRoute()}
          <Route path="*" element={null} /> {/* nada visível na rota principal */}
        </Routes>
      </AuthProvider>
  );
}
