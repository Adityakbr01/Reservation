import { prisma } from "../../config/database";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";
import { newId } from "../../utils/id";

export const ENQUIRY_STATUSES = ["NEW", "CONTACTED", "BOOKED", "CLOSED"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export interface Enquiry {
  id: string;
  title: string | null;
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  holidayBudget: string | null;
  partySize: number | null;
  bedrooms: number | null;
  fromDate: string | null;
  toDate: string | null;
  specificLocation: string | null;
  dogFriendly: boolean | null;
  details: string | null;
  roomTypeId: string | null;
  status: EnquiryStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type EnquiryDocument = Enquiry & {
  _id: { toString: () => string };
};

export function toEnquiry(doc: any): Enquiry {
  return {
    id: doc.id ?? doc._id?.toString(),
    title: doc.title ?? null,
    firstName: doc.firstName,
    lastName: doc.lastName,
    email: doc.email,
    telephone: doc.telephone,
    holidayBudget: doc.holidayBudget ?? null,
    partySize: doc.partySize ?? null,
    bedrooms: doc.bedrooms ?? null,
    fromDate: doc.fromDate ?? null,
    toDate: doc.toDate ?? null,
    specificLocation: doc.specificLocation ?? null,
    dogFriendly: doc.dogFriendly ?? null,
    details: doc.details ?? null,
    roomTypeId: doc.roomTypeId ? String(doc.roomTypeId) : null,
    status: (doc.status as EnquiryStatus) ?? "NEW",
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const EnquiryModel = {
  create: async (data: any) => {
    const id = newId();
    const created = await prisma.enquiry.create({
      data: {
        id,
        title: data.title ?? null,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        telephone: data.telephone,
        holidayBudget: data.holidayBudget ?? null,
        partySize: data.partySize != null ? Number(data.partySize) : null,
        bedrooms: data.bedrooms != null ? Number(data.bedrooms) : null,
        fromDate: data.fromDate ?? null,
        toDate: data.toDate ?? null,
        specificLocation: data.specificLocation ?? null,
        dogFriendly: data.dogFriendly ?? null,
        details: data.details ?? null,
        roomTypeId: data.roomTypeId ? String(data.roomTypeId) : null,
        status: data.status ?? "NEW",
      },
    });
    return {
      ...created,
      _id: { toString: () => created.id },
    };
  },
  findById: (id: string) => ({
    exec: async () => {
      const doc = await prisma.enquiry.findUnique({ where: { id } });
      if (!doc) return null;
      return {
        ...doc,
        _id: { toString: () => doc.id },
      };
    },
  }),
  findByIdAndUpdate: (id: string, update: { status?: string }, _opts?: any) => ({
    exec: async () => {
      try {
        const doc = await prisma.enquiry.update({
          where: { id },
          data: {
            ...(update.status ? { status: update.status } : {}),
          },
        });
        return {
          ...doc,
          _id: { toString: () => doc.id },
        };
      } catch {
        return null;
      }
    },
  }),
};

export async function listEnquiries(filter: {
  page: number;
  limit: number;
  status?: EnquiryStatus;
  q?: string;
}): Promise<Paginated<Enquiry>> {
  const where: any = {};
  if (filter.status) where.status = filter.status;
  if (filter.q) {
    where.OR = [
      { firstName: { contains: filter.q } },
      { lastName: { contains: filter.q } },
      { email: { contains: filter.q } },
    ];
  }
  const [total, docs] = await Promise.all([
    prisma.enquiry.count({ where }),
    prisma.enquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
    }),
  ]);
  return paginatedResponse(docs.map(toEnquiry), filter.page, filter.limit, total);
}
