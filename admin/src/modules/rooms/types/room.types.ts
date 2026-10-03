export type RoomStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

export interface Room {
  id: string;
  propertyId: string;
  roomTypeId: string;
  name: string;
  roomNumber: string;
  floor: string | null;
  status: RoomStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoomFilters {
  page: number;
  limit: number;
  q?: string;
  roomTypeId?: string;
  status?: RoomStatus;
}

export interface CreateRoomPayload {
  roomTypeId: string;
  name: string;
  roomNumber: string;
  floor?: string | null;
  status?: RoomStatus;
  notes?: string | null;
}

export type UpdateRoomPayload = Partial<CreateRoomPayload>;
