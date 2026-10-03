import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { AppError } from "../../utils/app-error";
import { ensureProperty } from "../properties/property.service";
import {
  createPolicyRecord,
  getPolicy,
  listAllPolicies,
  updatePolicyRecord,
} from "./policy.service";
import type { CreatePolicyInput, UpdatePolicyInput } from "./policy.schema";

/** GET /api/v1/admin/policies — property cancellation policies. */
export const listPoliciesHandler = asyncHandler(async (_req: Request, res: Response) => {
  const property = await ensureProperty();
  const policies = await listAllPolicies(property.id);
  res.status(200).json({ success: true, data: policies });
});

/** POST /api/v1/admin/policies — 201. */
export const createPolicyHandler = asyncHandler(async (req: Request, res: Response) => {
  const property = await ensureProperty();
  const policy = await createPolicyRecord(property.id, req.body as CreatePolicyInput);
  res.status(201).json({ success: true, data: policy });
});

/** GET /api/v1/admin/policies/:id. */
export const getPolicyHandler = asyncHandler(async (req: Request, res: Response) => {
  const policy = await getPolicy(req.params.id as string);
  if (!policy) {
    throw new AppError("Policy not found", 404, "POLICY_NOT_FOUND");
  }
  res.status(200).json({ success: true, data: policy });
});

/** PATCH /api/v1/admin/policies/:id. */
export const updatePolicyHandler = asyncHandler(async (req: Request, res: Response) => {
  const policy = await updatePolicyRecord(req.params.id as string, req.body as UpdatePolicyInput);
  if (!policy) {
    throw new AppError("Policy not found", 404, "POLICY_NOT_FOUND");
  }
  res.status(200).json({ success: true, data: policy });
});
