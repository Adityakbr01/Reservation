import mongoose from "mongoose";

export interface AvailabilityBlockDocument extends mongoose.Document {
  propertyId: mongoose.Types.ObjectId;
  roomId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  reason: string | null;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const availabilityBlockSchema = new mongoose.Schema<AvailabilityBlockDocument>(
  {
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, default: null, maxlength: 300 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

availabilityBlockSchema.index({ roomId: 1, startDate: 1, endDate: 1 });
availabilityBlockSchema.index({ propertyId: 1, startDate: 1, endDate: 1 });

// Guarded for --hot reloads.
export const AvailabilityBlockModel =
  mongoose.models.AvailabilityBlock ??
  mongoose.model<AvailabilityBlockDocument>("AvailabilityBlock", availabilityBlockSchema);
