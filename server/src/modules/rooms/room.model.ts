import mongoose from "mongoose";
import { ROOM_STATUSES } from "./room.types";
import type { RoomStatus } from "./room.types";

export interface RoomDocument extends mongoose.Document {
  propertyId: mongoose.Types.ObjectId;
  roomTypeId: mongoose.Types.ObjectId;
  name: string;
  roomNumber: string;
  floor: string | null;
  status: RoomStatus;
  /** Physical condition note, nullable. e.g. refurbishment state. */
  condition: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new mongoose.Schema<RoomDocument>(
  {
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    roomTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "RoomType", required: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
    roomNumber: { type: String, required: true, trim: true, minlength: 1, maxlength: 20 },
    floor: { type: String, default: null },
    status: { type: String, enum: ROOM_STATUSES, default: "ACTIVE", required: true },
    condition: { type: String, default: null, maxlength: 1000 },
    notes: { type: String, default: null },
  },
  { timestamps: true },
);

roomSchema.index({ propertyId: 1, roomNumber: 1 }, { unique: true });
roomSchema.index({ propertyId: 1, roomTypeId: 1, status: 1 });

// Guarded for --hot reloads.
export const RoomModel =
  mongoose.models.Room ?? mongoose.model<RoomDocument>("Room", roomSchema);
