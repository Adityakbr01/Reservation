export interface CottageBed {
  type: string;
  quantity: number;
}

export interface CottageImageRef {
  mediaId: string;
  altText: string | null;
  sortOrder: number;
}

export interface CottageExtra {
  id: string;
  title: string;
  description?: string;
  price: number;
  pricingType: "PER_PERSON" | "PER_STAY";
  imageMediaId?: string | null;
  imageUrl?: string | null;
  showInfo?: boolean;
  infoTitle?: string | null;
  infoText?: string | null;
}

/** Full cottage detail as returned by GET /api/public/cottages/:slug. */
export interface CottageDetail {
  id: string;
  propertyId: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  beds: CottageBed[];
  amenities: string[];
  images: CottageImageRef[];
  media?: Array<{ mediaId: string; kind: "image" | "video"; altText: string | null; sortOrder: number }>;
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
  max_dogs?: number | null;
  dogPolicyEnabled?: boolean;
  dog_policy_enabled?: boolean;
  dogPolicyTitle?: string | null;
  dog_policy_title?: string | null;
  dogPolicySubtitle?: string | null;
  dog_policy_subtitle?: string | null;
  dogFee?: number | null;
  dog_fee?: number | null;
  dogPolicyImageMediaId?: string | null;
  dog_policy_image_media_id?: string | null;
  dogPolicyImageUrl?: string | null;
  dog_policy_image_url?: string | null;
  extras?: CottageExtra[];
  status: "DRAFT" | "ACTIVE" | "INACTIVE";
  middleDescription?: string | null;
  aboutHeading?: string | null;
  aboutText?: string | null;
  aboutImageMediaId?: string | null;
  aboutImageUrl?: string | null;
  overviewBullets?: string[] | null;
  sectionSettings?: {
    showSubtitle?: boolean;
    showMiddleDescription?: boolean;
    showOverviewBullets?: boolean;
    showAboutImage?: boolean;
    tabs?: {
      overview?: boolean;
      availability?: boolean;
      details?: boolean;
      layout?: boolean;
      location?: boolean;
      reviews?: boolean;
    };
  } | null;
}

