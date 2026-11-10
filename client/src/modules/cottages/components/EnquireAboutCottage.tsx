import { Button } from "@/components/ui/button";
import Dialog from "@/components/ui/dialog";
import EnquiryForm from "@/modules/enquiry/components/EnquiryForm";
import { useState } from "react";
import { SITE_LINKS } from "@/config/links";

export function EnquireAboutCottage({
  cottageId,
  cottageName,
  roomTypeId,
  roomName,
}: {
  cottageId?: string;
  cottageName?: string;
  roomTypeId?: string;
  roomName?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = cottageId || roomTypeId || "";
  const name = cottageName || roomName || "Cottage";

  return (
    <section className="my-6 rounded-2xl border border-border bg-surface-2 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-medium tracking-tight">
            Enquire about {name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell us your dates, party and budget — we will be in touch.
          </p>
        </div>
        {SITE_LINKS.enquireNow && SITE_LINKS.enquireNow !== "#" ? (
          <Button asChild className="rounded-lg">
            <a
              href={SITE_LINKS.enquireNow}
              target="_blank"
              rel="noopener noreferrer"
            >
              Enquire now
              <span aria-hidden>→</span>
            </a>
          </Button>
        ) : (
          <Button className="rounded-lg" onClick={() => setOpen(true)}>
            Enquire now
            <span aria-hidden>→</span>
          </Button>
        )}
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
          Enquire about {name}
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Holiday budget, party size, dates, location, dog friendly — anything
          helps.
        </p>
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
