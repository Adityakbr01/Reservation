import { prisma } from "../../config/database";

export const BookingModel = {
  countDocuments: (_query?: any) => ({
    exec: async () => prisma.booking.count(),
  }),
  find: (_query?: any) => ({
    select: (_fields?: string) => ({
      exec: async () => {
        const rows = await prisma.booking.findMany();
        return rows.map((r) => ({ ...r, _id: { toString: () => r.id } }));
      },
    }),
  }),
};
