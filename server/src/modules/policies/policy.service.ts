import { logger } from "../../config/logger";
import {
  createPolicy,
  findDefaultPolicy,
  findPolicyById,
  listPolicies,
  updatePolicyById,
} from "./policy.repository";
import type { CreatePolicyInput, UpdatePolicyInput } from "./policy.repository";
import type { CancellationPolicy } from "./policy.repository";
import type { BookingStatus } from "../bookings/booking.types";

export interface CancellationEvaluation {
  isCancellable: boolean;
  /** Minor units actually refundable right now. */
  refundAmount: number;
  /** Percentage applied (0-100). */
  refundPercentage: number;
  reason: string;
  policyName: string | null;
}

/**
 * Approved business default (confirmed): free cancellation until 24h before
 * check-in with a full refund of the paid total. Seeded when nothing is
 * configured — never silently invented per-booking.
 */
const FALLBACK_POLICY = {
  name: "Standard flexible (approved default)",
  freeCancellationHours: 24,
  refundPercentage: 100,
} as const;

export async function ensureDefaultPolicy(propertyId: string): Promise<CancellationPolicy> {
  const existing = await findDefaultPolicy(propertyId);
  if (existing) return existing;
  const doc = await createPolicy({
    propertyId,
    ...FALLBACK_POLICY,
    isDefault: true,
  });
  logger.info("Seeded default cancellation policy");
  const created = await findPolicyById(doc._id.toString());
  if (!created) {
    throw new Error("Default cancellation policy could not be created");
  }
  return created;
}

/**
 * Pure policy evaluation (docs 06 §35): isCancellable, refundAmount,
 * refundPercentage, reason — always computed on the backend.
 */
export function evaluateCancellation(input: {
  status: BookingStatus;
  checkIn: Date;
  checkOut: Date;
  paidTotal: number;
  policy: Pick<CancellationPolicy, "name" | "freeCancellationHours" | "refundPercentage"> | null;
  now?: Date;
}): CancellationEvaluation {
  const { status, checkIn, checkOut, paidTotal, policy } = input;
  const now = input.now ?? new Date();
  const policyName = policy?.name ?? FALLBACK_POLICY.name;

  if (status !== "HELD" && status !== "PAYMENT_PENDING" && status !== "CONFIRMED") {
    return {
      isCancellable: false,
      refundAmount: 0,
      refundPercentage: 0,
      reason: "Booking cannot be cancelled in its current state",
      policyName,
    };
  }
  if (now.getTime() >= checkOut.getTime()) {
    return {
      isCancellable: false,
      refundAmount: 0,
      refundPercentage: 0,
      reason: "Stay has already ended",
      policyName,
    };
  }
  if (paidTotal <= 0) {
    return {
      isCancellable: true,
      refundAmount: 0,
      refundPercentage: 0,
      reason: "No payment captured — nothing to refund",
      policyName,
    };
  }
  const freeHours = policy?.freeCancellationHours ?? FALLBACK_POLICY.freeCancellationHours;
  const pct = policy?.refundPercentage ?? FALLBACK_POLICY.refundPercentage;
  const cutoff = checkIn.getTime() - freeHours * 3_600_000;
  if (now.getTime() <= cutoff) {
    return {
      isCancellable: true,
      refundAmount: Math.round((paidTotal * pct) / 100),
      refundPercentage: pct,
      reason: `Free cancellation until ${freeHours}h before check-in`,
      policyName,
    };
  }
  return {
    isCancellable: true,
    refundAmount: 0,
    refundPercentage: 0,
    reason: "Outside the free-cancellation window — no refund",
    policyName,
  };
}

export async function resolvePolicy(
  propertyId: string,
): Promise<Pick<CancellationPolicy, "name" | "freeCancellationHours" | "refundPercentage">> {
  return ensureDefaultPolicy(propertyId);
}

export async function listAllPolicies(propertyId: string): Promise<CancellationPolicy[]> {
  return listPolicies(propertyId);
}

export async function createPolicyRecord(
  propertyId: string,
  input: Omit<CreatePolicyInput, "propertyId">,
): Promise<CancellationPolicy> {
  const doc = await createPolicy({ ...input, propertyId });
  const created = await findPolicyById(doc._id.toString());
  if (!created) {
    throw new Error("Cancellation policy could not be created");
  }
  return created;
}

export async function updatePolicyRecord(
  id: string,
  input: UpdatePolicyInput,
): Promise<CancellationPolicy | null> {
  const updated = await updatePolicyById(id, input);
  return updated;
}

export async function getPolicy(id: string): Promise<CancellationPolicy | null> {
  return findPolicyById(id);
}
