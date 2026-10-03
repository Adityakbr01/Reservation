import { Route, Routes } from "react-router-dom";
import { RootLayout } from "@/components/layouts/RootLayout";
import { HomePage } from "@/modules/home";
import { RoomDetailPage } from "@/modules/rooms";
import { LoginPage } from "@/modules/auth/login";
import { RegisterPage } from "@/modules/auth/register";
import { ProfilePage } from "@/modules/auth/me";
import { ForgotPasswordPage, ResetPasswordPage } from "@/modules/auth/password";
import { RequireAuth, RequireGuest } from "./guards";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="rooms/:slug" element={<RoomDetailPage />} />
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
