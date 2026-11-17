export interface CottageCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  allow_multiple: boolean;
  allowMultiple: boolean;
  sort_order?: number;
  sortOrder?: number;
  status?: "ACTIVE" | "INACTIVE";
  cottagesCount?: number;
  cottages_count?: number;
}

export interface CreateCategoryPayload {
  name: string;
  slug?: string;
  description?: string | null;
  allow_multiple?: boolean;
  allowMultiple?: boolean;
  sort_order?: number;
  status?: "ACTIVE" | "INACTIVE";
}

export type UpdateCategoryPayload = Partial<CreateCategoryPayload>;
