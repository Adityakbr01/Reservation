import { prisma } from "../../config/database";
import { newId } from "../../utils/id";
import type { PaginationQuery } from "../../utils/pagination";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";
import type { RoomType, RoomTypeStatus } from "./room-type.types";

export interface RoomTypeDocLike {
  id: string;
  _id: { toString(): string };
  propertyId: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  beds: any;
  amenities: any;
  images: any;
  media: any;
  propertyDetailsHtml: string | null;
  layoutHtml: string | null;
  floorplanMediaIds: any;
  locationText: string | null;
  surroundingsHtml: string | null;
  mapLat: any;
  mapLng: any;
  mapEmbedUrl: string | null;
  welcomeHamperIncluded: boolean;
  welcomeHamperDescription: string | null;
  welcomeHamperImageMediaId: string | null;
  welcomeHamperHtml: string | null;
  amenityIds: any;
  bedrooms: number | null;
  bathrooms: number | null;
  maxDogs: number | null;
  status: RoomTypeStatus;
  seo: any;
  createdAt: Date;
  updatedAt: Date;
}

export function toRoomType(doc: any): RoomType {
  const beds = Array.isArray(doc.beds) ? doc.beds : (typeof doc.beds === "string" ? JSON.parse(doc.beds) : []);
  const amenities = Array.isArray(doc.amenities) ? doc.amenities : (typeof doc.amenities === "string" ? JSON.parse(doc.amenities) : []);
  const images = Array.isArray(doc.images) ? doc.images : (typeof doc.images === "string" ? JSON.parse(doc.images) : []);
  const mediaRaw = Array.isArray(doc.media) ? doc.media : (typeof doc.media === "string" ? JSON.parse(doc.media) : []);
  const floorplanMediaIds = Array.isArray(doc.floorplanMediaIds) ? doc.floorplanMediaIds : (typeof doc.floorplanMediaIds === "string" ? JSON.parse(doc.floorplanMediaIds) : []);
  const amenityIds = Array.isArray(doc.amenityIds) ? doc.amenityIds : (typeof doc.amenityIds === "string" ? JSON.parse(doc.amenityIds) : []);
  const seo = doc.seo ? (typeof doc.seo === "string" ? JSON.parse(doc.seo) : doc.seo) : null;

  const media = mediaRaw.length > 0
    ? mediaRaw.map((m: any) => ({
        mediaId: m.mediaId,
        kind: m.kind ?? "image",
        altText: m.altText ?? null,
        sortOrder: m.sortOrder ?? 0,
      }))
    : images.map((image: any) => ({
        mediaId: image.mediaId,
        kind: "image" as const,
        altText: image.altText ?? null,
        sortOrder: image.sortOrder ?? 0,
      }));

  return {
    id: doc.id ?? doc._id?.toString(),
    propertyId: typeof doc.propertyId === "object" ? doc.propertyId.toString() : doc.propertyId,
    name: doc.name,
    slug: doc.slug,
    shortDescription: doc.shortDescription ?? null,
    description: doc.description ?? null,
    maxAdults: doc.maxAdults,
    maxChildren: doc.maxChildren ?? 0,
    maxOccupancy: doc.maxOccupancy,
    beds: beds.map((bed: any) => ({ type: bed.type, quantity: bed.quantity })),
    amenities: [...amenities],
    images: images.map((image: any) => ({
      mediaId: image.mediaId,
      altText: image.altText ?? null,
      sortOrder: image.sortOrder ?? 0,
    })),
    media,
    propertyDetailsHtml: doc.propertyDetailsHtml ?? null,
    layoutHtml: doc.layoutHtml ?? null,
    floorplanMediaIds: [...floorplanMediaIds],
    locationText: doc.locationText ?? null,
    surroundingsHtml: doc.surroundingsHtml ?? null,
    mapLat: doc.mapLat !== null && doc.mapLat !== undefined ? Number(doc.mapLat) : null,
    mapLng: doc.mapLng !== null && doc.mapLng !== undefined ? Number(doc.mapLng) : null,
    mapEmbedUrl: doc.mapEmbedUrl ?? null,
    welcomeHamperIncluded: Boolean(doc.welcomeHamperIncluded),
    welcomeHamperDescription: doc.welcomeHamperDescription ?? null,
    welcomeHamperImageMediaId: doc.welcomeHamperImageMediaId ?? null,
    welcomeHamperHtml: doc.welcomeHamperHtml ?? null,
    amenityIds: amenityIds.map((id: any) => id.toString()),
    bedrooms: doc.bedrooms ?? null,
    bathrooms: doc.bathrooms ?? null,
    maxDogs: doc.maxDogs ?? null,
    dogPolicyEnabled: doc.dogPolicyEnabled !== null && doc.dogPolicyEnabled !== undefined ? Boolean(doc.dogPolicyEnabled) : (doc.maxDogs > 0),
    dogPolicyTitle: doc.dogPolicyTitle ?? null,
    dogPolicySubtitle: doc.dogPolicySubtitle ?? null,
    dogFee: doc.dogFee !== null && doc.dogFee !== undefined ? Number(doc.dogFee) : 70,
    dogPolicyImageMediaId: doc.dogPolicyImageMediaId ?? null,
    status: doc.status as RoomTypeStatus,
    seo,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface CreateRoomTypeInput {
  propertyId: string;
  name: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  beds?: RoomType["beds"];
  amenities?: string[];
  images?: RoomType["images"];
  media?: RoomType["media"];
  propertyDetailsHtml?: string | null;
  layoutHtml?: string | null;
  floorplanMediaIds?: string[];
  locationText?: string | null;
  surroundingsHtml?: string | null;
  mapLat?: number | null;
  mapLng?: number | null;
  mapEmbedUrl?: string | null;
  welcomeHamperIncluded?: boolean;
  welcomeHamperDescription?: string | null;
  welcomeHamperImageMediaId?: string | null;
  welcomeHamperHtml?: string | null;
  amenityIds?: string[];
  bedrooms?: number | null;
  bathrooms?: number | null;
  maxDogs?: number | null;
  dogPolicyEnabled?: boolean | null;
  dogPolicyTitle?: string | null;
  dogPolicySubtitle?: string | null;
  dogFee?: number | null;
  dogPolicyImageMediaId?: string | null;
  status?: RoomTypeStatus;
  seo?: RoomType["seo"];
}

export async function createRoomType(input: CreateRoomTypeInput): Promise<RoomTypeDocLike> {
  const id = newId();
  const roomType = await prisma.roomType.create({
    data: {
      id,
      propertyId: input.propertyId,
      name: input.name,
      slug: input.slug,
      shortDescription: input.shortDescription ?? null,
      description: input.description ?? null,
      maxAdults: input.maxAdults,
      maxChildren: input.maxChildren ?? 0,
      maxOccupancy: input.maxOccupancy,
      beds: (input.beds ?? []) as any,
      amenities: (input.amenities ?? []) as any,
      images: (input.images ?? []) as any,
      media: (input.media ?? []) as any,
      propertyDetailsHtml: input.propertyDetailsHtml ?? null,
      layoutHtml: input.layoutHtml ?? null,
      floorplanMediaIds: (input.floorplanMediaIds ?? []) as any,
      locationText: input.locationText ?? null,
      surroundingsHtml: input.surroundingsHtml ?? null,
      mapLat: input.mapLat ?? null,
      mapLng: input.mapLng ?? null,
      mapEmbedUrl: input.mapEmbedUrl ?? null,
      welcomeHamperIncluded: input.welcomeHamperIncluded ?? false,
      welcomeHamperDescription: input.welcomeHamperDescription ?? null,
      welcomeHamperImageMediaId: input.welcomeHamperImageMediaId ?? null,
      welcomeHamperHtml: input.welcomeHamperHtml ?? null,
      amenityIds: (input.amenityIds ?? []) as any,
      bedrooms: input.bedrooms ?? null,
      bathrooms: input.bathrooms ?? null,
      maxDogs: input.maxDogs ?? null,
      dogPolicyEnabled: input.dogPolicyEnabled ?? false,
      dogPolicyTitle: input.dogPolicyTitle ?? null,
      dogPolicySubtitle: input.dogPolicySubtitle ?? null,
      dogFee: input.dogFee ?? 70,
      dogPolicyImageMediaId: input.dogPolicyImageMediaId ?? null,
      status: input.status ?? "DRAFT",
      seo: (input.seo ?? null) as any,
    },
  });
  return {
    ...roomType,
    status: roomType.status as RoomTypeStatus,
    _id: { toString: () => roomType.id },
  };
}

export async function findRoomTypeById(id: string): Promise<RoomType | null> {
  const doc = await prisma.roomType.findUnique({ where: { id } });
  return doc ? toRoomType(doc) : null;
}

export async function findRoomTypeDocById(id: string): Promise<RoomTypeDocLike | null> {
  const doc = await prisma.roomType.findUnique({ where: { id } });
  return doc ? { ...doc, status: doc.status as RoomTypeStatus, _id: { toString: () => doc.id } } : null;
}

export async function findRoomTypeBySlug(propertyId: string, slug: string): Promise<RoomType | null> {
  const doc = await prisma.roomType.findFirst({
    where: { propertyId, slug },
  });
  return doc ? toRoomType(doc) : null;
}

export interface ListRoomTypesFilter extends PaginationQuery {
  q?: string;
  status?: RoomTypeStatus;
  onlyActive?: boolean;
  minOccupancy?: number;
}

export async function listRoomTypes(filter: ListRoomTypesFilter): Promise<Paginated<RoomType>> {
  const { page, limit, q, status, onlyActive, minOccupancy } = filter;
  const where: any = {};
  if (onlyActive) {
    where.status = "ACTIVE";
  } else if (status) {
    where.status = status;
  }
  if (minOccupancy !== undefined) {
    where.maxOccupancy = { gte: minOccupancy };
  }
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { slug: { contains: q } },
    ];
  }
  const [total, docs] = await Promise.all([
    prisma.roomType.count({ where }),
    prisma.roomType.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return paginatedResponse(
    docs.map((doc) => toRoomType(doc)),
    page,
    limit,
    total,
  );
}

export type UpdateRoomTypeInput = Partial<
  Pick<
    CreateRoomTypeInput,
    | "name"
    | "slug"
    | "shortDescription"
    | "description"
    | "maxAdults"
    | "maxChildren"
    | "maxOccupancy"
    | "beds"
    | "amenities"
    | "images"
    | "media"
    | "propertyDetailsHtml"
    | "layoutHtml"
    | "floorplanMediaIds"
    | "locationText"
    | "surroundingsHtml"
    | "mapLat"
    | "mapLng"
    | "mapEmbedUrl"
    | "welcomeHamperIncluded"
    | "welcomeHamperDescription"
    | "welcomeHamperImageMediaId"
    | "welcomeHamperHtml"
    | "amenityIds"
    | "bedrooms"
    | "bathrooms"
    | "maxDogs"
    | "dogPolicyEnabled"
    | "dogPolicyTitle"
    | "dogPolicySubtitle"
    | "dogFee"
    | "dogPolicyImageMediaId"
    | "status"
    | "seo"
  >
>;

export async function updateRoomTypeById(
  id: string,
  input: UpdateRoomTypeInput,
): Promise<RoomType | null> {
  try {
    const doc = await prisma.roomType.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.shortDescription !== undefined ? { shortDescription: input.shortDescription } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.maxAdults !== undefined ? { maxAdults: input.maxAdults } : {}),
        ...(input.maxChildren !== undefined ? { maxChildren: input.maxChildren } : {}),
        ...(input.maxOccupancy !== undefined ? { maxOccupancy: input.maxOccupancy } : {}),
        ...(input.beds !== undefined ? { beds: input.beds as any } : {}),
        ...(input.amenities !== undefined ? { amenities: input.amenities as any } : {}),
        ...(input.images !== undefined ? { images: input.images as any } : {}),
        ...(input.media !== undefined ? { media: input.media as any } : {}),
        ...(input.propertyDetailsHtml !== undefined ? { propertyDetailsHtml: input.propertyDetailsHtml } : {}),
        ...(input.layoutHtml !== undefined ? { layoutHtml: input.layoutHtml } : {}),
        ...(input.floorplanMediaIds !== undefined ? { floorplanMediaIds: input.floorplanMediaIds as any } : {}),
        ...(input.locationText !== undefined ? { locationText: input.locationText } : {}),
        ...(input.surroundingsHtml !== undefined ? { surroundingsHtml: input.surroundingsHtml } : {}),
        ...(input.mapLat !== undefined ? { mapLat: input.mapLat } : {}),
        ...(input.mapLng !== undefined ? { mapLng: input.mapLng } : {}),
        ...(input.mapEmbedUrl !== undefined ? { mapEmbedUrl: input.mapEmbedUrl } : {}),
        ...(input.welcomeHamperIncluded !== undefined ? { welcomeHamperIncluded: input.welcomeHamperIncluded } : {}),
        ...(input.welcomeHamperDescription !== undefined ? { welcomeHamperDescription: input.welcomeHamperDescription } : {}),
        ...(input.welcomeHamperImageMediaId !== undefined ? { welcomeHamperImageMediaId: input.welcomeHamperImageMediaId } : {}),
        ...(input.welcomeHamperHtml !== undefined ? { welcomeHamperHtml: input.welcomeHamperHtml } : {}),
        ...(input.amenityIds !== undefined ? { amenityIds: input.amenityIds as any } : {}),
        ...(input.bedrooms !== undefined ? { bedrooms: input.bedrooms } : {}),
        ...(input.bathrooms !== undefined ? { bathrooms: input.bathrooms } : {}),
        ...(input.maxDogs !== undefined ? { maxDogs: input.maxDogs } : {}),
        ...(input.dogPolicyEnabled !== undefined ? { dogPolicyEnabled: input.dogPolicyEnabled } : {}),
        ...(input.dogPolicyTitle !== undefined ? { dogPolicyTitle: input.dogPolicyTitle } : {}),
        ...(input.dogPolicySubtitle !== undefined ? { dogPolicySubtitle: input.dogPolicySubtitle } : {}),
        ...(input.dogFee !== undefined ? { dogFee: input.dogFee } : {}),
        ...(input.dogPolicyImageMediaId !== undefined ? { dogPolicyImageMediaId: input.dogPolicyImageMediaId } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.seo !== undefined ? { seo: input.seo as any } : {}),
      },
    });
    return toRoomType(doc);
  } catch {
    return null;
  }
}
