import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CottageImage } from "@/components/common/CottageImage";
import { useMediaUrls } from "@/modules/media";
import { publicApiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import type { CmsSection } from "../api/cms.api";
import { useFaqs, useOffers } from "../hooks/use-cms";

interface PublicCottage {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  images?: Array<{ mediaId: string; altText: string | null; sortOrder: number }>;
}

function usePublicCottages(ids: string[]) {
  return useQuery({
    queryKey: ["cms", "cottages", [...ids].sort().join(",")],
    queryFn: async () => {
      const response = await publicApiClient.get<ApiEnvelope<PublicCottage[]>>(
        "/public/cottages",
        { params: { limit: 100 } },
      );
      const all = unwrapResponse(response);
      const wanted = new Set(ids);
      return all.filter((t) => wanted.has(t.id));
    },
    enabled: ids.length > 0,
    retry: false,
    staleTime: 300_000,
  });
}

function HeroSection({ section }: { section: CmsSection }) {
  const { data } = useMediaUrls(section.imageMediaId ? [section.imageMediaId] : []);
  const bg = data?.[0]?.url;
  return (
    <section
      className="overflow-hidden rounded-xl border border-border bg-surface-2"
      aria-label={section.heading ?? "Highlight"}
    >
      {bg && <img src={bg} alt="" className="aspect-[21/9] w-full object-cover" loading="lazy" />}
      <div className="space-y-2 p-6 sm:p-8">
        {section.heading && (
          <h2 className="font-display text-2xl font-light tracking-tight sm:text-3xl">
            {section.heading}
          </h2>
        )}
        {section.subheading && <p className="text-muted-foreground">{section.subheading}</p>}
        {section.ctaLabel && section.ctaUrl && (
          <Button asChild className="mt-2 rounded-full">
            <Link to={section.ctaUrl}>{section.ctaLabel}</Link>
          </Button>
        )}
      </div>
    </section>
  );
}

function GallerySection({ section }: { section: CmsSection }) {
  const { data } = useMediaUrls(section.mediaIds ?? []);
  if (!data || data.length === 0) return null;
  return (
    <section className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Gallery">
      {data.map((m) => (
        <img key={m.id} src={m.url} alt={m.alt ?? ""} className="aspect-square w-full rounded-xl object-cover" loading="lazy" />
      ))}
    </section>
  );
}

function ShowcaseSection({ section }: { section: CmsSection }) {
  const { data } = usePublicCottages(section.roomTypeIds ?? []);
  if (!data || data.length === 0) return null;
  return (
    <section className="space-y-3" aria-label={section.heading ?? "Cottages"}>
      {section.heading && <h2 className="font-display text-2xl font-light">{section.heading}</h2>}
      <div className="grid gap-4 sm:grid-cols-2">
        {data.map((cottage) => (
          <ShowcaseCard key={cottage.id} cottage={cottage} />
        ))}
      </div>
    </section>
  );
}

function ShowcaseCard({ cottage }: { cottage: PublicCottage }) {
  const cover = [...(cottage.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)[0];
  const { data } = useMediaUrls(cover ? [cover.mediaId] : []);
  return (
    <Link
      to={`/cottages/${cottage.slug}`}
      className="group overflow-hidden rounded-xl border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="aspect-[16/9] w-full bg-surface-2">
        <CottageImage name={cottage.name} imageUrl={data?.[0]?.url ?? null} alt={data?.[0]?.alt} />
      </div>
      <div className="p-4">
        <p className="font-medium group-hover:text-brand">{cottage.name}</p>
        {cottage.shortDescription && (
          <p className="mt-1 text-sm text-muted-foreground">{cottage.shortDescription}</p>
        )}
      </div>
    </Link>
  );
}

function OfferCardSection({ section }: { section: CmsSection }) {
  const { data: offers } = useOffers();
  const offer = offers?.find((o) => o.id === section.offerId);
  if (!offer) return null;
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-xl">{offer.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">{offer.description}</p>
        {offer.ctaLabel && offer.ctaUrl && (
          <Button asChild variant="outline" className="rounded-full">
            <Link to={offer.ctaUrl}>{offer.ctaLabel}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function FaqSection({ section }: { section: CmsSection }) {
  const { data: faqs } = useFaqs();
  const items = (faqs ?? []).filter((f) => !section.category || f.category === section.category);
  if (items.length === 0) return null;
  return (
    <section className="space-y-3" aria-label="Frequently asked questions">
      <h2 className="font-display text-2xl font-light">FAQs</h2>
      {items.map((faq) => (
        <details key={faq.id} className="rounded-xl border border-border p-4">
          <summary className="cursor-pointer font-medium">{faq.question}</summary>
          <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
        </details>
      ))}
    </section>
  );
}

export function CmsSections({ sections }: { sections: CmsSection[] }) {
  return (
    <div className="space-y-6">
      {sections.map((section, i) => {
        switch (section.kind) {
          case "HERO":
          case "CTA":
            return <HeroSection key={i} section={section} />;
          case "EDITORIAL_TEXT":
          case "SPLIT_CONTENT":
          case "LOCATION":
          case "CONTACT":
            return (
              <section key={i} className="space-y-2" aria-label={section.heading ?? "Text"}>
                {section.heading && (
                  <h2 className="font-display text-2xl font-light">{section.heading}</h2>
                )}
                {section.subheading && (
                  <p className="text-muted-foreground">{section.subheading}</p>
                )}
                {section.html && (
                  <div
                    className="rich-text leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: section.html }}
                  />
                )}
              </section>
            );
          case "IMAGE_GALLERY":
            return <GallerySection key={i} section={section} />;
          case "ROOM_SHOWCASE":
            return <ShowcaseSection key={i} section={section} />;
          case "FEATURE_GRID":
            return (
              <section key={i} className="grid gap-3 sm:grid-cols-2" aria-label="Features">
                {(section.features ?? []).map((f, j) => (
                  <Card key={j}>
                    <CardContent className="space-y-1 p-4">
                      <p className="font-medium">{f.title}</p>
                      <p className="text-sm text-muted-foreground">{f.text}</p>
                    </CardContent>
                  </Card>
                ))}
              </section>
            );
          case "OFFER_CARD":
            return <OfferCardSection key={i} section={section} />;
          case "FAQ":
            return <FaqSection key={i} section={section} />;
          case "TESTIMONIALS":
            return (
              <section key={i} className="grid gap-3 sm:grid-cols-2" aria-label="Guest words">
                {(section.entries ?? []).map((t, j) => (
                  <Card key={j}>
                    <CardContent className="space-y-2 p-4">
                      <p className="text-sm italic">“{t.quote}”</p>
                      <p className="text-xs text-muted-foreground">— {t.name}</p>
                    </CardContent>
                  </Card>
                ))}
              </section>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
