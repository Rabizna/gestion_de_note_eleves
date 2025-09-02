// client/src/components/ProtectedRoute.jsx
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { api } from "../api";

export default function ProtectedRoute({ children }) {
  const [state, setState] = useState("checking"); // "checking" | "ok" | "ko"

  useEffect(() => {
    let alive = true;
    api("/api/auth/me")
      .then(() => alive && setState("ok"))
      .catch(() => alive && setState("ko"));
    return () => { alive = false; };
  }, []);

  if (state === "checking") return <div />; // petit skeleton si tu veux

  if (state === "ok") {
    // supporte soit <ProtectedRoute><Layout/></ProtectedRoute> soit <Route element={<ProtectedRoute/>}>
    return children ? children : <Outlet />;
  }
  return <Navigate to="/login" replace />;
}
