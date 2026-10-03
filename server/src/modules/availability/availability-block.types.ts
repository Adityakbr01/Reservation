export interface AvailabilityBlock {
  id: string;
  propertyId: string;
  roomId: string;
  startDate: Date;
  /** Exclusive end date: blocks nights [startDate, endDate). */
  endDate: Date;
  reason: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
