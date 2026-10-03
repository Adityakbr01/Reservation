/** Standard shape for every paginated list response body. */
export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

/** Default list params both apps share. */
export interface ListParams {
  page?: number;
  limit?: number;
  q?: string;
}
