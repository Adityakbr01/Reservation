import { BadgePercent } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import type { CottageOffer } from "../api/cottages.api";

export function formatOfferDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.getUTCDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  const month = date.toLocaleDateString("en-GB", {
    month: "short",
    timeZone: "UTC",
  });
  return `${day}${suffix} ${month} ${date.getUTCFullYear()}`;
}

export interface OfferDialogProps {
  offers: CottageOffer[];
  open: boolean;
  onClose: () => void;
}

/** Clickable-offer dialog ("1 OFFER" with terms). */
export function OfferDialog({ offers, open, onClose }: OfferDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="offers-dialog-title"
      closeClassName="text-white hover:bg-white/15 hover:text-white focus-visible:ring-white"
    >
      <div className="-m-5 mb-4 flex items-center justify-between bg-destructive px-5 py-3 text-white sm:-m-6 sm:mb-4 sm:px-6">
        <h2
          id="offers-dialog-title"
          className="py-0.5 pr-8 text-sm font-bold tracking-wide"
        >
          {offers.length} OFFER{offers.length === 1 ? "" : "S"}
        </h2>
      </div>
      <div className="space-y-6">
        {offers.map((offer) => {
          const from = formatOfferDate(offer.validFrom);
          const until = formatOfferDate(offer.validUntil);
          return (
            <div key={offer.id} className="space-y-2">
              <p className="flex items-center gap-2 text-lg font-bold">
                <BadgePercent
                  className="size-6 text-muted-foreground"
                  aria-hidden
                />
                {offer.badgeLabel}
                <span className="text-base font-medium text-muted-foreground">
                  {from && until ? `${from} to ${until}` : offer.title}
                </span>
              </p>
              {offer.description && (
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                  {offer.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Use code {offer.couponCode} at checkout.
              </p>
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}

export default OfferDialog;
