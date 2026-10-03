import { Outlet } from "react-router-dom";
import { useAuthInit } from "@/app/use-auth-init";

/** Top-level outlet: reconciles the session, renders no chrome itself. */
export function RootLayout() {
  useAuthInit();
  return <Outlet />;
}
