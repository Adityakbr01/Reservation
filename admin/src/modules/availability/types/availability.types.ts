export interface AvailabilityBlock {
  id: string;
  propertyId: string;
  roomId: string;
  startDate: string;
  /** Exclusive end date: blocks nights [startDate, endDate). */
  endDate: string;
  reason: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlockFilters {
  page: number;
  limit: number;
  roomId?: string;
  from?: string;
  to?: string;
}

export interface CreateBlockPayload {
  roomId: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
}
