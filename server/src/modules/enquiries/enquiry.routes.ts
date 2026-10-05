import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  adminGetEnquiryHandler,
  adminListEnquiriesHandler,
  adminUpdateEnquiryHandler,
  publicCreateEnquiryHandler,
} from "./enquiry.controller";
import {
  createEnquirySchema,
  enquiryIdParamsSchema,
  listEnquiriesQuerySchema,
  updateEnquiryStatusSchema,
} from "./enquiry.schema";

export const adminEnquiriesRouter = Router();
adminEnquiriesRouter.use(authenticate, authorize("admin"));
adminEnquiriesRouter.get("/", validate({ query: listEnquiriesQuerySchema }), adminListEnquiriesHandler);
adminEnquiriesRouter.get("/:id", validate({ params: enquiryIdParamsSchema }), adminGetEnquiryHandler);
adminEnquiriesRouter.patch(
  "/:id",
  validate({ params: enquiryIdParamsSchema, body: updateEnquiryStatusSchema }),
  adminUpdateEnquiryHandler,
);

export const publicEnquiriesRouter = Router();
publicEnquiriesRouter.post("/", validate({ body: createEnquirySchema }), publicCreateEnquiryHandler);
