// src/pages/CallbackIframe.jsx
import { useEffect } from "react";

export default function CallbackIframe() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      console.error("Erro no login:", error);
    }

    if (code) {
      // envia code para o parent
      window.parent.postMessage({ code }, window.origin);
    }
  }, []);

  return <></>;
}
