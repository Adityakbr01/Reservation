import { z } from "zod";
import { objectIdSchema } from "../../utils/validators";
import { paginationQuerySchema } from "../../utils/pagination";
import { USER_ROLES } from "../users/user.types";

const emailSchema = z.string().trim().toLowerCase().email().max(160);
const passwordSchema = z.string().min(8).max(128);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const updateMeSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

export const setPasswordSchema = z.object({
  newPassword: passwordSchema,
});

export const listUsersQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(80).optional(),
  role: z.enum(USER_ROLES).optional(),
});

export const userIdParamsSchema = z.object({ id: objectIdSchema });

export const userStatusBodySchema = z.object({ isActive: z.boolean() });

export type UserStatusInput = z.infer<typeof userStatusBodySchema>;

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type SetPasswordInput = z.infer<typeof setPasswordSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
