import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AdminShell } from "@/components/layouts/AdminShell";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { RootLayout } from "@/components/layouts/RootLayout";
import { RequireAdmin, RequireAuth, RequireGuest } from "./guards";

// Route-level code splitting: each page becomes its own chunk so the
// initial load only downloads what the current route needs.
// (Direct file imports avoid pulling barrel files into the main chunk.)
const LoginPage = lazy(() => import("@/modules/auth/login/pages/LoginPage"));
const ProfilePage = lazy(() => import("@/modules/auth/me/pages/ProfilePage"));
const ForgotPasswordPage = lazy(
  () => import("@/modules/auth/password/pages/ForgotPasswordPage"),
);
const ResetPasswordPage = lazy(
  () => import("@/modules/auth/password/pages/ResetPasswordPage"),
);
const DashboardPage = lazy(() => import("@/modules/dashboard/pages/DashboardPage"));
const SalesPage = lazy(() => import("@/modules/dashboard/pages/SalesPage"));
const RoomTypesPage = lazy(() => import("@/modules/room-types/pages/RoomTypesPage"));
const RoomTypeCreatePage = lazy(
  () => import("@/modules/room-types/pages/RoomTypeCreatePage"),
);
const RoomTypeEditPage = lazy(() => import("@/modules/room-types/pages/RoomTypeEditPage"));
const RoomsPage = lazy(() => import("@/modules/rooms/pages/RoomsPage"));
const RoomCreatePage = lazy(() => import("@/modules/rooms/pages/RoomCreatePage"));
const RoomEditPage = lazy(() => import("@/modules/rooms/pages/RoomEditPage"));
const RatePlansPage = lazy(() => import("@/modules/rate-plans/pages/RatePlansPage"));
const RatePlanCreatePage = lazy(
  () => import("@/modules/rate-plans/pages/RatePlanCreatePage"),
);
const RatePlanEditPage = lazy(() => import("@/modules/rate-plans/pages/RatePlanEditPage"));
const AvailabilityPage = lazy(
  () => import("@/modules/availability/pages/AvailabilityPage"),
);
const ReservationsPage = lazy(
  () => import("@/modules/reservations/pages/ReservationsPage"),
);
const ReservationDetailPage = lazy(
  () => import("@/modules/reservations/pages/ReservationDetailPage"),
);
const PaymentsPage = lazy(() => import("@/modules/payments/pages/PaymentsPage"));
const PaymentDetailPage = lazy(
  () => import("@/modules/payments/pages/PaymentDetailPage"),
);
const CustomersPage = lazy(() => import("@/modules/customers/pages/CustomersPage"));
const CustomerDetailPage = lazy(
  () => import("@/modules/customers/pages/CustomerDetailPage"),
);
const CouponsPage = lazy(() => import("@/modules/coupons/pages/CouponsPage"));
const CouponCreatePage = lazy(() => import("@/modules/coupons/pages/CouponCreatePage"));
const CouponEditPage = lazy(() => import("@/modules/coupons/pages/CouponEditPage"));
const NotificationsPage = lazy(
  () => import("@/modules/notifications/pages/NotificationsPage"),
);
const EmailTemplatesPage = lazy(
  () => import("@/modules/email-templates/pages/EmailTemplatesPage"),
);
const EmailTemplateEditPage = lazy(
  () => import("@/modules/email-templates/pages/EmailTemplateEditPage"),
);
const CmsPagesPage = lazy(() => import("@/modules/cms/pages/CmsPagesPage"));
const CmsPageCreatePage = lazy(() => import("@/modules/cms/pages/CmsPageCreatePage"));
const CmsPageEditPage = lazy(() => import("@/modules/cms/pages/CmsPageEditPage"));
const BlogsPage = lazy(() => import("@/modules/cms/pages/BlogsPage"));
const BlogEditPage = lazy(() => import("@/modules/cms/pages/BlogEditPage"));
const FaqsPage = lazy(() => import("@/modules/cms/pages/FaqsPage"));
const OffersPage = lazy(() => import("@/modules/cms/pages/OffersPage"));
const OfferEditPage = lazy(() => import("@/modules/cms/pages/OfferEditPage"));
const PoliciesPage = lazy(() => import("@/modules/cms/pages/PoliciesPage"));
const MediaPage = lazy(() => import("@/modules/media/pages/MediaPage"));
const SettingsPage = lazy(() => import("@/modules/settings/pages/SettingsPage"));
const AuditLogsPage = lazy(() => import("@/modules/audit/pages/AuditLogsPage"));
const AmenitiesPage = lazy(() => import("@/modules/amenities/pages/AmenitiesPage"));
const EnquiriesPage = lazy(() => import("@/modules/enquiries/pages/EnquiriesPage"));
const NewsletterPage = lazy(() => import("@/modules/newsletter/pages/NewsletterPage"));
const ReviewsPage = lazy(() => import("@/modules/reviews/pages/ReviewsPage"));

function PageFallback() {
  return (
    <div className="py-10 text-center text-sm text-muted-foreground" aria-label="Loading page">
      Loading…
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
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
              path="sales"
              element={
                <RequireAdmin>
                  <SalesPage />
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
              path="payments/:id"
              element={
                <RequireAdmin>
                  <PaymentDetailPage />
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
              path="email-templates"
              element={
                <RequireAdmin>
                  <EmailTemplatesPage />
                </RequireAdmin>
              }
            />
            <Route
              path="email-templates/:key"
              element={
                <RequireAdmin>
                  <EmailTemplateEditPage />
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
              path="amenities"
              element={
                <RequireAdmin>
                  <AmenitiesPage />
                </RequireAdmin>
              }
            />
            <Route
              path="enquiries"
              element={
                <RequireAdmin>
                  <EnquiriesPage />
                </RequireAdmin>
              }
            />
            <Route
              path="newsletter"
              element={
                <RequireAdmin>
                  <NewsletterPage />
                </RequireAdmin>
              }
            />
            <Route
              path="reviews"
              element={
                <RequireAdmin>
                  <ReviewsPage />
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
    </Suspense>
  );
}
