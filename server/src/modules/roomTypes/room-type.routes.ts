import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { idParamsSchema } from "../../utils/validators";
import {
  createRoomTypeHandler,
  getPublicRoomTypeHandler,
  getRoomTypeHandler,
  listPublicRoomTypesHandler,
  listRoomTypesHandler,
  updateRoomTypeHandler,
} from "./room-type.controller";
import {
  createRoomTypeSchema,
  listRoomTypesQuerySchema,
  publicRoomTypesQuerySchema,
  updateRoomTypeSchema,
} from "./room-type.schema";

export const adminRoomTypesRouter = Router();

adminRoomTypesRouter.use(authenticate, authorize("admin"));
adminRoomTypesRouter.get("/", validate({ query: listRoomTypesQuerySchema }), listRoomTypesHandler);
adminRoomTypesRouter.post("/", validate({ body: createRoomTypeSchema }), createRoomTypeHandler);
adminRoomTypesRouter.get("/:id", validate({ params: idParamsSchema }), getRoomTypeHandler);
adminRoomTypesRouter.patch(
  "/:id",
  validate({ params: idParamsSchema, body: updateRoomTypeSchema }),
  updateRoomTypeHandler,
);

export const publicRoomTypesRouter = Router();

publicRoomTypesRouter.get(
  "/",
  validate({ query: publicRoomTypesQuerySchema }),
  listPublicRoomTypesHandler,
);
publicRoomTypesRouter.get("/:slug", getPublicRoomTypeHandler);
