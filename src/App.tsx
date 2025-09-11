// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthProvider from "./auth/AuthProvider";
import { getCallbackRoute } from "./CallbackRoute";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {getCallbackRoute()}       {/* Callback */}
          <Route path="*" element={null} /> {/* rota default vazia */}
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
