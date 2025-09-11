import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import AuthProvider from "./auth/AuthProvider";
import {getCallbackRoute} from "./CallbackRoute";

function AuthWrapper() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <AuthProvider location={location} navigate={navigate}>
      {getCallbackRoute({ location, navigate })}
    </AuthProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthWrapper />
    </BrowserRouter>
  );
}
