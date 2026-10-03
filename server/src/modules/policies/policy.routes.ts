import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { idParamsSchema } from "../../utils/validators";
import {
  createPolicyHandler,
  getPolicyHandler,
  listPoliciesHandler,
  updatePolicyHandler,
} from "./policy.controller";
import { createPolicySchema, updatePolicySchema } from "./policy.schema";

export const adminPoliciesRouter = Router();

adminPoliciesRouter.use(authenticate, authorize("admin"));
adminPoliciesRouter.get("/", listPoliciesHandler);
adminPoliciesRouter.post("/", validate({ body: createPolicySchema }), createPolicyHandler);
adminPoliciesRouter.get("/:id", validate({ params: idParamsSchema }), getPolicyHandler);
adminPoliciesRouter.patch(
  "/:id",
  validate({ params: idParamsSchema, body: updatePolicySchema }),
  updatePolicyHandler,
);
