import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { addDays } from "date-fns";
import App from "./App";
import { toDayKey } from "@/lib/date";
import type { AvailabilitySearchParams } from "@/modules/availability/types/availability.types";

/**
 * Build-time render for the home route. Only the marketing shell, search
 * form and loading placeholders are static; availability is fetched in the
 * browser after hydration.
 */
export function render(url: string) {
  const search: AvailabilitySearchParams = {
    checkIn: toDayKey(addDays(new Date(), 7)),
    checkOut: toDayKey(addDays(new Date(), 9)),
    adults: 2,
    children: 0,
    rooms: 1,
  };

  // HomePage reads this on the server so its state matches hydration.
  globalThis.__HS_SSG_SEARCH__ = search;

  const html = renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </StrictMode>,
  );

  return { html, search };
}
