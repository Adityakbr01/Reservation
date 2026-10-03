import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  adminGetSettingsHandler,
  adminUpdateSettingsHandler,
  publicGetSettingsHandler,
} from "./settings.controller";
import { updateSettingsSchema } from "./settings.schema";

export const adminSettingsRouter = Router();

adminSettingsRouter.use(authenticate, authorize("admin"));
adminSettingsRouter.get("/", adminGetSettingsHandler);
adminSettingsRouter.patch("/", validate({ body: updateSettingsSchema }), adminUpdateSettingsHandler);

export const publicSettingsRouter = Router();

publicSettingsRouter.get("/", publicGetSettingsHandler);
