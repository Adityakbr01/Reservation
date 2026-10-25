import { prisma } from "../../config/database";

export const PropertyModel = {
  findFirst: (args?: any) => prisma.property.findFirst(args),
};
