import mongoose from "mongoose";
import type { UserRole } from "./user.types";
import { USER_ROLES } from "./user.types";

export interface UserDocument extends mongoose.Document {
  name: string;
  email: string;
  /** bcrypt hash. select:false — explicitly selected only during login. */
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl: string | null;
  avatarFileId: string | null;
  /** Binary origin of the avatar ("local" = GoDaddy FTP key). Defaults to imagekit for old rows. */
  avatarStorageProvider: "imagekit" | "local";
  legacyAvatarUrl: string | null;
  legacyAvatarFileId: string | null;
  passwordResetTokenHash: string | null;
  passwordResetExpires: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 160,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: "user", required: true },
    isActive: { type: Boolean, default: true, required: true },
    avatarUrl: { type: String, default: null },
    avatarFileId: { type: String, default: null, select: false },
    avatarStorageProvider: { type: String, enum: ["imagekit", "local"], default: "imagekit" },
    legacyAvatarUrl: { type: String, default: null },
    legacyAvatarFileId: { type: String, default: null, select: false },
    passwordResetTokenHash: { type: String, default: null, select: false },
    passwordResetExpires: { type: Date, default: null, select: false },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// unique: true on email already creates that index. Only add what query
// patterns need: reset-token lookup during password reset.
userSchema.index({ passwordResetTokenHash: 1 }, { sparse: true });

// Guarded for --hot reloads: re-evaluating this module must not throw
// OverwriteModelError.
export const UserModel =
  mongoose.models.User ?? mongoose.model<UserDocument>("User", userSchema);
