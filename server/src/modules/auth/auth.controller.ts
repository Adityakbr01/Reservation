import type { Request, Response } from "express";
import { requireUser } from "../../middleware/auth";
import { asyncHandler } from "../../utils/async-handler";
import type { RequestWithValidatedQuery } from "../../middleware/validate";
import type { RequestWithFile } from "../../middleware/upload";
import { recordAudit } from "../audit/audit.service";
import {
  changePassword,
  forgotPassword,
  getCustomerDetail,
  getMe,
  listAccounts,
  login,
  register,
  resetPassword,
  setAccountStatus,
  setPassword,
  updateMe,
} from "./auth.service";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  ListUsersQuery,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  SetPasswordInput,
  UpdateMeInput,
  UserStatusInput,
} from "./auth.schema";

/** POST /api/v1/auth/register — 201 + { user, token }. */
export const registerHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await register(req.body as RegisterInput);
  res.status(201).json({ success: true, data: result });
});

/** POST /api/v1/auth/login — 200 + { user, token }. */
export const loginHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await login(req.body as LoginInput);
  res.status(200).json({ success: true, data: result });
});

/**
 * POST /api/v1/auth/logout — stateless JWT: the client discards its token.
 * The endpoint exists so clients have one consistent call and the action is logged.
 */
export const logoutHandler = asyncHandler(async (req: Request, res: Response) => {
  requireUser(req);
  res.status(200).json({ success: true, data: { loggedOut: true } });
});

/** POST /api/v1/auth/forgot-password — always 200, anti-enumeration. */
export const forgotPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  await forgotPassword(req.body as ForgotPasswordInput);
  res.status(200).json({
    success: true,
    data: { message: "If an account exists for this email, a reset link was sent" },
  });
});

/** POST /api/v1/auth/reset-password — 200 on success. */
export const resetPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  await resetPassword(req.body as ResetPasswordInput);
  res.status(200).json({ success: true, data: { message: "Password has been reset" } });
});

/** GET /api/v1/auth/me — current account. */
export const meHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await getMe(requireUser(req).id);
  res.status(200).json({ success: true, data: user });
});

/** PATCH /api/v1/auth/me — display name and/or avatar file. */
export const updateMeHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await updateMe(
    requireUser(req).id,
    req.body as UpdateMeInput,
    (req as Request & RequestWithFile).file,
  );
  res.status(200).json({ success: true, data: user });
});

/** POST /api/v1/auth/change-password — verify current, set new. */
export const changePasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as ChangePasswordInput;
  await changePassword(requireUser(req).id, body.currentPassword, body.newPassword);
  res.status(200).json({ success: true, data: { message: "Password changed" } });
});

/** POST /api/v1/auth/set-password — set new password without current password (already authenticated). */
export const setPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as SetPasswordInput;
  await setPassword(requireUser(req).id, body.newPassword);
  res.status(200).json({ success: true, data: { message: "Password changed" } });
});

/** GET /api/v1/admin/users — standard paginated list contract. */
export const listUsersHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = (req as Request & RequestWithValidatedQuery).validatedQuery as ListUsersQuery;
  const result = await listAccounts(query);
  res.status(200).json({ success: true, data: result.data, meta: result.meta });
});

/** GET /api/v1/admin/users/:id — customer detail (docs 07 §44). */
export const getUserHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await getCustomerDetail(req.params.id as string);
  res.status(200).json({ success: true, data: result });
});

/** PATCH /api/v1/admin/users/:id/status — enable/disable (docs 07 §45). */
export const setUserStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as UserStatusInput;
  const result = await setAccountStatus(
    req.params.id as string,
    requireUser(req).id,
    body.isActive,
  );
  await recordAudit(req, body.isActive ? "CUSTOMER_ENABLED" : "CUSTOMER_DISABLED", "user", {
    entityId: result.id,
    after: { isActive: result.isActive },
  });
  res.status(200).json({ success: true, data: result });
});
