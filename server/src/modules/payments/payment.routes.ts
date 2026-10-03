import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { idParamsSchema } from "../../utils/validators";
import { createIntentHandler, getPaymentHandler } from "./payment.controller";
import { createIntentSchema } from "./payment.schema";

export const paymentsRouter = Router();

paymentsRouter.use(authenticate);
paymentsRouter.post(
  "/create-intent",
  validate({ body: createIntentSchema }),
  createIntentHandler,
);
paymentsRouter.get("/:id", validate({ params: idParamsSchema }), getPaymentHandler);
