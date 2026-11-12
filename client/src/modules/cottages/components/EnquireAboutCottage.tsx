import { Link } from "react-router-dom";
import { ArrowRight, CalendarCheck, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Dialog from "@/components/ui/dialog";
import EnquiryForm from "@/modules/enquiry/components/EnquiryForm";
import { useState } from "react";
import { SITE_LINKS } from "@/config/links";
import { useSiteSettings } from "@/modules/cms/hooks/use-cms";

const DEFAULT_ENQUIRY = {
  isEnabled: true,
  heading: "Enquire about {cottage}",
  description: "Tell us your dates, party and budget — we will be in touch.",
  buttonLabel: "Enquire now",
  url: SITE_LINKS.enquireNow,
  openInNewTab: true,
  showBookNow: true,
  bookNowLabel: "Book now",
  dialogDescription:
    "Holiday budget, party size, dates, location, dog friendly — anything helps.",
};

export function EnquireAboutCottage({
  cottageId,
  cottageName,
  roomTypeId,
  roomName,
  bookNowHref,
  bookNowState,
  onBookNow,
}: {
  cottageId?: string;
  cottageName?: string;
  roomTypeId?: string;
  roomName?: string;
  /** Deep-link into checkout when dates and a live rate are already chosen. */
  bookNowHref?: string;
  bookNowState?: Record<string, unknown>;
  /** Otherwise, take the guest to the availability calendar to pick dates. */
  onBookNow?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: siteSettings } = useSiteSettings();
  const config = {
    ...DEFAULT_ENQUIRY,
    ...(siteSettings?.bookingPage?.enquiry ?? {}),
  };
  const id = cottageId || roomTypeId || "";
  const name = cottageName || roomName || "Cottage";

  if (config.isEnabled === false) return null;

  const heading =
    (config.heading ?? "").trim().replace(/\{cottage\}/gi, name) ||
    `Enquire about ${name}`;
  const description = (config.description ?? "").trim();
  const dialogDescription =
    (config.dialogDescription ?? "").trim() || description;
  const buttonLabel = (config.buttonLabel ?? "").trim() || "Enquire now";
  const bookNowLabel = (config.bookNowLabel ?? "").trim() || "Book now";
  const enquireUrl = (config.url ?? "").trim();

  const bookNowButton =
    config.showBookNow === false ? null : bookNowHref ? (
      <Button asChild className="h-11 w-full rounded-full px-6 sm:w-auto">
        <Link to={bookNowHref} state={bookNowState}>
          <CalendarCheck aria-hidden />
          {bookNowLabel}
          <ArrowRight aria-hidden />
        </Link>
      </Button>
    ) : (
      <Button
        type="button"
        className="h-11 w-full rounded-full px-6 sm:w-auto"
        onClick={onBookNow}
      >
        <CalendarCheck aria-hidden />
        {bookNowLabel}
        <ArrowRight aria-hidden />
      </Button>
    );

  const enquireButton = enquireUrl ? (
    <Button
      asChild
      variant="outline"
      className="h-11 w-full rounded-full border-brand/25 bg-background/70 px-6 hover:border-brand hover:bg-background sm:w-auto"
    >
      <a
        href={enquireUrl}
        target={config.openInNewTab === false ? undefined : "_blank"}
        rel={config.openInNewTab === false ? undefined : "noopener noreferrer"}
      >
        <MessageCircle aria-hidden />
        {buttonLabel}
      </a>
    </Button>
  ) : (
    <Button
      type="button"
      variant="outline"
      className="h-11 w-full rounded-full border-brand/25 bg-background/70 px-6 hover:border-brand hover:bg-background sm:w-auto"
      onClick={() => setOpen(true)}
    >
      <MessageCircle aria-hidden />
      {buttonLabel}
    </Button>
  );

  return (
    <section className="relative my-6 overflow-hidden rounded-2xl border border-brand/15 bg-gradient-to-br from-surface-2 via-surface-2 to-surface-3 p-5 sm:p-6">
      <div
        className="pointer-events-none absolute -right-8 -top-12 size-36 rounded-full bg-brand/10 blur-2xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="hidden size-11 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-sm sm:flex">
            <MessageCircle className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-medium tracking-tight sm:text-2xl">
              {heading}
            </h2>
            {description && (
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center md:shrink-0">
          {enquireButton}
          {bookNowButton}
        </div>
      </div>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="enquiry-dialog-title"
      >
        <h2
          id="enquiry-dialog-title"
          className="pr-10 font-display text-2xl font-light tracking-tight"
        >
          {heading}
        </h2>
        {dialogDescription && (
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            {dialogDescription}
          </p>
        )}
        <EnquiryForm
          roomTypeId={id}
          roomName={name}
          onSuccess={() => setOpen(false)}
        />
      </Dialog>
    </section>
  );
}

export default EnquireAboutCottage;
