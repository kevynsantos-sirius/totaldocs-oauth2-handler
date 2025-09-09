// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthProvider from "./auth/AuthProvider";
import CallbackIframe from "./pages/CallbackIframe";
import useAuth from "./auth/useAuth";

function Home() {
  const { auth, login, logout } = useAuth();

  if (!auth) {
    return <p>Iniciando login...</p>; // se não autenticado, iframe vai aparecer via AuthProvider
  }

  return (
    <div>
      <h1>Bem-vindo!</h1>
      <p>Access token: {auth.accessToken}</p>
      <button onClick={logout}>Logout</button>
      <button onClick={login}>Forçar login</button>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/callback" element={<CallbackIframe />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
