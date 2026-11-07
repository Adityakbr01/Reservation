import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusButtons } from "../components/StatusButtons";
import { ImageField } from "@/components/common/ImageField";
import { PageFields, SubmitBar } from "../components/PageForm";
import { getApiErrorMessage } from "@/lib/api-client";
import { cmsKeys, couponKeys } from "@/lib/query-keys";
import { useOffer, useOffers, useSaveOffer, useSetOfferStatus } from "../hooks/use-cms";
import { updateOffer } from "../api/cms.api";
import { useCoupon, useCoupons, useUpdateCoupon } from "@/modules/coupons/hooks/use-coupons";
import { updateCoupon } from "@/modules/coupons/api/coupons.api";
import { useCottages } from "@/modules/cottages";
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

interface RoomConflict {
  roomId: string;
  roomName: string;
  oldCouponId: string;
  oldCouponCode: string;
  offerId: string;
  offerTitle: string;
  offerStatus: ContentStatus;
}

interface OverridePlan {
  targetCoupon: string;
  effectiveRooms: string[];
  conflicts: RoomConflict[];
  oldCouponIds: string[];
}

function OfferForm({ mode, id, initial }: { mode: "create" | "edit"; id: string; initial?: OfferInitial }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
  const roomsMutation = useUpdateCoupon();
  const { data: couponsData, isPending: isCouponsLoading } = useCoupons({ page: 1, limit: 100 });
  const coupons = [...(couponsData?.items ?? [])].sort((a, b) => {
    const rank = (s: string) => (s === "ACTIVE" ? 0 : 1);
    return rank(a.status) - rank(b.status) || a.code.localeCompare(b.code);
  });
  const couponLabel = (c: { code: string; discountType: string; discountValue: number; status: string }) =>
    `${c.code} — ${c.discountType === "PERCENTAGE" ? `${c.discountValue}%` : `₹${c.discountValue / 100}`} off${c.status === "ACTIVE" ? "" : ` · ${c.status}`}`;
  const couponMissing =
    couponId !== "" && !coupons.some((c) => c.id === couponId);
  const selectedCoupon = coupons.find((c) => c.id === couponId) ?? null;

  // Cottage targeting lives on the linked coupon (server: coupon.applicableRoomTypeIds,
  // empty = all cottages). Managed here so the offer section is the single place.
  const { data: typesData } = useCottages({ page: 1, limit: 100 });
  const cottages = typesData?.items ?? [];
  const { data: couponDetail } = useCoupon(couponId);
  const detailForCoupon =
    couponDetail && couponDetail.id === couponId ? couponDetail : null;
  const sourceRooms =
    detailForCoupon?.applicableRoomTypeIds ??
    selectedCoupon?.applicableRoomTypeIds ??
    [];
  const sourceKey = `${couponId}|${detailForCoupon ? "d" : "l"}`;
  const [cottageIds, setCottageIds] = useState<string[]>([]);
  const [cottagesKey, setCottagesKey] = useState<string | null>(null);
  if (cottagesKey !== sourceKey && (couponId === "" || detailForCoupon || selectedCoupon)) {
    setCottagesKey(sourceKey);
    setCottageIds([...sourceRooms]);
  }
  const roomsChanged =
    JSON.stringify([...cottageIds].sort()) !== JSON.stringify([...sourceRooms].sort());

  function toggleCottage(id: string) {
    setCottageIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  }

  // One room type → one offer. Rooms already claimed by another coupon's
  // offer must be confirmed before this save steals them (override).
  const { data: offersData } = useOffers({ page: 1, limit: 100 });
  const [overridePlan, setOverridePlan] = useState<OverridePlan | null>(null);
  const [surgeryPending, setSurgeryPending] = useState(false);

  function findConflicts(targetCouponId: string, claimedCottageIds: string[]): RoomConflict[] {
    const allCottageIds = cottages.map((c) => c.id);
    const selected = claimedCottageIds.length > 0 ? claimedCottageIds : allCottageIds;
    if (selected.length === 0) return [];
    const cottageName = new Map(cottages.map((c) => [c.id, c.name]));
    const offers = offersData?.items ?? [];
    return coupons
      .filter((c) => c.id !== targetCouponId)
      .flatMap((c) => {
        const scope = c.applicableRoomTypeIds.length > 0 ? c.applicableRoomTypeIds : allCottageIds;
        const overlap = scope.filter((cid) => selected.includes(cid));
        if (overlap.length === 0) return [];
        const linked = offers.filter(
          (o) =>
            o.couponId === c.id &&
            o.status !== "ARCHIVED" &&
            (mode === "create" || o.id !== id),
        );
        if (linked.length === 0) return [];
        return overlap.flatMap((cid) =>
          linked.map((o) => ({
            roomId: cid,
            roomName: cottageName.get(cid) ?? `…${cid.slice(-6)}`,
            oldCouponId: c.id,
            oldCouponCode: c.code,
            offerId: o.id,
            offerTitle: o.title,
            offerStatus: o.status,
          })),
        );
      });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const target = couponId.trim();
    // No coupon → offer never appears on cottage pages, so nothing to clash.
    if (!target) {
      persistSave(null);
      return;
    }
    if (!offersData || cottages.length === 0) {
      toast.error("Lists still loading — wait a moment and retry");
      return;
    }
    const conflicts = findConflicts(target, cottageIds);
    if (conflicts.length === 0) {
      persistSave(null);
      return;
    }
    setOverridePlan({
      targetCoupon: target,
      effectiveRooms: cottageIds.length > 0 ? [...cottageIds] : cottages.map((c) => c.id),
      conflicts,
      oldCouponIds: [...new Set(conflicts.map((c) => c.oldCouponId))],
    });
  }

  /** Strip overridden rooms from old coupons (unlinking offers that would
   * otherwise flip to global), then save this offer + its own room list. */
  async function persistSave(plan: OverridePlan | null) {
    setSurgeryPending(true);
    try {
      if (plan) {
        for (const oldId of plan.oldCouponIds) {
          const old = coupons.find((c) => c.id === oldId);
          if (!old) continue;
          const base =
            old.applicableRoomTypeIds.length > 0
              ? old.applicableRoomTypeIds
              : cottages.map((r) => r.id);
          const kept = base.filter((rid) => !plan.effectiveRooms.includes(rid));
          if (kept.length > 0) {
            await updateCoupon(oldId, { applicableRoomTypeIds: kept });
          } else {
            // Old coupon was scoped only to overridden cottages — empty means
            // ALL cottages, so unlink its offers instead of flipping it global.
            const linkedIds = [
              ...new Set(
                plan.conflicts.filter((c) => c.oldCouponId === oldId).map((c) => c.offerId),
              ),
            ];
            for (const oid of linkedIds) {
              const o = offersData?.items.find((x) => x.id === oid);
              if (!o) continue;
              await updateOffer(oid, { version: o.version, couponId: null });
            }
          }
        }
        await queryClient.invalidateQueries({ queryKey: couponKeys.all });
        await queryClient.invalidateQueries({ queryKey: cmsKeys.all });
        toast.success("Old offer removed from overridden cottages");
      }
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
        {
          onSuccess: () => {
            if (couponId.trim() && roomsChanged) {
              roomsMutation.mutate(
                { id: couponId.trim(), payload: { applicableRoomTypeIds: cottageIds } },
                { onSuccess: () => navigate("/cms/offers") },
              );
            } else {
              navigate("/cms/offers");
            }
          },
          onSettled: () => setSurgeryPending(false),
        },
      );
    } catch (err) {
      setSurgeryPending(false);
      toast.error(err instanceof Error ? err.message : getApiErrorMessage(err));
    }
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
                <Label htmlFor="offer-coupon">Linked coupon (optional — discount only via coupon)</Label>
                <Select
                  value={couponId === "" ? "none" : couponId}
                  onValueChange={(value) => setCouponId(value === "none" ? "" : value)}
                  disabled={isCouponsLoading}
                >
                  <SelectTrigger id="offer-coupon">
                    <SelectValue
                      placeholder={isCouponsLoading ? "Loading coupons…" : "Select a coupon"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No coupon</SelectItem>
                    {coupons.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {couponLabel(c)}
                      </SelectItem>
                    ))}
                    {couponMissing && (
                      <SelectItem value={couponId}>
                        Currently linked: …{couponId.slice(-6)} (not in list)
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Applies to cottages</Label>
                {couponId === "" ? (
                  <p className="text-sm text-muted-foreground">
                    Link a coupon above to choose cottages — an offer without a
                    coupon never appears on cottage pages.
                  </p>
                ) : cottages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Loading cottages…</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {cottages.map((c) => {
                        const on = cottageIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggleCottage(c.id)}
                            className={`rounded-full border px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              on
                                ? "border-brand bg-brand/10 font-medium"
                                : "border-input text-muted-foreground hover:border-brand"
                            }`}
                          >
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {cottageIds.length === 0
                        ? `All cottages — the ${selectedCoupon?.code ?? "coupon"} badge shows on every cottage page.`
                        : `Only on ${cottageIds.length} selected cottage${cottageIds.length === 1 ? "" : "s"}. Deselect all for every cottage.`}{" "}
                      Saved on coupon {selectedCoupon?.code ?? "…"}.
                    </p>
                  </>
                )}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <ImageField label="Offer image" mediaId={imageMediaId} onChange={setImageMediaId} />
              </div>
            </div>
          </CardContent>
        </Card>
        <SubmitBar label={mode === "create" ? "Create offer" : "Save changes"} pending={isPending || roomsMutation.isPending || surgeryPending} />
      </form>
      <AlertDialog
        open={overridePlan !== null}
        onOpenChange={(open) => {
          if (!open && !surgeryPending && !isPending) setOverridePlan(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cottage already has an offer — override?</AlertDialogTitle>
            <AlertDialogDescription>
              These cottages already show another offer. Overriding removes the old
              offer from them and applies this one instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="max-h-48 space-y-1.5 overflow-y-auto text-sm">
            {(overridePlan?.conflicts ?? []).map((c, i) => (
              <li
                key={`${c.roomId}-${c.offerId}-${i}`}
                className="rounded-lg border border-border px-3 py-2"
              >
                <span className="font-medium">{c.roomName}</span>
                <span className="text-muted-foreground">
                  {" "}— “{c.offerTitle}” ({c.oldCouponCode}
                  {c.offerStatus !== "PUBLISHED" ? ` · ${c.offerStatus}` : ""})
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel disabled={surgeryPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={surgeryPending}
              onClick={() => {
                const plan = overridePlan;
                setOverridePlan(null);
                void persistSave(plan);
              }}
            >
              {surgeryPending ? "Overriding…" : "Yes, override"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default OfferEditPage;
