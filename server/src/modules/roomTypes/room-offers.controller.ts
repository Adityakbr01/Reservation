import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { listRoomOffers } from "./room-offers.service";

/** GET /api/public/room-types/:id/offers — published offers for the badge + dialog. */
export const listRoomOffersHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await listRoomOffers(req.params.id as string);
  res.status(200).json({ success: true, data: result });
});
