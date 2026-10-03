export type RoomTypeStatus = "DRAFT" | "ACTIVE" | "INACTIVE";

export interface RoomTypeBed {
  type: string;
  quantity: number;
}

export interface RoomTypeImage {
  mediaId: string;
  url?: string | null;
  altText: string | null;
}

export interface RoomType {
  id: string;
  propertyId: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  beds: RoomTypeBed[];
  amenities: string[];
  status: RoomTypeStatus;
  images: RoomTypeImage[];
  createdAt: string;
  updatedAt: string;
}

export interface RoomTypeFilters {
  page: number;
  limit: number;
  q?: string;
  status?: RoomTypeStatus;
}

export interface CreateRoomTypePayload {
  name: string;
  slug?: string;
  shortDescription?: string | null;
  description?: string | null;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  beds?: RoomTypeBed[];
  amenities?: string[];
  images?: Array<{ mediaId: string; altText: string | null; sortOrder: number }>;
  status?: RoomTypeStatus;
}

export type UpdateRoomTypePayload = Partial<CreateRoomTypePayload>;
