import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageField } from "@/components/common/ImageField";
import { CkEditorField } from "@/components/common/CkEditorField";
import {
  apiClient,
  getApiErrorMessage,
  unwrapResponse,
} from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import { settingsKeys } from "@/lib/query-keys";
import { setDefaultCurrency, getCurrencySymbol } from "@/lib/money";
import { setDefaultTimeZone, formatDateTimeWithTime } from "@/lib/date";

const PRESET_CURRENCIES = [
  { code: "GBP", symbol: "£", name: "British Pound (£)", country: "United Kingdom" },
  { code: "EUR", symbol: "€", name: "Euro (€)", country: "European Union" },
  { code: "USD", symbol: "$", name: "US Dollar ($)", country: "United States" },
  { code: "INR", symbol: "₹", name: "Indian Rupee (₹)", country: "India" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar (A$)", country: "Australia" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar (CA$)", country: "Canada" },
  { code: "AED", symbol: "AED", name: "UAE Dirham (AED)", country: "United Arab Emirates" },
  { code: "SAR", symbol: "SAR", name: "Saudi Riyal (SAR)", country: "Saudi Arabia" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc (CHF)", country: "Switzerland" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen (¥)", country: "Japan" },
] as const;

const PRESET_TIMEZONES = [
  { value: "Europe/London", label: "Europe/London (GMT/BST) — United Kingdom" },
  { value: "Europe/Paris", label: "Europe/Paris (CET/CEST) — Central Europe" },
  { value: "America/New_York", label: "America/New_York (EST/EDT) — US Eastern" },
  { value: "America/Chicago", label: "America/Chicago (CST/CDT) — US Central" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT) — US Pacific" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST +05:30) — India" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST +04:00) — UAE / Gulf" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT +08:00) — Singapore" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT) — Sydney" },
  { value: "UTC", label: "UTC (Universal Coordinated Time)" },
] as const;

const PRESET_BADGE_COLORS = [
  { label: "Soft Sage", hex: "#EEF3EA" },
  { label: "Warm Cream", hex: "#F7F3EE" },
  { label: "Sky Mist", hex: "#EBF3F8" },
  { label: "Peach", hex: "#FDF2E9" },
  { label: "Lavender", hex: "#F5EEF8" },
] as const;

const WHY_ICONS = [
  { value: "auto", label: "Auto (deduce from title)" },
  { value: "sparkles", label: "Sparkles (Luxury / Highlights)" },
  { value: "heart", label: "Heart (Guest Favorite / Care)" },
  { value: "shield", label: "Shield (Quality & Verified)" },
  { value: "map", label: "Map (Location & Local Knowledge)" },
  { value: "headphones", label: "Headphones (24/7 Support)" },
  { value: "home", label: "Home / Cottage" },
  { value: "leaf", label: "Leaf (Nature & Scenery)" },
  { value: "star", label: "Star (Top Rated)" },
  { value: "gift", label: "Gift (Welcome Hamper / Treats)" },
  { value: "key", label: "Key (Frictionless Access)" },
  { value: "wifi", label: "Wifi (Fast Broadband)" },
] as const;

export interface WhyBookItem {
  title: string;
  text?: string | null;
  icon?: string | null;
  imageMediaId?: string | null;
  badgeColor?: string | null;
}

interface Settings {
  propertyName: string;
  logoMediaId: string | null;
  faviconMediaId: string | null;
  phone: string | null;
  supportEmail: string | null;
  address: string | null;
  timezone: string;
  currency: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  reminderHoursBefore: number;
  whyBookWithUsHeading?: string | null;
  whyBookWithUs?: WhyBookItem[];
}

export function SettingsPage() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: settingsKeys.detail(),
    queryFn: async () => {
      const r = await apiClient.get<ApiEnvelope<Settings>>("/admin/settings");
      return unwrapResponse(r);
    },
  });

  if (isPending || !data) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div
          className="h-40 animate-pulse rounded-xl bg-muted"
          aria-label="Loading settings"
        />
        {isError && (
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => void refetch()}
          >
            Retry
          </Button>
        )}
      </div>
    );
  }

  return <SettingsForm key={data.propertyName} initial={data} />;
}

