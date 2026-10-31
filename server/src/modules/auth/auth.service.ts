import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { env, isProduction } from "../../config/env";
import { logger } from "../../config/logger";
import { AppError } from "../../utils/app-error";
import { signAccessToken } from "../../utils/jwt";
import { isDuplicateKeyError } from "../../utils/mongo";
import {
  deleteAvatar,
  uploadAvatar,
} from "../../integrations/storage/avatar-storage";
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
import type { StorageProvider } from "../media/media.model";
import type {
  ForgotPasswordInput,
  ListUsersQuery,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateMeInput,
} from "./auth.schema";
import {
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
} from "../../emails/password-reset";
import { sendWelcomeEmail } from "../../emails/account";
import { listBookingsByUser } from "../bookings/booking.repository";
import { listPaymentsByBooking } from "../payments/payment.repository";
import { sumSucceededRefunds } from "../refunds/refund.model";

const BCRYPT_ROUNDS = 10;
const RESET_TOKEN_BYTES = 32;
/** Single-use reset links expire after 1 hour (see expiryNote in the email). */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export interface AuthResult {
  user: SafeUser;
  token: string;
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
    throw new AppError(
      "An account with this email already exists",
      409,
      "USER_EXISTS",
    );
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
    // Welcome mail is fire-and-forget: signup already succeeded, and delivery
    // failure must never fail registration.
    if (env.RESEND_API_KEY) {
      await sendWelcomeEmail(doc.email, doc.name);
    }
    return { user, token: signAccessToken(user.id, user.role) };
  } catch (error) {
    // Race-safe duplicate handling: two simultaneous registers for one email.
    if (isDuplicateKeyError(error)) {
      throw new AppError(
        "An account with this email already exists",
        409,
        "USER_EXISTS",
      );
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
    throw new AppError(
      "This account has been suspended",
      403,
      "ACCOUNT_SUSPENDED",
    );
  }
  const updated = await updateUserById(doc._id.toString(), {
    lastLoginAt: new Date(),
  });
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
export async function forgotPassword(
  input: ForgotPasswordInput,
): Promise<void> {
  const doc = await findUserByEmail(input.email);
  if (!doc || !doc.isActive) return;
  const token = randomBytes(RESET_TOKEN_BYTES).toString("hex");
  await updateUserById(doc._id.toString(), {
    passwordResetTokenHash: hashResetToken(token),
    passwordResetExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });
  if (!env.RESEND_API_KEY) {
    // Email unconfigured: nothing to send. The reset token stays hashed in
    // the database; the raw token is never written to logs.
    if (!isProduction) {
      logger.warn("Password reset requested (development only — configure RESEND_API_KEY)", {
        email: doc.email,
      });
    }
    return;
  }
  await sendPasswordResetEmail(doc.email, doc.name, token);
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const doc = await findUserByResetTokenHash(hashResetToken(input.token));
  if (!doc) {
    throw new AppError(
      "Reset link is invalid or has expired",
      400,
      "RESET_TOKEN_INVALID",
    );
  }
  // Defense in depth: the token may predate a suspension (forgot-password
  // itself issues no new tokens to inactive accounts).
  if (!doc.isActive) {
    throw new AppError(
      "This account has been suspended",
      403,
      "ACCOUNT_SUSPENDED",
    );
  }
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  await updateUserById(doc._id.toString(), {
    passwordHash,
    passwordResetTokenHash: null,
    passwordResetExpires: null,
  });
  // Confirmation mail is fire-and-forget: it must never fail the reset.
  if (env.RESEND_API_KEY) {
    await sendPasswordChangedEmail(doc.email, doc.name);
  }
}

export async function getMe(userId: string): Promise<SafeUser> {
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError("Account not found", 404, "USER_NOT_FOUND");
  }
  return user;
}

