import type { QueryFilter } from "mongoose";
import type { PaginationQuery } from "../../utils/pagination";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";
import { UserModel } from "./user.model";
import type { UserDocument } from "./user.model";
import type { SafeUser, UserRole } from "./user.types";

/** Fields safe to expose. Single allow-list used by every read path. */
const SAFE_PROJECTION = "name email role isActive avatarUrl lastLoginAt createdAt updatedAt";

export function toSafeUser(doc: UserDocument): SafeUser {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    role: doc.role,
    isActive: doc.isActive,
    avatarUrl: doc.avatarUrl,
    lastLoginAt: doc.lastLoginAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

export async function createUser(input: CreateUserInput): Promise<UserDocument> {
  return UserModel.create(input);
}

export async function findUserByEmail(email: string): Promise<UserDocument | null> {
  return UserModel.findOne({ email }).select(SAFE_PROJECTION).exec();
}

/** Login path only: includes the password hash. Never return this to clients. */
export async function findUserByEmailWithHash(email: string): Promise<UserDocument | null> {
  return UserModel.findOne({ email }).select(`+passwordHash ${SAFE_PROJECTION}`).exec();
}

export async function findUserById(id: string): Promise<SafeUser | null> {
  const doc = await UserModel.findById(id).select(SAFE_PROJECTION).exec();
  return doc ? toSafeUser(doc) : null;
}

/** Full document access for internal flows (avatar file refs, hashes). */
export async function findUserDocById(id: string): Promise<UserDocument | null> {
  return UserModel.findById(id).exec();
}

/** Hash included. Internal use only — never return this to clients. */
export async function findUserByIdWithHash(id: string): Promise<UserDocument | null> {
  return UserModel.findById(id).select("+passwordHash").exec();
}

export interface ListUsersFilter extends PaginationQuery {
  q?: string;
  role?: UserRole;
}

/** Admin account listing. Always the standard paginated contract. */
export async function listUsers(filter: ListUsersFilter): Promise<Paginated<SafeUser>> {
  const { page, limit, q, role } = filter;
  const query: QueryFilter<UserDocument> = {};
  if (role) query.role = role;
  if (q) {
    const pattern = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ name: pattern }, { email: pattern }];
  }
  const [total, docs] = await Promise.all([
    UserModel.countDocuments(query).exec(),
    UserModel.find(query)
      .select(SAFE_PROJECTION)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec(),
  ]);
  return paginatedResponse(
    docs.map((doc) => toSafeUser(doc)),
    page,
    limit,
    total,
  );
}

export interface UpdateUserInput {
  name?: string;
  isActive?: boolean;
  lastLoginAt?: Date;
  passwordHash?: string;
  passwordResetTokenHash?: string | null;
  passwordResetExpires?: Date | null;
  avatarUrl?: string | null;
  avatarFileId?: string | null;
  role?: UserRole;
}

export async function updateUserById(id: string, input: UpdateUserInput): Promise<SafeUser | null> {
  const doc = await UserModel.findByIdAndUpdate(id, input, { returnDocument: "after" })
    .select(SAFE_PROJECTION)
    .exec();
  return doc ? toSafeUser(doc) : null;
}

export async function findUserByResetTokenHash(tokenHash: string): Promise<UserDocument | null> {
  return UserModel.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  })
    .select(`+passwordResetTokenHash +passwordResetExpires ${SAFE_PROJECTION}`)
    .exec();
}