function SettingsForm({ initial }: { initial: Settings }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Settings>(initial);
  const mutation = useMutation({
    mutationFn: async (payload: Partial<Settings>) => {
      const r = await apiClient.patch<ApiEnvelope<Settings>>(
        "/admin/settings",
        payload,
      );
      return unwrapResponse(r);
    },
    onSuccess: (saved) => {
      setForm(saved);
      if (saved.currency) setDefaultCurrency(saved.currency);
      if (saved.timezone) setDefaultTimeZone(saved.timezone);
      void queryClient.invalidateQueries();
      toast.success("Settings saved");
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate({ ...form });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-light tracking-tight sm:text-4xl">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Property profile and contact details
        </p>
      </div>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Property</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="set-name">Property name</Label>
              <Input
                id="set-name"
                value={form.propertyName}
                onChange={(e) => set("propertyName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <ImageField
                label="Logo"
                mediaId={form.logoMediaId}
                onChange={(mediaId) => set("logoMediaId", mediaId)}
              />
            </div>
            <div className="space-y-2">
              <ImageField
                label="Favicon"
                mediaId={form.faviconMediaId}
                onChange={(mediaId) => set("faviconMediaId", mediaId)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="set-phone">Phone</Label>
              <Input
                id="set-phone"
                value={form.phone ?? ""}
                onChange={(e) => set("phone", e.target.value || null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="set-email">Support email</Label>
              <Input
                id="set-email"
                type="email"
                value={form.supportEmail ?? ""}
                onChange={(e) => set("supportEmail", e.target.value || null)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="set-address">Address</Label>
              <Input
                id="set-address"
                value={form.address ?? ""}
                onChange={(e) => set("address", e.target.value || null)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="set-tz">Timezone</Label>
                <span className="text-xs text-muted-foreground">
                  {formatDateTimeWithTime(new Date(), form.timezone)}
                </span>
              </div>
              <Select
                value={
                  PRESET_TIMEZONES.some((t) => t.value === form.timezone)
                    ? form.timezone
                    : "CUSTOM"
                }
                onValueChange={(val) => {
                  if (val !== "CUSTOM") set("timezone", val);
                }}
              >
                <SelectTrigger id="select-timezone">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_TIMEZONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="CUSTOM">Custom / Other Timezone...</SelectItem>
                </SelectContent>
              </Select>
              <Input
                id="set-tz"
                value={form.timezone}
                onChange={(e) => set("timezone", e.target.value.trim())}
                placeholder="Or type custom timezone (e.g. Europe/London)"
                className="font-mono text-xs mt-1"
              />
              <p className="text-[11px] text-muted-foreground">
                Choose from 10 presets or type any valid IANA timezone.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="set-cur">Currency</Label>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  Active: {getCurrencySymbol(form.currency)} ({form.currency})
                </span>
              </div>
              <Select
                value={
                  PRESET_CURRENCIES.some((c) => c.code === form.currency)
                    ? form.currency
                    : "CUSTOM"
                }
                onValueChange={(val) => {
                  if (val !== "CUSTOM") set("currency", val);
                }}
              >
                <SelectTrigger id="select-currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="font-semibold text-primary mr-1.5">{c.symbol}</span>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="CUSTOM">Custom / Other Currency...</SelectItem>
                </SelectContent>
              </Select>
              <Input
                id="set-cur"
                maxLength={4}
                value={form.currency}
                onChange={(e) => set("currency", e.target.value.toUpperCase().trim())}
                placeholder="Or type custom currency code (e.g. GBP, EUR, USD)"
                className="font-mono uppercase tracking-wider text-xs mt-1"
              />
              <p className="text-[11px] text-muted-foreground">
                Choose from 10 presets or type any ISO code. Symbol updates automatically.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="set-in">Check-in time</Label>
              <Input
                id="set-in"
                value={form.checkInTime ?? ""}
                onChange={(e) => set("checkInTime", e.target.value || null)}
                placeholder="14:00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="set-out">Check-out time</Label>
              <Input
                id="set-out"
                value={form.checkOutTime ?? ""}
                onChange={(e) => set("checkOutTime", e.target.value || null)}
                placeholder="11:00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="set-reminder">
                Reminder hours before check-in
              </Label>
              <Input
                id="set-reminder"
                type="number"
                min={1}
                max={72}
                value={form.reminderHoursBefore}
                onChange={(e) =>
                  set(
                    "reminderHoursBefore",
                    Math.min(72, Math.max(1, Number(e.target.value) || 24)),
                  )
                }
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-1">
              <CardTitle className="text-xl">Why book with us?</CardTitle>
              <CardDescription>
                Customize the direct-booking benefits shown to guests on cottage detail pages. You can set a custom icon, custom image, and badge background color for each reason.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="max-w-md space-y-2">
              <Label htmlFor="why-heading">Section Heading</Label>
              <Input
                id="why-heading"
                value={form.whyBookWithUsHeading ?? ""}
                onChange={(e) => set("whyBookWithUsHeading", e.target.value)}
                placeholder="Why book with us?"
              />
            </div>

            <div className="space-y-4">
              {(form.whyBookWithUs ?? []).map((item, i) => {
                const total = (form.whyBookWithUs ?? []).length;
                return (
                  <div
                    key={i}
                    className="space-y-4 rounded-xl border border-border/80 bg-muted/20 p-4 transition-colors hover:border-border sm:p-5"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {i + 1}
                        </span>
                        <span className="text-sm font-semibold text-foreground">
                          {item.title ? item.title : `Benefit #${i + 1}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={i === 0}
                          onClick={() => {
                            const list = [...(form.whyBookWithUs ?? [])];
                            const temp = list[i];
                            list[i] = list[i - 1];
                            list[i - 1] = temp;
                            set("whyBookWithUs", list);
                          }}
                          aria-label={`Move benefit ${i + 1} up`}
                          title="Move up"
                        >
                          <ArrowUp className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={i === total - 1}
                          onClick={() => {
                            const list = [...(form.whyBookWithUs ?? [])];
                            const temp = list[i];
                            list[i] = list[i + 1];
                            list[i + 1] = temp;
                            set("whyBookWithUs", list);
                          }}
                          aria-label={`Move benefit ${i + 1} down`}
                          title="Move down"
                        >
                          <ArrowDown className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() =>
                            set(
                              "whyBookWithUs",
                              (form.whyBookWithUs ?? []).filter((_, j) => j !== i),
                            )
                          }
                          aria-label={`Remove benefit ${i + 1}`}
                          title="Remove benefit"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor={`why-title-${i}`}>Title</Label>
                        <Input
                          id={`why-title-${i}`}
                          value={item.title}
                          onChange={(e) => {
                            const list = (form.whyBookWithUs ?? []).map((w, j) =>
                              j === i ? { ...w, title: e.target.value } : w,
                            );
                            set("whyBookWithUs", list);
                          }}
                          placeholder="e.g. Charming Luxury Cottages"
                          aria-label={`Why book title ${i + 1}`}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`why-icon-${i}`}>Preset Icon</Label>
                        <Select
                          value={item.icon || "auto"}
                          onValueChange={(val) => {
                            const list = (form.whyBookWithUs ?? []).map((w, j) =>
                              j === i ? { ...w, icon: val === "auto" ? null : val } : w,
                            );
                            set("whyBookWithUs", list);
                          }}
                        >
                          <SelectTrigger id={`why-icon-${i}`}>
                            <SelectValue placeholder="Choose icon" />
                          </SelectTrigger>
                          <SelectContent>
                            {WHY_ICONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Badge Background Color</Label>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="color"
                            value={
                              item.badgeColor && /^#[0-9A-Fa-f]{6}$/.test(item.badgeColor)
                                ? item.badgeColor
                                : "#EEF3EA"
                            }
                            onChange={(e) => {
                              const list = (form.whyBookWithUs ?? []).map((w, j) =>
                                j === i ? { ...w, badgeColor: e.target.value } : w,
                              );
                              set("whyBookWithUs", list);
                            }}
                            className="size-9 cursor-pointer rounded-md border border-border p-0.5"
                            title="Pick color"
                          />
                          <Input
                            value={item.badgeColor ?? ""}
                            onChange={(e) => {
                              const val = e.target.value.trim();
                              const list = (form.whyBookWithUs ?? []).map((w, j) =>
                                j === i ? { ...w, badgeColor: val || null } : w,
                              );
                              set("whyBookWithUs", list);
                            }}
                            placeholder="#EEF3EA"
                            className="w-28 font-mono text-xs uppercase"
                          />
                          <div className="flex items-center gap-1">
                            {PRESET_BADGE_COLORS.map((c) => (
                              <button
                                key={c.hex}
                                type="button"
                                className="size-6 rounded-full border border-border/80 shadow-xs transition hover:scale-110"
                                style={{ backgroundColor: c.hex }}
                                title={c.label}
                                onClick={() => {
                                  const list = (form.whyBookWithUs ?? []).map((w, j) =>
                                    j === i ? { ...w, badgeColor: c.hex } : w,
                                  );
                                  set("whyBookWithUs", list);
                                }}
                              />
                            ))}
                          </div>
                          {item.badgeColor && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-muted-foreground"
                              onClick={() => {
                                const list = (form.whyBookWithUs ?? []).map((w, j) =>
                                  j === i ? { ...w, badgeColor: null } : w,
                                );
                                set("whyBookWithUs", list);
                              }}
                            >
                              Reset
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 sm:col-span-2">
                        <ImageField
                          label="Custom Icon / Image (Overrides preset icon with your uploaded asset)"
                          mediaId={item.imageMediaId ?? null}
                          onChange={(mediaId) => {
                            const list = (form.whyBookWithUs ?? []).map((w, j) =>
                              j === i ? { ...w, imageMediaId: mediaId } : w,
                            );
                            set("whyBookWithUs", list);
                          }}
                        />
                      </div>

                      <div className="space-y-2 sm:col-span-2">
                        <CkEditorField
                          label={`Description / Body ${i + 1}`}
                          value={item.text ?? ""}
                          onChange={(html) => {
                            const list = (form.whyBookWithUs ?? []).map((w, j) =>
                              j === i ? { ...w, text: html || null } : w,
                            );
                            set("whyBookWithUs", list);
                          }}
                          placeholder="What makes booking direct better…"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() =>
                set("whyBookWithUs", [
                  ...(form.whyBookWithUs ?? []),
                  { title: "", text: null, icon: null, imageMediaId: null, badgeColor: null },
                ])
              }
            >
              <Plus className="mr-1.5 size-4" />
              Add benefit
            </Button>
          </CardContent>
        </Card>
        <Button
          type="submit"
          className="mt-4 rounded-full"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Saving…" : "Save settings"}
        </Button>
      </form>
    </div>
  );
}

export default SettingsPage;
