// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthProvider from "./auth/AuthProvider";
import Callback from "./pages/Callback";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="*" element={null} /> {/* rota default vazia */}
          <Route path="/callback" element={<Callback pageComponent={<></>} main="*" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
