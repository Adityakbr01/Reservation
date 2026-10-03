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
import { ReservationDetailPage, ReservationsPage } from "@/modules/reservations";
import { PaymentsPage } from "@/modules/payments";
import { CustomerDetailPage, CustomersPage } from "@/modules/customers";
import { CouponCreatePage, CouponEditPage, CouponsPage } from "@/modules/coupons";
import { NotificationsPage } from "@/modules/notifications";
import {
  BlogEditPage,
  BlogsPage,
  CmsPageCreatePage,
  CmsPageEditPage,
  CmsPagesPage,
  FaqsPage,
  OfferEditPage,
  OffersPage,
  PoliciesPage,
} from "@/modules/cms";
import { MediaPage } from "@/modules/media";
import { SettingsPage } from "@/modules/settings";
import { AuditLogsPage } from "@/modules/audit";
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
          <Route
            path="reservations"
            element={
              <RequireAdmin>
                <ReservationsPage />
              </RequireAdmin>
            }
          />
          <Route
            path="reservations/:id"
            element={
              <RequireAdmin>
                <ReservationDetailPage />
              </RequireAdmin>
            }
          />
          <Route
            path="payments"
            element={
              <RequireAdmin>
                <PaymentsPage />
              </RequireAdmin>
            }
          />
          <Route
            path="customers"
            element={
              <RequireAdmin>
                <CustomersPage />
              </RequireAdmin>
            }
          />
          <Route
            path="customers/:id"
            element={
              <RequireAdmin>
                <CustomerDetailPage />
              </RequireAdmin>
            }
          />
          <Route
            path="coupons"
            element={
              <RequireAdmin>
                <CouponsPage />
              </RequireAdmin>
            }
          />
          <Route
            path="coupons/new"
            element={
              <RequireAdmin>
                <CouponCreatePage />
              </RequireAdmin>
            }
          />
          <Route
            path="coupons/:id/edit"
            element={
              <RequireAdmin>
                <CouponEditPage />
              </RequireAdmin>
            }
          />
          <Route
            path="notifications"
            element={
              <RequireAdmin>
                <NotificationsPage />
              </RequireAdmin>
            }
          />
          <Route
            path="cms/pages"
            element={
              <RequireAdmin>
                <CmsPagesPage />
              </RequireAdmin>
            }
          />
          <Route
            path="cms/pages/new"
            element={
              <RequireAdmin>
                <CmsPageCreatePage />
              </RequireAdmin>
            }
          />
          <Route
            path="cms/pages/:id/edit"
            element={
              <RequireAdmin>
                <CmsPageEditPage />
              </RequireAdmin>
            }
          />
          <Route
            path="cms/blogs"
            element={
              <RequireAdmin>
                <BlogsPage />
              </RequireAdmin>
            }
          />
          <Route
            path="cms/blogs/new"
            element={
              <RequireAdmin>
                <BlogEditPage mode="create" />
              </RequireAdmin>
            }
          />
          <Route
            path="cms/blogs/:id/edit"
            element={
              <RequireAdmin>
                <BlogEditPage mode="edit" />
              </RequireAdmin>
            }
          />
          <Route
            path="cms/faqs"
            element={
              <RequireAdmin>
                <FaqsPage />
              </RequireAdmin>
            }
          />
          <Route
            path="cms/offers"
            element={
              <RequireAdmin>
                <OffersPage />
              </RequireAdmin>
            }
          />
          <Route
            path="cms/offers/new"
            element={
              <RequireAdmin>
                <OfferEditPage mode="create" />
              </RequireAdmin>
            }
          />
          <Route
            path="cms/offers/:id/edit"
            element={
              <RequireAdmin>
                <OfferEditPage mode="edit" />
              </RequireAdmin>
            }
          />
          <Route
            path="cms/policies"
            element={
              <RequireAdmin>
                <PoliciesPage />
              </RequireAdmin>
            }
          />
          <Route
            path="media"
            element={
              <RequireAdmin>
                <MediaPage />
              </RequireAdmin>
            }
          />
          <Route
            path="settings"
            element={
              <RequireAdmin>
                <SettingsPage />
              </RequireAdmin>
            }
          />
          <Route
            path="audit-logs"
            element={
              <RequireAdmin>
                <AuditLogsPage />
              </RequireAdmin>
            }
          />
        </Route>
        <Route path="*" element={<div className="py-10 text-center">Page not found</div>} />
      </Route>
    </Routes>
  );
}
