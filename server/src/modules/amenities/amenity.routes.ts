import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createAmenityHandler,
  deleteAmenityHandler,
  getAmenityHandler,
  listAmenitiesHandler,
  publicListAmenitiesHandler,
  updateAmenityHandler,
} from "./amenity.controller";
import {
  amenityIdParamsSchema,
  createAmenitySchema,
  listAmenitiesQuerySchema,
  updateAmenitySchema,
} from "./amenity.schema";

export const adminAmenitiesRouter = Router();
adminAmenitiesRouter.use(authenticate, authorize("admin"));
adminAmenitiesRouter.post("/", validate({ body: createAmenitySchema }), createAmenityHandler);
adminAmenitiesRouter.get("/", validate({ query: listAmenitiesQuerySchema }), listAmenitiesHandler);
adminAmenitiesRouter.get("/:id", validate({ params: amenityIdParamsSchema }), getAmenityHandler);
adminAmenitiesRouter.patch(
  "/:id",
  validate({ params: amenityIdParamsSchema, body: updateAmenitySchema }),
  updateAmenityHandler,
);
adminAmenitiesRouter.delete("/:id", validate({ params: amenityIdParamsSchema }), deleteAmenityHandler);

export const publicAmenitiesRouter = Router();
publicAmenitiesRouter.get("/", publicListAmenitiesHandler);
