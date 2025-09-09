import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthProvider from "./auth/AuthProvider";
import Dashboard from "./pages/Dashboard";
import Callback from "./pages/Callback";
import useAuth from "./auth/useAuth";

function Home() {
  const { login } = useAuth();
  return <button onClick={login}>Login com OAuth</button>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/callback" element={<Callback />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
