import { prisma } from "../../config/database";

export const BookingItemModel = {
  find: (_query?: any) => ({
    select: (_fields?: string) => ({
      exec: async () => {
        const rows = await prisma.bookingItem.findMany();
        return rows.map((r) => ({ ...r, _id: { toString: () => r.id } }));
      },
    }),
  }),
};
