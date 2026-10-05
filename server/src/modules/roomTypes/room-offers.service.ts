import mongoose from "mongoose";
import { AppError } from "../../utils/app-error";
import { OfferModel } from "../cms/cms.model";
import { CouponModel } from "../coupons/coupon.model";
import { ensureProperty } from "../properties/property.service";
import { findRoomTypeById } from "./room-type.repository";

export interface RoomOffer {
  id: string;
  title: string;
  slug: string;
  description: string;
  imageMediaId: string | null;
  validFrom: string | null;
  validUntil: string | null;
  /** Badge text, e.g. "20% OFF". */
  badgeLabel: string;
  couponCode: string;
}

function formatMinor(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
    }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}

/** Badge text for the clickable offer badge. Pure — unit-tested. */
export function offerBadgeLabel(
  discountType: "PERCENTAGE" | "FIXED",
  discountValue: number,
  currency: string,
): string {
  if (discountType === "PERCENTAGE") return `${discountValue}% OFF`;
  return `SAVE ${formatMinor(discountValue, currency)}`;
}

/**
 * Published offers applicable to a room type, for the clickable
 * offer badge + dialog on the detail page. An offer shows when its
 * linked coupon is ACTIVE, not yet ended, and either applies to all
 * rooms or lists this room type. Display-validity is the stay window
 * (validFrom/validUntil), so upcoming offers still show.
 */
export async function listRoomOffers(roomTypeId: string): Promise<RoomOffer[]> {
  const roomType = await findRoomTypeById(roomTypeId);
  if (!roomType) {
    throw new AppError("Room type not found", 404, "ROOM_TYPE_NOT_FOUND");
  }
  const property = await ensureProperty();
  const now = new Date();
  const offers = await OfferModel.find({ status: "PUBLISHED" })
    .sort({ validFrom: 1, createdAt: 1 })
    .exec();
  const out: RoomOffer[] = [];
  for (const offer of offers) {
    if (!offer.couponId) continue;
    const coupon = await CouponModel.findById(offer.couponId).exec();
    if (!coupon || coupon.status !== "ACTIVE") continue;
    if (coupon.validUntil && coupon.validUntil.getTime() < now.getTime()) continue;
    const limited = ((coupon.applicableRoomTypeIds ?? []) as mongoose.Types.ObjectId[]).map((id) =>
      id.toString(),
    );
    if (limited.length > 0 && !limited.includes(roomType.id)) continue;
    const badgeLabel = offerBadgeLabel(coupon.discountType, coupon.discountValue, property.currency);
    out.push({
      id: offer._id.toString(),
      title: offer.title,
      slug: offer.slug,
      description: offer.description ?? "",
      imageMediaId: offer.imageMediaId ? offer.imageMediaId.toString() : null,
      validFrom: offer.validFrom ? offer.validFrom.toISOString() : null,
      validUntil: offer.validUntil ? offer.validUntil.toISOString() : null,
      badgeLabel,
      couponCode: coupon.code,
    });
  }
  return out;
}
