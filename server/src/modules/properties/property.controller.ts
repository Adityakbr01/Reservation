import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { AppError } from "../../utils/app-error";
import { ensureProperty, getProperty, updatePropertyDetails } from "./property.service";
import type { UpdatePropertyInput } from "./property.schema";

/** GET /api/public/property — published singleton, 404 until configured. */
export const getPublicPropertyHandler = asyncHandler(async (_req: Request, res: Response) => {
  const property = await getProperty();
  if (!property || property.status !== "ACTIVE") {
    throw new AppError("Property not found", 404, "PROPERTY_NOT_FOUND");
  }
  res.status(200).json({ success: true, data: property });
});

/** GET /api/v1/admin/properties — singleton, self-heals when missing. */
export const getAdminPropertyHandler = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json({ success: true, data: await ensureProperty() });
});

/** PATCH /api/v1/admin/properties — update singleton. */
export const updatePropertyHandler = asyncHandler(async (req: Request, res: Response) => {
  const property = await updatePropertyDetails(req.body as UpdatePropertyInput);
  res.status(200).json({ success: true, data: property });
});
