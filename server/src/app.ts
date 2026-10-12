import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { notFound } from "./middleware/not-found";
import { globalRateLimiter } from "./middleware/rate-limit";
import { requestLogger } from "./middleware/request-logger";
import { adminUsersRouter, authRouter } from "./modules/auth/auth.routes";
import { adminAvailabilityRouter, publicAvailabilityRouter } from "./modules/availability/availability.routes";
import { bookingsRouter, meBookingsRouter } from "./modules/bookings/bookings.routes";
import { publicBookingsRouter } from "./modules/bookings/guest.routes";
import { adminCouponsRouter, publicCouponsRouter } from "./modules/coupons/coupon.routes";
import { adminPaymentsRouter } from "./modules/payments/admin-payments.routes";
import { paymentsRouter } from "./modules/payments/payment.routes";
import { adminBookingsRouter } from "./modules/bookings/admin-bookings.routes";
import { adminRefundsRouter } from "./modules/refunds/refund.routes";
import { adminNotificationsRouter } from "./modules/notifications/notification.routes";
import { adminEmailTemplatesRouter } from "./modules/emailTemplates/email-template.routes";
import { adminDashboardRouter } from "./modules/dashboard/dashboard.routes";
import { adminCmsRouter, publicCmsRouter } from "./modules/cms/cms.routes";
import { adminMediaRouter, publicMediaRouter } from "./modules/media/media.routes";
import { adminSettingsRouter, publicSettingsRouter } from "./modules/settings/settings.routes";
import { adminAuditRouter } from "./modules/audit/audit.routes";
import { seoRouter } from "./modules/seo/seo.routes";
import { adminPoliciesRouter } from "./modules/policies/policy.routes";
import { webhookRouter } from "./modules/webhooks/webhook.routes";
import { adminPropertyRouter, publicPropertyRouter } from "./modules/properties/property.routes";
import { adminRatePlansRouter } from "./modules/ratePlans/rate-plan.routes";
import { adminRoomTypesRouter, publicRoomTypesRouter } from "./modules/roomTypes/room-type.routes";
import { adminRoomsRouter } from "./modules/rooms/room.routes";
import { healthRouter } from "./routes/health.routes";
import { adminAmenitiesRouter, publicAmenitiesRouter } from "./modules/amenities/index";
import { adminEnquiriesRouter, publicEnquiriesRouter } from "./modules/enquiries/index";
import { adminNewsletterRouter, publicNewsletterRouter } from "./modules/newsletter/index";
import { adminReviewsRouter, publicReviewsRouter, reviewsRouter } from "./modules/reviews/index";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  // Behind GoDaddy/cPanel (Passenger + reverse proxy) this lets secure
  // cookies, req.ip and the rate limiter see the real client (one hop).
  // Kept off by default for local dev; set TRUST_PROXY=true in production.
  if (env.TRUST_PROXY) {
    app.set("trust proxy", 1);
  }
  app.use(helmet());
  // Production domains come from CLIENT_URL / ADMIN_URL / EXTRA_ORIGINS
  // (comma-separated). Trailing slashes are stripped so
  // "https://hotel.example.com/" still matches the browser Origin.
  const allowedOrigins = [
    env.CLIENT_URL,
    env.ADMIN_URL,
    ...env.EXTRA_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean),
  ].map((o) => o.replace(/\/+$/, ""));
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(requestLogger);

  // Stripe webhooks need the RAW body for signature verification, so this
  // mount sits BEFORE express.json(). Moving it below breaks verification.
  app.use("/api/v1/webhooks/stripe", express.raw({ type: "application/json" }), webhookRouter);

  app.use(express.json({ limit: "1mb" }));
  app.use(globalRateLimiter);

  app.use(healthRouter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/admin/users", adminUsersRouter);
  app.use("/api/public/property", publicPropertyRouter);
  app.use("/api/public/room-types", publicRoomTypesRouter);
  app.use("/api/public/availability", publicAvailabilityRouter);
  app.use("/api/public/coupons", publicCouponsRouter);
  app.use("/api/v1/bookings", bookingsRouter);
  app.use("/api/public/bookings", publicBookingsRouter);
  app.use("/api/me/bookings", meBookingsRouter);
  app.use("/api/v1/payments", paymentsRouter);
  app.use("/api/v1/admin/coupons", adminCouponsRouter);
  app.use("/api/v1/admin/reservations", adminBookingsRouter);
  app.use("/api/v1/admin/payments", adminPaymentsRouter);
  app.use("/api/v1/admin/refunds", adminRefundsRouter);
  app.use("/api/v1/admin/notifications", adminNotificationsRouter);
  app.use("/api/v1/admin/email-templates", adminEmailTemplatesRouter);
  app.use("/api/v1/admin/dashboard", adminDashboardRouter);
  app.use("/api/v1/admin/cms", adminCmsRouter);
  app.use("/api/v1/admin/media", adminMediaRouter);
  app.use("/api/public/media", publicMediaRouter);
  app.use("/api/v1/admin/settings", adminSettingsRouter);
  app.use("/api/v1/admin/audit-logs", adminAuditRouter);
  app.use("/api/public/cms", publicCmsRouter);
  app.use("/api/public/cms/site-settings", publicSettingsRouter);
  app.use("/", seoRouter);
  app.use("/api/v1/admin/policies", adminPoliciesRouter);
  app.use("/api/v1/admin/properties", adminPropertyRouter);
  app.use("/api/v1/admin/room-types", adminRoomTypesRouter);
  app.use("/api/v1/admin/rooms", adminRoomsRouter);
  app.use("/api/v1/admin/rate-plans", adminRatePlansRouter);
  app.use("/api/v1/admin/availability", adminAvailabilityRouter);
  app.use("/api/v1/admin/amenities", adminAmenitiesRouter);
  app.use("/api/public/amenities", publicAmenitiesRouter);
  app.use("/api/v1/admin/enquiries", adminEnquiriesRouter);
  app.use("/api/public/enquiries", publicEnquiriesRouter);
  app.use("/api/v1/admin/newsletter", adminNewsletterRouter);
  app.use("/api/public/newsletter", publicNewsletterRouter);
  app.use("/api/v1/admin/reviews", adminReviewsRouter);
  app.use("/api/public/reviews", publicReviewsRouter);
  app.use("/api/v1/reviews", reviewsRouter);
  // Future domain routers mount under /api/v1 (see docs 05_DATABASE_AND_API_SPEC).

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export type App = ReturnType<typeof createApp>;
