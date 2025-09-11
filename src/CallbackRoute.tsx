import { Route } from "react-router-dom";
import Callback from "./pages/Callback";
import type { Location, NavigateFunction } from "react-router-dom";

interface CallbackRouteProps {
  location: Location;
  navigate: NavigateFunction;
}

export function getCallbackRoute({ location, navigate }: CallbackRouteProps) {
  return <Route path="/callback" element={<Callback location={location} navigate={navigate} />} />;
}
