import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { idParamsSchema } from "../../utils/validators";
import {
  createRoomHandler,
  getRoomHandler,
  getRoomsOccupancyHandler,
  listRoomsHandler,
  updateRoomHandler,
} from "./room.controller";
import { createRoomSchema, listRoomsQuerySchema, occupancyQuerySchema, updateRoomSchema } from "./room.schema";

export const adminRoomsRouter = Router();

adminRoomsRouter.use(authenticate, authorize("admin"));
adminRoomsRouter.get("/", validate({ query: listRoomsQuerySchema }), listRoomsHandler);
adminRoomsRouter.get("/occupancy", validate({ query: occupancyQuerySchema }), getRoomsOccupancyHandler);
adminRoomsRouter.post("/", validate({ body: createRoomSchema }), createRoomHandler);
adminRoomsRouter.get("/:id", validate({ params: idParamsSchema }), getRoomHandler);
adminRoomsRouter.patch(
  "/:id",
  validate({ params: idParamsSchema, body: updateRoomSchema }),
  updateRoomHandler,
);
