import { Route, Routes } from "react-router-dom";
import { RootLayout } from "@/components/layouts/RootLayout";
import { HomePage } from "@/modules/home";
import { LoginPage } from "@/modules/auth/login";
import { RegisterPage } from "@/modules/auth/register";
import { RequireGuest } from "./guards";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route
          path="login"
          element={
            <RequireGuest>
              <LoginPage />
            </RequireGuest>
          }
        />
        <Route
          path="register"
          element={
            <RequireGuest>
              <RegisterPage />
            </RequireGuest>
          }
        />
        <Route path="*" element={<div className="py-10 text-center">Page not found</div>} />
      </Route>
    </Routes>
  );
}
