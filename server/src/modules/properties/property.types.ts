export const PROPERTY_STATUSES = ["ACTIVE", "INACTIVE"] as const;

export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export interface PropertyContact {
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Property {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  contact: PropertyContact;
  checkInTime: string;
  checkOutTime: string;
  timezone: string;
  currency: string;
  status: PropertyStatus;
  createdAt: Date;
  updatedAt: Date;
}
