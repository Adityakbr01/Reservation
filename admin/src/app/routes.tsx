import { Navigate, Route, Routes } from "react-router-dom";
import { AdminShell } from "@/components/layouts/AdminShell";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { RootLayout } from "@/components/layouts/RootLayout";
import { LoginPage } from "@/modules/auth/login";
import { ProfilePage } from "@/modules/auth/me";
import { ForgotPasswordPage, ResetPasswordPage } from "@/modules/auth/password";
import { DashboardPage } from "@/modules/dashboard";
import { RoomTypeCreatePage, RoomTypeEditPage, RoomTypesPage } from "@/modules/room-types";
import { RoomCreatePage, RoomEditPage, RoomsPage } from "@/modules/rooms";
import { RatePlanCreatePage, RatePlanEditPage, RatePlansPage } from "@/modules/rate-plans";
import { AvailabilityPage } from "@/modules/availability";
import { RequireAdmin, RequireAuth, RequireGuest } from "./guards";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route element={<AuthLayout />}>
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
        </Route>
        <Route
          element={
            <RequireAuth>
              <AdminShell />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route
            path="dashboard"
            element={
              <RequireAdmin>
                <DashboardPage />
              </RequireAdmin>
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
          <Route
            path="room-types"
            element={
              <RequireAdmin>
                <RoomTypesPage />
              </RequireAdmin>
            }
          />
          <Route
            path="room-types/new"
            element={
              <RequireAdmin>
                <RoomTypeCreatePage />
              </RequireAdmin>
            }
          />
          <Route
            path="room-types/:id/edit"
            element={
              <RequireAdmin>
                <RoomTypeEditPage />
              </RequireAdmin>
            }
          />
          <Route
            path="rooms"
            element={
              <RequireAdmin>
                <RoomsPage />
              </RequireAdmin>
            }
          />
          <Route
            path="rooms/new"
            element={
              <RequireAdmin>
                <RoomCreatePage />
              </RequireAdmin>
            }
          />
          <Route
            path="rooms/:id/edit"
            element={
              <RequireAdmin>
                <RoomEditPage />
              </RequireAdmin>
            }
          />
          <Route
            path="rate-plans"
            element={
              <RequireAdmin>
                <RatePlansPage />
              </RequireAdmin>
            }
          />
          <Route
            path="rate-plans/new"
            element={
              <RequireAdmin>
                <RatePlanCreatePage />
              </RequireAdmin>
            }
          />
          <Route
            path="rate-plans/:id/edit"
            element={
              <RequireAdmin>
                <RatePlanEditPage />
              </RequireAdmin>
            }
          />
          <Route
            path="availability"
            element={
              <RequireAdmin>
                <AvailabilityPage />
              </RequireAdmin>
            }
          />
        </Route>
        <Route path="*" element={<div className="py-10 text-center">Page not found</div>} />
      </Route>
    </Routes>
  );
}
