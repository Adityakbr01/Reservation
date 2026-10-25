import { randomBytes } from "node:crypto";
import { prisma } from "../../config/database";
import type { PaginationQuery } from "../../utils/pagination";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";
import type { SafeUser, UserRole } from "./user.types";
import type { StorageProvider } from "../media/media.model";

export interface UserDocLike {
  id: string;
  _id: { toString(): string };
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl: string | null;
  avatarFileId: string | null;
  avatarStorageProvider: StorageProvider;
  legacyAvatarUrl: string | null;
  legacyAvatarFileId: string | null;
  passwordResetTokenHash: string | null;
  passwordResetExpires: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toUserDoc(user: any): UserDocLike {
  return {
    ...user,
    role: user.role as UserRole,
    avatarStorageProvider: (user.avatarStorageProvider ?? "ftp") as StorageProvider,
    _id: { toString: () => user.id },
  };
}

export function toSafeUser(doc: any): SafeUser {
  const id = doc.id ?? (typeof doc._id === "object" ? doc._id.toString() : doc._id);
  return {
    id,
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

export async function createUser(input: CreateUserInput): Promise<UserDocLike> {
  const id = randomBytes(12).toString("hex");
  const user = await prisma.user.create({
    data: {
      id,
      name: input.name,
      email: input.email.toLowerCase().trim(),
      passwordHash: input.passwordHash,
      role: input.role,
      isActive: true,
    },
  });
  return toUserDoc(user);
}

export async function findUserByEmail(email: string): Promise<UserDocLike | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  return user ? toUserDoc(user) : null;
}

/** Login path only: includes the password hash. Never return this to clients. */
export async function findUserByEmailWithHash(email: string): Promise<UserDocLike | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  return user ? toUserDoc(user) : null;
}

export async function findUserById(id: string): Promise<SafeUser | null> {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? toSafeUser(user) : null;
}

/** Full document access for internal flows (avatar file refs, hashes). */
export async function findUserDocById(id: string): Promise<UserDocLike | null> {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? toUserDoc(user) : null;
}

/** Hash included. Internal use only — never return this to clients. */
export async function findUserByIdWithHash(id: string): Promise<UserDocLike | null> {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? toUserDoc(user) : null;
}

export interface ListUsersFilter extends PaginationQuery {
  q?: string;
  role?: UserRole;
}

/** Admin account listing. Always the standard paginated contract. */
export async function listUsers(filter: ListUsersFilter): Promise<Paginated<SafeUser>> {
  const { page, limit, q, role } = filter;
  const where: any = {};
  if (role) where.role = role;
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
    ];
  }
  const [total, docs] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
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
  avatarStorageProvider?: StorageProvider;
  legacyAvatarUrl?: string | null;
  legacyAvatarFileId?: string | null;
  role?: UserRole;
}

export async function updateUserById(id: string, input: UpdateUserInput): Promise<SafeUser | null> {
  try {
    const user = await prisma.user.update({
      where: { id },
      data: input,
    });
    return toSafeUser(user);
  } catch {
    return null;
  }
}

export async function findUserByResetTokenHash(tokenHash: string): Promise<UserDocLike | null> {
  const user = await prisma.user.findFirst({
    where: {
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: { gt: new Date() },
    },
  });
  return user ? toUserDoc(user) : null;
}
