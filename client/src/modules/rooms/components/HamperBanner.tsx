import { useState } from "react";
import { Gift } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

/** Server HTML is sanitized; this only makes target=_blank links safe. */
export function enhanceRichLinks(html: string): string {
  return html.replace(/<a\b([^>]*)>/gi, (tag, attrs: string) => {
    const hasTargetBlank = /target\s*=\s*("|')?_blank\1?/i.test(attrs);
    const hasRel = /rel\s*=/i.test(attrs);
    if (hasTargetBlank && !hasRel)
      return `<a${attrs} rel="noopener noreferrer">`;
    return tag;
  });
}

export interface HamperBannerProps {
  html: string;
}

/** Welcome-hamper banner — View details opens a dialog (like offers). */
export function HamperBanner({ html }: HamperBannerProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <section
        aria-label="Welcome hamper"
        className="relative my-8 overflow-hidden rounded-xl border border-brand/30 bg-gradient-to-r from-brand/15 via-brand/5 to-surface-2/60 p-4"
      >
        {/* Wildflower botanical sprig accent peeking from the far right */}
        <div
          className="pointer-events-none absolute -right-2 -bottom-5 w-24 select-none opacity-80 sm:w-28"
          aria-hidden
        >
          <img
            src="/wildflower1.webp"
            alt=""
            className="detail-wildflower w-full rotate-[-12deg]"
            loading="lazy"
          />
        </div>
        {/* Animated flying butterfly hovering near the wildflowers */}
        <div
          className="pointer-events-none absolute right-22 top-22 sm:top-10 w-8 select-none sm:right-20  sm:w-6"
          aria-hidden
        >
          <img
            src="/butterfly_flying.gif"
            alt=""
            className="detail-flying-butterfly-1 w-full drop-shadow-sm rotate-[-12deg]"
            loading="lazy"
          />
        </div>
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 sm:pr-24">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-sm">
              <Gift className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-brand-dark">
                Welcome hamper included
              </p>
              <p className="text-xs text-muted-foreground">
                Artisanal local goods &amp; countryside treats waiting in your
                cottage
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            className="relative z-20 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-brand/40 bg-card px-4 py-1.5 text-xs font-semibold text-brand-dark shadow-xs transition hover:border-brand hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            View details
            <span aria-hidden>→</span>
          </button>
        </div>
      </section>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="hamper-dialog-title"
      >
        <h2
          id="hamper-dialog-title"
          className="pr-10 font-display text-2xl font-light tracking-tight"
        >
          Welcome hamper included
        </h2>
        <div
          className="rich-text mt-3 text-sm leading-relaxed text-foreground"
          dangerouslySetInnerHTML={{ __html: enhanceRichLinks(html) }}
        />
      </Dialog>
    </>
  );
}

export default HamperBanner;
