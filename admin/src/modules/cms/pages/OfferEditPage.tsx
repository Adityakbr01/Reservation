import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusButtons } from "../components/StatusButtons";
import { ImageField } from "@/components/common/ImageField";
import { PageFields, SubmitBar } from "../components/PageForm";
import { useOffer, useSaveOffer, useSetOfferStatus } from "../hooks/use-cms";
import type { ContentStatus } from "../types/cms.types";

function toDateInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function OfferEditPage({ mode }: { mode: "create" | "edit" }) {
  const { id = "" } = useParams();
  const { data: item, isPending: isLoading, isError } = useOffer(mode === "edit" ? id : "");

  if (mode === "edit" && (isLoading || !item)) {
    return (
      <div className="mx-auto w-full max-w-sm py-8 text-center">
        <p className="font-medium">{isError ? "Offer not found." : "Loading offer…"}</p>
        <Button asChild variant="outline" className="mt-4 rounded-full">
          <Link to="/cms/offers">Back to list</Link>
        </Button>
      </div>
    );
  }

  return (
    <OfferForm
      key={mode === "edit" ? id : "new"}
      mode={mode}
      id={id}
      initial={
        item
          ? {
              title: item.title,
              slug: item.slug,
              description: item.description,
              validFrom: toDateInput(item.validFrom),
              validUntil: toDateInput(item.validUntil),
              ctaLabel: item.ctaLabel ?? "",
              ctaUrl: item.ctaUrl ?? "",
              couponId: item.couponId ?? "",
              imageMediaId: item.imageMediaId ?? null,
              status: item.status,
              version: item.version,
            }
          : undefined
      }
    />
  );
}

interface OfferInitial {
  title: string;
  slug: string;
  description: string;
  validFrom: string;
  validUntil: string;
  ctaLabel: string;
  ctaUrl: string;
  couponId: string;
  imageMediaId: string | null;
  status: ContentStatus;
  version: number;
}

function OfferForm({ mode, id, initial }: { mode: "create" | "edit"; id: string; initial?: OfferInitial }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [validFrom, setValidFrom] = useState(initial?.validFrom ?? "");
  const [validUntil, setValidUntil] = useState(initial?.validUntil ?? "");
  const [ctaLabel, setCtaLabel] = useState(initial?.ctaLabel ?? "");
  const [ctaUrl, setCtaUrl] = useState(initial?.ctaUrl ?? "");
  const [couponId, setCouponId] = useState(initial?.couponId ?? "");
  const [imageMediaId, setImageMediaId] = useState<string | null>(initial?.imageMediaId ?? null);
  const { mutate, isPending } = useSaveOffer();
  const statusMutation = useSetOfferStatus();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutate(
      {
        ...(mode === "edit" ? { id } : {}),
        payload: {
          ...(mode === "edit" && initial ? { version: initial.version } : {}),
          title: title.trim(),
          slug: slug.trim(),
          description,
          validFrom: validFrom ? new Date(`${validFrom}T00:00:00Z`).toISOString() : null,
          validUntil: validUntil ? new Date(`${validUntil}T00:00:00Z`).toISOString() : null,
          ctaLabel: ctaLabel.trim() || null,
          ctaUrl: ctaUrl.trim() || null,
          couponId: couponId.trim() || null,
          imageMediaId,
        },
      },
      { onSuccess: () => navigate("/cms/offers") },
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/cms/offers" className="text-sm font-medium text-brand hover:text-brand-dark">
            ← Back to offers
          </Link>
          <h1 className="mt-2 font-display text-3xl font-light tracking-tight">
            {mode === "create" ? "New offer" : (initial?.title ?? "Edit offer")}
          </h1>
        </div>
        {mode === "edit" && initial && (
          <StatusButtons
            status={initial.status}
            pending={statusMutation.isPending}
            onChange={(to) => statusMutation.mutate({ id, version: initial.version, to })}
          />
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PageFields
              title={title}
              slug={slug}
              excerpt={description}
              onTitle={setTitle}
              onSlug={setSlug}
              onExcerpt={setDescription}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="offer-from">Valid from</Label>
                <Input
                  id="offer-from"
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offer-until">Valid until</Label>
                <Input
                  id="offer-until"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offer-cta">Button label</Label>
                <Input
                  id="offer-cta"
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offer-url">Button URL</Label>
                <Input id="offer-url" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="offer-coupon">Linked coupon ID (optional — discount only via coupon)</Label>
                <Input
                  id="offer-coupon"
                  value={couponId}
                  onChange={(e) => setCouponId(e.target.value)}
                  placeholder="Mongo ObjectId of an ACTIVE coupon"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <ImageField label="Offer image" mediaId={imageMediaId} onChange={setImageMediaId} />
              </div>
            </div>
          </CardContent>
        </Card>
        <SubmitBar label={mode === "create" ? "Create offer" : "Save changes"} pending={isPending} />
      </form>
    </div>
  );
}

export default OfferEditPage;
