import { Route, Routes } from "react-router-dom";
import { RootLayout } from "@/components/layouts/RootLayout";
import { HomePage } from "@/modules/home";
import { LoginPage } from "@/modules/auth/login";
import { ProfilePage } from "@/modules/auth/me";
import { ForgotPasswordPage, ResetPasswordPage } from "@/modules/auth/password";
import { RequireAuth, RequireGuest } from "./guards";

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
          path="forgot-password"
          element={
            <RequireGuest>
              <ForgotPasswordPage />
            </RequireGuest>
          }
        />
        <Route
          path="reset-password"
          element={
            <RequireGuest>
              <ResetPasswordPage />
            </RequireGuest>
          }
        />
        <Route
          path="profile"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<div className="py-10 text-center">Page not found</div>} />
      </Route>
    </Routes>
  );
}
