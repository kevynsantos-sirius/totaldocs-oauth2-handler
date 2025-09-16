// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthProvider from "./auth/AuthProvider";
import Callback from "./pages/Callback";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Callback />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