/**
 * Profile update: display name and/or avatar. Avatar buffers go to the configured
 * storage provider (STORAGE_PROVIDER); the previous avatar file is removed
 * best-effort after a successful update.
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
    avatarStorageProvider?: StorageProvider;
    legacyAvatarUrl?: string | null;
    legacyAvatarFileId?: string | null;
  } = {};
  if (input.name !== undefined) updates.name = input.name;

  let previousFileId: string | null = null;
  let previousProvider: StorageProvider = "ftp";
  if (file) {
    const current = await findUserDocById(userId);
    if (!current) {
      throw new AppError("Account not found", 404, "USER_NOT_FOUND");
    }
    previousFileId = current.avatarFileId ?? null;
    previousProvider = current.avatarStorageProvider ?? "ftp";
    const uploaded = await uploadAvatar(file.buffer, file.originalname, userId);
    updates.avatarUrl = uploaded.url;
    updates.avatarFileId = uploaded.fileId;
    updates.avatarStorageProvider = uploaded.storageProvider;
    // Keep rollback values when the binary moves providers.
    if (uploaded.storageProvider !== previousProvider && previousFileId) {
      updates.legacyAvatarUrl = current.avatarUrl ?? null;
      updates.legacyAvatarFileId = previousFileId;
    }
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
  if (currentPassword === newPassword) {
    throw new AppError(
      "New password must be different from the current password",
      400,
      "PASSWORD_UNCHANGED",
    );
  }
  const matches = await bcrypt.compare(currentPassword, doc.passwordHash);
  if (!matches) {
    throw new AppError(
      "Current password is incorrect",
      400,
      "CURRENT_PASSWORD_INCORRECT",
    );
  }
  await updateUserById(userId, {
    passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS),
  });
}

/**
 * Set a new password for an already-authenticated user. No current password
 * is required because the caller presents a valid access token (JWT).
 */
export async function setPassword(userId: string, newPassword: string): Promise<void> {
  const doc = await findUserByIdWithHash(userId);
  if (!doc) {
    throw new AppError("Account not found", 404, "USER_NOT_FOUND");
  }
  const matches = await bcrypt.compare(newPassword, doc.passwordHash);
  if (matches) {
    throw new AppError(
      "New password must be different from the current password",
      400,
      "PASSWORD_UNCHANGED",
    );
  }
  await updateUserById(userId, {
    passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS),
  });
}

export async function listAccounts(
  query: ListUsersQuery,
): Promise<Paginated<SafeUser>> {
  return listUsers(query);
}

export interface CustomerDetail {
  user: SafeUser;
  bookings: Array<{
    id: string;
    bookingNumber: string;
    status: string;
    paymentStatus: string;
    checkIn: Date;
    checkOut: Date;
    total: number;
    currency: string;
  }>;
  paymentSummary: { paid: number; refunded: number; currency: string | null };
  cancellations: Array<{
    bookingNumber: string;
    cancelledAt: Date | null;
    reason: string | null;
  }>;
}

/** Admin customer detail (docs 07 §43-45): profile + history + money, never secrets. */
export async function getCustomerDetail(
  userId: string,
): Promise<CustomerDetail> {
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND");
  }
  const history = await listBookingsByUser(userId, { page: 1, limit: 100 });
  let paid = 0;
  let refunded = 0;
  let currency: string | null = null;
  for (const booking of history.data) {
    currency ??= booking.pricing.currency;
    const rows = await listPaymentsByBooking(booking.id);
    for (const row of rows) {
      currency = row.currency;
      if (row.status === "PAID") {
        paid += row.amount;
      } else if (
        row.status === "PARTIALLY_REFUNDED" ||
        row.status === "REFUNDED"
      ) {
        const refundedForPayment = await sumSucceededRefunds(row.id);
        refunded += refundedForPayment;
        paid += Math.max(0, row.amount - refundedForPayment);
      }
    }
  }
  return {
    user,
    bookings: history.data.map((booking) => ({
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      total: booking.pricing.total,
      currency: booking.pricing.currency,
    })),
    paymentSummary: { paid, refunded, currency },
    cancellations: history.data
      .filter((booking) => booking.status === "CANCELLED")
      .map((booking) => ({
        bookingNumber: booking.bookingNumber,
        cancelledAt: booking.cancellation.cancelledAt,
        reason: booking.cancellation.reason,
      })),
  };
}

/** Enable/disable a customer account. Staff can never disable themselves. */
export async function setAccountStatus(
  userId: string,
  actorId: string,
  isActive: boolean,
): Promise<SafeUser> {
  if (userId === actorId) {
    throw new AppError(
      "You cannot change your own account status",
      400,
      "CANNOT_MODIFY_SELF",
    );
  }
  const updated = await updateUserById(userId, { isActive });
  if (!updated) {
    throw new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND");
  }
  return updated;
}
