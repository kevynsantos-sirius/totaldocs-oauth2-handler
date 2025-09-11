import { useEffect } from "react";
import type { Location } from "react-router-dom";
import type { NavigateFunction } from "react-router-dom";
import useAuth from '../auth/useAuth';

interface CallbackProps {
  location: Location;
  navigate: NavigateFunction;
}

export default function Callback({ location, navigate }: CallbackProps) {
  const { handleCallback } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");

    if (code) {
      handleCallback(code).then(() => {
        navigate("/", { replace: true });
      });
    } else {
      console.error("❌ Callback sem código OAuth2!");
      navigate("/", { replace: true });
    }
  }, [location.search, handleCallback, navigate]);

  return <></>;
}
