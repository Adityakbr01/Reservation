import mongoose from "mongoose";
import type { QueryFilter } from "mongoose";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";

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

export interface EnquiryDocument extends mongoose.Document {
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
  roomTypeId: mongoose.Types.ObjectId | null;
  status: EnquiryStatus;
  createdAt: Date;
  updatedAt: Date;
}

const enquirySchema = new mongoose.Schema<EnquiryDocument>(
  {
    title: { type: String, default: null, maxlength: 20 },
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, maxlength: 160 },
    telephone: { type: String, required: true, trim: true, maxlength: 40 },
    holidayBudget: { type: String, default: null, maxlength: 60 },
    partySize: { type: Number, default: null, min: 1, max: 50 },
    bedrooms: { type: Number, default: null, min: 0, max: 20 },
    fromDate: { type: String, default: null },
    toDate: { type: String, default: null },
    specificLocation: { type: String, default: null, maxlength: 200 },
    dogFriendly: { type: Boolean, default: null },
    details: { type: String, default: null, maxlength: 5000 },
    roomTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "RoomType", default: null },
    status: { type: String, enum: ENQUIRY_STATUSES, default: "NEW", required: true },
  },
  { timestamps: true },
);

enquirySchema.index({ status: 1, createdAt: -1 });
enquirySchema.index({ email: 1, createdAt: -1 });

export const EnquiryModel =
  mongoose.models.Enquiry ?? mongoose.model<EnquiryDocument>("Enquiry", enquirySchema);

export function toEnquiry(doc: EnquiryDocument): Enquiry {
  return {
    id: doc._id.toString(),
    title: doc.title,
    firstName: doc.firstName,
    lastName: doc.lastName,
    email: doc.email,
    telephone: doc.telephone,
    holidayBudget: doc.holidayBudget,
    partySize: doc.partySize,
    bedrooms: doc.bedrooms,
    fromDate: doc.fromDate,
    toDate: doc.toDate,
    specificLocation: doc.specificLocation,
    dogFriendly: doc.dogFriendly,
    details: doc.details,
    roomTypeId: doc.roomTypeId ? doc.roomTypeId.toString() : null,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function listEnquiries(filter: {
  page: number;
  limit: number;
  status?: EnquiryStatus;
  q?: string;
}): Promise<Paginated<Enquiry>> {
  const query: QueryFilter<EnquiryDocument> = {};
  if (filter.status) query.status = filter.status;
  if (filter.q) {
    query.$or = [
      { firstName: { $regex: filter.q, $options: "i" } },
      { lastName: { $regex: filter.q, $options: "i" } },
      { email: { $regex: filter.q, $options: "i" } },
    ];
  }
  const [total, docs] = await Promise.all([
    EnquiryModel.countDocuments(query).exec(),
    EnquiryModel.find(query).sort({ createdAt: -1 }).skip((filter.page - 1) * filter.limit).limit(filter.limit).exec(),
  ]);
  return paginatedResponse(docs.map(toEnquiry), filter.page, filter.limit, total);
}
