// src/CallbackRoute.tsx
import { Route } from "react-router-dom";
import Callback from "./pages/Callback";
import type { Location, NavigateFunction } from "react-router-dom";

interface CallbackRouteProps {
  location: Location;
  navigate: NavigateFunction;
}

export function getCallbackRoute({ location, navigate }: CallbackRouteProps) {
  console.log(location);
  console.log(navigate);
  if (!location || !navigate) return null; // retorna fragment vazio se não tiver
  return <Route path="/callback" element={<Callback location={location} navigate={navigate} />} />;
}

