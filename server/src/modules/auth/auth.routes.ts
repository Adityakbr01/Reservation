import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { authRateLimiter } from "../../middleware/rate-limit";
import { avatarUpload } from "../../middleware/upload";
import { validate } from "../../middleware/validate";
import {
  changePasswordHandler,
  forgotPasswordHandler,
  listUsersHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  registerHandler,
  resetPasswordHandler,
  updateMeHandler,
} from "./auth.controller";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  listUsersQuerySchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateMeSchema,
} from "./auth.schema";

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, validate({ body: registerSchema }), registerHandler);
authRouter.post("/login", authRateLimiter, validate({ body: loginSchema }), loginHandler);
authRouter.post("/logout", authenticate, logoutHandler);
authRouter.post(
  "/forgot-password",
  authRateLimiter,
  validate({ body: forgotPasswordSchema }),
  forgotPasswordHandler,
);
authRouter.post(
  "/reset-password",
  authRateLimiter,
  validate({ body: resetPasswordSchema }),
  resetPasswordHandler,
);
authRouter.get("/me", authenticate, meHandler);
authRouter.patch(
  "/me",
  authenticate,
  avatarUpload,
  validate({ body: updateMeSchema }),
  updateMeHandler,
);
authRouter.post(
  "/change-password",
  authenticate,
  validate({ body: changePasswordSchema }),
  changePasswordHandler,
);

/** Staff account listing. Extend into a full admin-users module in a later phase. */
export const adminUsersRouter = Router();

adminUsersRouter.use(authenticate, authorize("admin"));
adminUsersRouter.get("/", validate({ query: listUsersQuerySchema }), listUsersHandler);
