import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  getAdminPropertyHandler,
  getPublicPropertyHandler,
  updatePropertyHandler,
} from "./property.controller";
import { updatePropertySchema } from "./property.schema";

export const publicPropertyRouter = Router();

publicPropertyRouter.get("/", getPublicPropertyHandler);

export const adminPropertyRouter = Router();

adminPropertyRouter.use(authenticate, authorize("admin"));
adminPropertyRouter.get("/", getAdminPropertyHandler);
adminPropertyRouter.patch("/", validate({ body: updatePropertySchema }), updatePropertyHandler);
