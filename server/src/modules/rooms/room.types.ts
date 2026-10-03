export const ROOM_STATUSES = ["ACTIVE", "INACTIVE", "MAINTENANCE"] as const;

export type RoomStatus = (typeof ROOM_STATUSES)[number];

export interface Room {
  id: string;
  propertyId: string;
  roomTypeId: string;
  name: string;
  roomNumber: string;
  floor: string | null;
  status: RoomStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
