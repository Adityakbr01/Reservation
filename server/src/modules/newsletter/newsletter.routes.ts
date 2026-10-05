import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  adminDeleteSubscriberHandler,
  adminListSubscribersHandler,
  publicSubscribeHandler,
  publicUnsubscribeHandler,
} from "./newsletter.controller";
import { listSubscribersQuerySchema, subscribeSchema, subscriberIdParamsSchema } from "./newsletter.schema";

export const adminNewsletterRouter = Router();
adminNewsletterRouter.use(authenticate, authorize("admin"));
adminNewsletterRouter.get("/", validate({ query: listSubscribersQuerySchema }), adminListSubscribersHandler);
adminNewsletterRouter.delete("/:id", validate({ params: subscriberIdParamsSchema }), adminDeleteSubscriberHandler);

export const publicNewsletterRouter = Router();
publicNewsletterRouter.post("/subscribe", validate({ body: subscribeSchema }), publicSubscribeHandler);
publicNewsletterRouter.get("/unsubscribe", publicUnsubscribeHandler);
