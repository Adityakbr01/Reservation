import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="min-h-dvh bg-background font-sans text-foreground">
      <Outlet />
    </div>
  );
}
