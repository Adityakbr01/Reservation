import { prisma } from "../../config/database";

export const UserModel = {
  findFirst: (args?: any) => prisma.user.findFirst(args),
  findUnique: (args?: any) => prisma.user.findUnique(args),
};
