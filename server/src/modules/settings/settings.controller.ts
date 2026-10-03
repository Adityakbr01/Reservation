import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { recordAudit } from "../audit/audit.service";
import { getSiteSettings, updateSiteSettings } from "./settings.model";
import type { UpdateSettingsInput } from "./settings.schema";

/** GET /api/v1/admin/settings — full singleton (never secrets). */
export const adminGetSettingsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const result = await getSiteSettings();
  res.status(200).json({ success: true, data: result });
});

/** PATCH /api/v1/admin/settings — permission-restricted, audited in Phase 12. */
export const adminUpdateSettingsHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await updateSiteSettings(req.body as UpdateSettingsInput);
  await recordAudit(req, "SETTINGS_UPDATED", "settings", {
    entityId: result.id,
    after: { keys: Object.keys(req.body as Record<string, unknown>) },
  });
  res.status(200).json({ success: true, data: result });
});

/** GET /api/public/cms/site-settings — safe subset only (docs 08 §39). */
export const publicGetSettingsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const full = await getSiteSettings();
  const { id: _id, ...safe } = full;
  void _id;
  res.status(200).json({ success: true, data: safe });
});
