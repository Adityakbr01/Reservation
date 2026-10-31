import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { RootLayout } from "@/components/layouts/RootLayout";
import { HomePage } from "@/modules/home/pages/HomePage";
import { RequireAuth, RequireGuest } from "./guards";

// Route-level code splitting: each page becomes its own chunk so the
// initial load only downloads what the current route needs.
// (Direct file imports avoid pulling barrel files into the main chunk.)
const RoomDetailPage = lazy(() => import("@/modules/rooms/pages/RoomDetailPage"));
const BookingPage = lazy(() => import("@/modules/booking/pages/BookingPage"));
const BookingConfirmationPage = lazy(
  () => import("@/modules/booking/pages/BookingConfirmationPage"),
);
const MyBookingsPage = lazy(() => import("@/modules/booking/pages/MyBookingsPage"));
const LoginPage = lazy(() => import("@/modules/auth/login/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/modules/auth/register/pages/RegisterPage"));
const ProfilePage = lazy(() => import("@/modules/auth/me/pages/ProfilePage"));
const ForgotPasswordPage = lazy(
  () => import("@/modules/auth/password/pages/ForgotPasswordPage"),
);
const ResetPasswordPage = lazy(
  () => import("@/modules/auth/password/pages/ResetPasswordPage"),
);
// CmsPages.tsx has named-only exports, so map them to default for lazy().
const CmsPageView = lazy(() =>
  import("@/modules/cms/pages/CmsPages").then((m) => ({ default: m.CmsPageView })),
);
const BlogsPage = lazy(() =>
  import("@/modules/cms/pages/CmsPages").then((m) => ({ default: m.BlogsPage })),
);
const BlogPostPage = lazy(() =>
  import("@/modules/cms/pages/CmsPages").then((m) => ({ default: m.BlogPostPage })),
);
const FaqsPage = lazy(() =>
  import("@/modules/cms/pages/CmsPages").then((m) => ({ default: m.FaqsPage })),
);
const OffersPage = lazy(() =>
  import("@/modules/cms/pages/CmsPages").then((m) => ({ default: m.OffersPage })),
);
const PolicyPage = lazy(() =>
  import("@/modules/cms/pages/CmsPages").then((m) => ({ default: m.PolicyPage })),
);
const EnquirePage = lazy(() => import("@/modules/enquiry/pages/EnquirePage"));

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
          <Route index element={<HomePage />} />
          <Route path="rooms/:slug" element={<RoomDetailPage />} />
          <Route path="p/:slug" element={<CmsPageView />} />
          <Route path="blogs" element={<BlogsPage />} />
          <Route path="blogs/:slug" element={<BlogPostPage />} />
          <Route path="faqs" element={<FaqsPage />} />
          <Route path="offers" element={<OffersPage />} />
          <Route path="policies/:key" element={<PolicyPage />} />
          <Route path="enquire" element={<EnquirePage />} />
          <Route path="booking/new" element={<BookingPage />} />
          <Route
            path="booking/confirmation/:id"
            element={
              <RequireAuth>
                <BookingConfirmationPage />
              </RequireAuth>
            }
          />
          <Route
            path="bookings"
            element={
              <RequireAuth>
                <MyBookingsPage />
              </RequireAuth>
            }
          />
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
    </Suspense>
  );
}
