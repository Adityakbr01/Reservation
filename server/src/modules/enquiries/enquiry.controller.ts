import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import type { RequestWithValidatedQuery } from "../../middleware/validate";
import { recordAudit } from "../audit/audit.service";
import { EnquiryModel, listEnquiries, toEnquiry } from "./enquiry.model";
import type { CreateEnquiryInput } from "./enquiry.schema";

export const publicCreateEnquiryHandler = asyncHandler(async (req: Request, res: Response) => {
  const doc = await EnquiryModel.create({ ...(req.body as CreateEnquiryInput), status: "NEW" });
  res.status(201).json({ success: true, data: toEnquiry(doc) });
});

export const adminListEnquiriesHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = (req as Request & RequestWithValidatedQuery).validatedQuery as {
    page: number;
    limit: number;
    status?: "NEW" | "CONTACTED" | "BOOKED" | "CLOSED";
    q?: string;
  };
  const result = await listEnquiries(query);
  res.status(200).json({ success: true, data: result.data, meta: result.meta });
});

export const adminGetEnquiryHandler = asyncHandler(async (req: Request, res: Response) => {
  const doc = await EnquiryModel.findById(req.params.id as string).exec();
  if (!doc) res.status(404).json({ success: false, error: { code: "ENQUIRY_NOT_FOUND", message: "Enquiry not found" } });
  else res.status(200).json({ success: true, data: toEnquiry(doc) });
});

export const adminUpdateEnquiryHandler = asyncHandler(async (req: Request, res: Response) => {
  const doc = await EnquiryModel.findByIdAndUpdate(req.params.id as string, { status: (req.body as { status: string }).status }, { returnDocument: "after" }).exec();
  if (!doc) res.status(404).json({ success: false, error: { code: "ENQUIRY_NOT_FOUND", message: "Enquiry not found" } });
  else {
    await recordAudit(req, "ENQUIRY_STATUS", "enquiry", { entityId: doc._id.toString(), after: { status: doc.status } });
    res.status(200).json({ success: true, data: toEnquiry(doc) });
  }
});
