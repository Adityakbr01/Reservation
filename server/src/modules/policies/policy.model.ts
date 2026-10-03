import mongoose from "mongoose";

export interface CancellationPolicyDocument extends mongoose.Document {
  propertyId: mongoose.Types.ObjectId;
  name: string;
  /** Free cancellation allowed until this many hours before check-in. */
  freeCancellationHours: number;
  /** Percentage (0-100) of the paid total refunded when eligible. */
  refundPercentage: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const cancellationPolicySchema = new mongoose.Schema<CancellationPolicyDocument>(
  {
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    freeCancellationHours: { type: Number, required: true, min: 0, max: 720 },
    refundPercentage: { type: Number, required: true, min: 0, max: 100 },
    isDefault: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

cancellationPolicySchema.index({ propertyId: 1, isDefault: 1 });

// Guarded for --hot reloads.
export const CancellationPolicyModel =
  mongoose.models.CancellationPolicy ??
  mongoose.model<CancellationPolicyDocument>("CancellationPolicy", cancellationPolicySchema);
