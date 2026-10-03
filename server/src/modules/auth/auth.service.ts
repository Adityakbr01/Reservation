import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { env, isProduction } from "../../config/env";
import { logger } from "../../config/logger";
import { AppError } from "../../utils/app-error";
import { signAccessToken } from "../../utils/jwt";
import { deleteAvatar, uploadAvatar } from "../../integrations/imagekit/imagekit.service";
import {
  createUser,
  findUserByEmail,
  findUserByEmailWithHash,
  findUserById,
  findUserByIdWithHash,
  findUserByResetTokenHash,
  findUserDocById,
  listUsers,
  toSafeUser,
  updateUserById,
} from "../users/user.repository";
import type { Paginated } from "../../utils/pagination";
import type { SafeUser } from "../users/user.types";
import type {
  ForgotPasswordInput,
  ListUsersQuery,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateMeInput,
} from "./auth.schema";
import { sendPasswordResetEmail } from "../emails/email.service";

const BCRYPT_ROUNDS = 10;
const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export interface AuthResult {
  user: SafeUser;
  token: string;
}

function isDuplicateKey(error: unknown): boolean {
  return error instanceof Error && (error as unknown as { code?: unknown }).code === 11000;
}

function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Public registration ALWAYS creates a user. The admin role is granted
 * only through admin user management, never from client input.
 */
export async function register(input: RegisterInput): Promise<AuthResult> {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new AppError("An account with this email already exists", 409, "USER_EXISTS");
  }
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  try {
    const doc = await createUser({
      name: input.name,
      email: input.email,
      passwordHash,
      role: "user",
    });
    const user = toSafeUser(doc);
    return { user, token: signAccessToken(user.id, user.role) };
  } catch (error) {
    // Race-safe duplicate handling: two simultaneous registers for one email.
    if (isDuplicateKey(error)) {
      throw new AppError("An account with this email already exists", 409, "USER_EXISTS");
    }
    throw error;
  }
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const doc = await findUserByEmailWithHash(input.email);
  // Generic message on purpose: never reveal whether the email is registered.
  if (!doc) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }
  const matches = await bcrypt.compare(input.password, doc.passwordHash);
  if (!matches) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }
  if (!doc.isActive) {
    throw new AppError("This account has been suspended", 403, "ACCOUNT_SUSPENDED");
  }
  const updated = await updateUserById(doc._id.toString(), { lastLoginAt: new Date() });
  if (!updated) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }
  return { user: updated, token: signAccessToken(updated.id, updated.role) };
}

/**
 * Always succeeds with the same message so attackers cannot enumerate
 * registered emails. The reset token is emailed when Resend is configured;
 * in non-production it is logged so the flow stays testable without email.
 */
export async function forgotPassword(input: ForgotPasswordInput): Promise<void> {
  const doc = await findUserByEmail(input.email);
  if (!doc || !doc.isActive) return;
  const token = randomBytes(RESET_TOKEN_BYTES).toString("hex");
  await updateUserById(doc._id.toString(), {
    passwordResetTokenHash: hashResetToken(token),
    passwordResetExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });
  if (!env.RESEND_API_KEY) {
    // Email unconfigured: dev-only token log keeps the flow testable.
    if (!isProduction) {
      logger.warn("Password reset token (development only — configure RESEND_API_KEY)", {
        email: doc.email,
        token,
      });
    }
    return;
  }
  await sendPasswordResetEmail(doc.email, doc.name, token);
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const doc = await findUserByResetTokenHash(hashResetToken(input.token));
  if (!doc) {
    throw new AppError("Reset link is invalid or has expired", 400, "RESET_TOKEN_INVALID");
  }
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  await updateUserById(doc._id.toString(), {
    passwordHash,
    passwordResetTokenHash: null,
    passwordResetExpires: null,
  });
}

export async function getMe(userId: string): Promise<SafeUser> {
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError("Account not found", 404, "USER_NOT_FOUND");
  }
  return user;
}

/**
 * Profile update: display name and/or avatar. Avatar buffers go to ImageKit;
 * the previous avatar file is removed best-effort after a successful update.
 */
export async function updateMe(
  userId: string,
  input: UpdateMeInput,
  file?: Express.Multer.File,
): Promise<SafeUser> {
  const updates: {
    name?: string;
    avatarUrl?: string | null;
    avatarFileId?: string | null;
  } = {};
  if (input.name !== undefined) updates.name = input.name;

  let previousFileId: string | null = null;
  if (file) {
    const current = await findUserDocById(userId);
    if (!current) {
      throw new AppError("Account not found", 404, "USER_NOT_FOUND");
    }
    previousFileId = current.avatarFileId;
    const uploaded = await uploadAvatar(file.buffer, file.originalname, userId);
    updates.avatarUrl = uploaded.url;
    updates.avatarFileId = uploaded.fileId;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("Nothing to update", 400, "NOTHING_TO_UPDATE");
  }
  const updated = await updateUserById(userId, updates);
  if (!updated) {
    throw new AppError("Account not found", 404, "USER_NOT_FOUND");
  }
  if (previousFileId) {
    await deleteAvatar(previousFileId);
  }
  return updated;
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const doc = await findUserByIdWithHash(userId);
  if (!doc) {
    throw new AppError("Account not found", 404, "USER_NOT_FOUND");
  }
  const matches = await bcrypt.compare(currentPassword, doc.passwordHash);
  if (!matches) {
    throw new AppError("Current password is incorrect", 400, "CURRENT_PASSWORD_INCORRECT");
  }
  await updateUserById(userId, { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS) });
}

export async function listAccounts(query: ListUsersQuery): Promise<Paginated<SafeUser>> {
  return listUsers(query);
}
