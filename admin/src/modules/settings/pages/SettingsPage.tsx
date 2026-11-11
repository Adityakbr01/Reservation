import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  ArrowDown,
  ArrowUp,
  Plus,
  Trash2,
  Building2,
  Sparkles,
  Compass,
  LayoutGrid,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageField } from "@/components/common/ImageField";
import { CkEditorField } from "@/components/common/CkEditorField";
import { RichTextEditor } from "@/modules/cms/components/RichTextEditor";
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

export interface NavLinkItem {
  id?: string;
  label: string;
  url: string;
  openInNewTab?: boolean;
  isEnabled?: boolean;
}

export interface HeaderNavigation {
  links: NavLinkItem[];
  enquireButton: {
    label: string;
    url: string;
    openInNewTab?: boolean;
    isEnabled?: boolean;
  };
}

export interface FooterColumnLinks {
  heading: string;
  links: NavLinkItem[];
  isEnabled?: boolean;
}

export interface FooterNavigation {
  col1?: {
    showLogo?: boolean;
    tagline?: string;
    isEnabled?: boolean;
  };
  col2?: FooterColumnLinks;
  col3?: FooterColumnLinks;
  col4?: {
    heading?: string;
    isEnabled?: boolean;
    showPhone?: boolean;
    showEmail?: boolean;
    showAddress?: boolean;
  };
  bottomBar?: {
    copyrightText?: string;
    locationText?: string;
    showBackToTop?: boolean;
  };
}

export interface AcknowledgementItem {
  id: string;
  text: string;
  linkLabel?: string;
  linkUrl?: string;
  openInNewTab?: boolean;
  isRequired?: boolean;
  isEnabled?: boolean;
}

export interface CheckoutSection {
  id: string;
  title: string;
  introText?: string;
  isEnabled?: boolean;
  items: AcknowledgementItem[];
}

export interface BookFasterSettings {
  isEnabled?: boolean;
  title?: string;
  checkboxText?: string;
  passwordHint?: string;
  expandedByDefault?: boolean;
}

const DEFAULT_BOOK_FASTER: Required<BookFasterSettings> = {
  isEnabled: true,
  title: "Book Faster (Optional)",
  checkboxText: "I would like to create an account.",
  passwordHint:
    "At least 8 characters long, case sensitive, can contain !$#%, no spaces, not the same as previous password or login",
  expandedByDefault: false,
};

export interface BookingAcknowledgement {
  sections?: CheckoutSection[];
  bookFaster?: BookFasterSettings;
  showPoliciesSection?: boolean;
  showAcknowledgementSection?: boolean;
  isEnabled?: boolean;
  title?: string;
  introText?: string;
  items?: AcknowledgementItem[];
  privacyCheckboxText?: string;
  privacyLinkLabel?: string;
  privacyLinkUrl?: string;
  termsCheckboxText?: string;
  termsLinkLabel?: string;
  termsLinkUrl?: string;
  buttonText?: string;
  busyButtonText?: string;
  incompleteContactHint?: string;
  incompleteTermsHint?: string;
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
  headerNavigation?: HeaderNavigation;
  footerNavigation?: FooterNavigation;
  bookingAcknowledgement?: BookingAcknowledgement;
}

function migrateLegacyAckLinks(
  ack?: BookingAcknowledgement,
): BookingAcknowledgement | undefined {
  if (!ack) return ack;
  const migrateItem = (item: AcknowledgementItem): AcknowledgementItem => {
    if (item.linkLabel && item.linkUrl && !/<a\s/i.test(item.text)) {
      const href = item.linkUrl.replace(/"/g, "&quot;");
      return {
        ...item,
        text: `${item.text} <a href="${href}" target="_blank" rel="noopener noreferrer">${item.linkLabel}</a>`,
      };
    }
    return item;
  };
  return {
    ...ack,
    ...(ack.items ? { items: ack.items.map(migrateItem) } : {}),
    ...(ack.sections
      ? {
          sections: ack.sections.map((sec) => ({
            ...sec,
            items: (sec.items ?? []).map(migrateItem),
          })),
        }
      : {}),
  };
}

function defaultAckSections(ack?: BookingAcknowledgement): CheckoutSection[] {
  const privacyText = ack?.privacyCheckboxText ?? "* I agree with the Privacy Terms.";
  const termsText = ack?.termsCheckboxText ?? "I agree with the Booking Conditions.";
  return [
    {
      id: "sec-acknowledgement",
      title: ack?.title ?? "Acknowledgement",
      introText: ack?.introText ?? "",
      isEnabled: true,
      items:
        ack?.items && ack.items.length > 0
          ? ack.items
          : [
              {
                id: "ack-privacy",
                text: `${privacyText} <a href="${ack?.privacyLinkUrl ?? "/policies/PRIVACY"}" target="_blank" rel="noopener noreferrer">${ack?.privacyLinkLabel ?? "Privacy Notice"}</a>`,
                isRequired: true,
                isEnabled: true,
              },
              {
                id: "ack-terms",
                text: `${termsText} <a href="${ack?.termsLinkUrl ?? "/policies/TERMS"}" target="_blank" rel="noopener noreferrer">${ack?.termsLinkLabel ?? "Booking Conditions"}</a>`,
                isRequired: true,
                isEnabled: true,
              },
            ],
    },
  ];
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
  const [form, setForm] = useState<Settings>(() => {
    const ack = migrateLegacyAckLinks(initial.bookingAcknowledgement);
    return {
      ...initial,
      bookingAcknowledgement: {
        ...(ack ?? {}),
        bookFaster: { ...DEFAULT_BOOK_FASTER, ...(ack?.bookFaster ?? {}) },
      },
    };
  });
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

  type SettingsTab = "property" | "benefits" | "header" | "footer" | "checkout";
  const [activeTab, setActiveTab] = useState<SettingsTab>("property");

  const SETTINGS_TABS: {
    id: SettingsTab;
    label: string;
    icon: typeof Building2;
    desc: string;
  }[] = [
    {
      id: "property",
      label: "Property & Profile",
      icon: Building2,
      desc: "Contacts, timings, currency & timezone",
    },
    {
      id: "benefits",
      label: "Why Book Direct",
      icon: Sparkles,
      desc: "Perks, highlights & guarantees",
    },
    {
      id: "header",
      label: "Header Navigation",
      icon: Compass,
      desc: "Top menu links & Enquire button",
    },
    {
      id: "footer",
      label: "Footer Navigation",
      icon: LayoutGrid,
      desc: "Columns, copyright & contact section",
    },
    {
      id: "checkout",
      label: "Checkout & Acknowledgement",
      icon: ShieldCheck,
      desc: "Terms consent, button labels & hints",
    },
  ];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate({ ...form });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Bar with quick save button */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="font-display text-3xl font-light tracking-tight sm:text-4xl">
              Settings
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure global property profile, navigation menus, and booking controls.
            </p>
          </div>
          <Button
            type="submit"
            className="rounded-full px-6 gap-2"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Saving…" : "Save settings"}
          </Button>
        </div>

        {/* Tab Navigation Switcher */}
        <div className="flex border-b border-border/70 overflow-x-auto gap-2 pb-px">
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer rounded-t-lg ${
                  isActive
                    ? "border-primary text-primary font-semibold bg-primary/5 shadow-xs"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <Icon
                  className={`size-4 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Panels */}
        {activeTab === "property" && (
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
        )}

        {/* Tab Panel: Benefits */}
        {activeTab === "benefits" && (
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
        )}

        {/* Tab Panel: Header Navigation */}
        {activeTab === "header" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Header Navigation</CardTitle>
            <CardDescription>
              Configure top navigation links, destination URLs, and the "Enquire" action button.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Header Links</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    const current = form.headerNavigation?.links ?? [];
                    const updated = [
                      ...current,
                      {
                        id: `nav-${Date.now()}`,
                        label: "New link",
                        url: "/",
                        openInNewTab: false,
                        isEnabled: true,
                      },
                    ];
                    set("headerNavigation", {
                      ...(form.headerNavigation ?? {
                        enquireButton: {
                          label: "Enquire",
                          url: "https://hamptworthstays.com/plan-your-experience/",
                          openInNewTab: true,
                          isEnabled: true,
                        },
                      }),
                      links: updated,
                    });
                  }}
                >
                  <Plus className="mr-1.5 size-3.5" />
                  Add nav link
                </Button>
              </div>

              <div className="space-y-3">
                {(form.headerNavigation?.links ?? []).map((lnk, idx, arr) => (
                  <div
                    key={lnk.id ?? idx}
                    className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/20 p-3 sm:flex-nowrap"
                  >
                    <div className="flex flex-col gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={idx === 0}
                        onClick={() => {
                          const list = [...arr];
                          const [item] = list.splice(idx, 1);
                          list.splice(idx - 1, 0, item);
                          set("headerNavigation", {
                            ...(form.headerNavigation ?? {
                              enquireButton: { label: "Enquire", url: "", openInNewTab: true, isEnabled: true },
                            }),
                            links: list,
                          });
                        }}
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={idx === arr.length - 1}
                        onClick={() => {
                          const list = [...arr];
                          const [item] = list.splice(idx, 1);
                          list.splice(idx + 1, 0, item);
                          set("headerNavigation", {
                            ...(form.headerNavigation ?? {
                              enquireButton: { label: "Enquire", url: "", openInNewTab: true, isEnabled: true },
                            }),
                            links: list,
                          });
                        }}
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                    </div>

                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">Label</Label>
                      <Input
                        value={lnk.label}
                        onChange={(e) => {
                          const list = arr.map((item, i) =>
                            i === idx ? { ...item, label: e.target.value } : item
                          );
                          set("headerNavigation", {
                            ...(form.headerNavigation ?? {
                              enquireButton: { label: "Enquire", url: "", openInNewTab: true, isEnabled: true },
                            }),
                            links: list,
                          });
                        }}
                        placeholder="e.g. The estate"
                      />
                    </div>

                    <div className="flex-[2] space-y-1">
                      <Label className="text-xs text-muted-foreground">Destination URL</Label>
                      <Input
                        value={lnk.url}
                        onChange={(e) => {
                          const list = arr.map((item, i) =>
                            i === idx ? { ...item, url: e.target.value } : item
                          );
                          set("headerNavigation", {
                            ...(form.headerNavigation ?? {
                              enquireButton: { label: "Enquire", url: "", openInNewTab: true, isEnabled: true },
                            }),
                            links: list,
                          });
                        }}
                        placeholder="e.g. https://... or /policies"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-5">
                      <Switch
                        checked={lnk.openInNewTab ?? false}
                        onCheckedChange={(val) => {
                          const list = arr.map((item, i) =>
                            i === idx ? { ...item, openInNewTab: val } : item
                          );
                          set("headerNavigation", {
                            ...(form.headerNavigation ?? {
                              enquireButton: { label: "Enquire", url: "", openInNewTab: true, isEnabled: true },
                            }),
                            links: list,
                          });
                        }}
                      />
                      <span className="text-xs text-muted-foreground">New tab</span>
                    </div>

                    <div className="flex items-center gap-2 pt-5">
                      <Switch
                        checked={lnk.isEnabled ?? true}
                        onCheckedChange={(val) => {
                          const list = arr.map((item, i) =>
                            i === idx ? { ...item, isEnabled: val } : item
                          );
                          set("headerNavigation", {
                            ...(form.headerNavigation ?? {
                              enquireButton: { label: "Enquire", url: "", openInNewTab: true, isEnabled: true },
                            }),
                            links: list,
                          });
                        }}
                      />
                      <span className="text-xs text-muted-foreground">Active</span>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-5 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        const list = arr.filter((_, i) => i !== idx);
                        set("headerNavigation", {
                          ...(form.headerNavigation ?? {
                            enquireButton: { label: "Enquire", url: "", openInNewTab: true, isEnabled: true },
                          }),
                          links: list,
                        });
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border bg-muted/10 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold">Header "Enquire" Button</h4>
                  <p className="text-xs text-muted-foreground">CTA button displayed on top-right of the header</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.headerNavigation?.enquireButton?.isEnabled ?? true}
                    onCheckedChange={(val) => {
                      set("headerNavigation", {
                        links: form.headerNavigation?.links ?? [],
                        enquireButton: {
                          label: form.headerNavigation?.enquireButton?.label ?? "Enquire",
                          url: form.headerNavigation?.enquireButton?.url ?? "",
                          openInNewTab: form.headerNavigation?.enquireButton?.openInNewTab ?? true,
                          isEnabled: val,
                        },
                      });
                    }}
                  />
                  <span className="text-xs font-medium">Show button</span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Button Label</Label>
                  <Input
                    value={form.headerNavigation?.enquireButton?.label ?? "Enquire"}
                    onChange={(e) => {
                      set("headerNavigation", {
                        links: form.headerNavigation?.links ?? [],
                        enquireButton: {
                          label: e.target.value,
                          url: form.headerNavigation?.enquireButton?.url ?? "",
                          openInNewTab: form.headerNavigation?.enquireButton?.openInNewTab ?? true,
                          isEnabled: form.headerNavigation?.enquireButton?.isEnabled ?? true,
                        },
                      });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Button URL</Label>
                  <Input
                    value={form.headerNavigation?.enquireButton?.url ?? ""}
                    onChange={(e) => {
                      set("headerNavigation", {
                        links: form.headerNavigation?.links ?? [],
                        enquireButton: {
                          label: form.headerNavigation?.enquireButton?.label ?? "Enquire",
                          url: e.target.value,
                          openInNewTab: form.headerNavigation?.enquireButton?.openInNewTab ?? true,
                          isEnabled: form.headerNavigation?.enquireButton?.isEnabled ?? true,
                        },
                      });
                    }}
                    placeholder="https://..."
                  />
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <Switch
                    checked={form.headerNavigation?.enquireButton?.openInNewTab ?? true}
                    onCheckedChange={(val) => {
                      set("headerNavigation", {
                        links: form.headerNavigation?.links ?? [],
                        enquireButton: {
                          label: form.headerNavigation?.enquireButton?.label ?? "Enquire",
                          url: form.headerNavigation?.enquireButton?.url ?? "",
                          openInNewTab: val,
                          isEnabled: form.headerNavigation?.enquireButton?.isEnabled ?? true,
                        },
                      });
                    }}
                  />
                  <span className="text-xs text-muted-foreground">Open in new tab</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Tab Panel: Footer Navigation */}
        {activeTab === "footer" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Footer Navigation & Columns</CardTitle>
            <CardDescription>
              Control each column of the footer, link categories, contact widgets, and copyright bar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Column 1: Brand & Tagline */}
            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="text-sm font-semibold">Column 1: Brand & Tagline</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Tagline Text</Label>
                  <Input
                    value={form.footerNavigation?.col1?.tagline ?? "Luxury holiday cottages in Hamptworth, Hampshire"}
                    onChange={(e) => {
                      set("footerNavigation", {
                        ...(form.footerNavigation ?? {}),
                        col1: {
                          showLogo: form.footerNavigation?.col1?.showLogo ?? true,
                          tagline: e.target.value,
                        },
                      });
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.footerNavigation?.col1?.showLogo ?? true}
                    onCheckedChange={(val) => {
                      set("footerNavigation", {
                        ...(form.footerNavigation ?? {}),
                        col1: {
                          tagline: form.footerNavigation?.col1?.tagline ?? "",
                          showLogo: val,
                        },
                      });
                    }}
                  />
                  <span className="text-xs">Show logo above tagline</span>
                </div>
              </div>
            </div>

            {/* Column 2: Links */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold">Column 2 (e.g. Your stay)</h4>
                  <p className="text-xs text-muted-foreground">Header and links in the second column</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Enabled</span>
                    <Switch
                      checked={form.footerNavigation?.col2?.isEnabled !== false}
                      onCheckedChange={(val) => {
                        set("footerNavigation", {
                          ...(form.footerNavigation ?? {}),
                          col2: {
                            heading: form.footerNavigation?.col2?.heading ?? "Your stay",
                            links: form.footerNavigation?.col2?.links ?? [],
                            isEnabled: val,
                          },
                        });
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => {
                      const col2 = form.footerNavigation?.col2 ?? { heading: "Your stay", links: [], isEnabled: true };
                      const updated = [
                        ...(col2.links ?? []),
                        { id: `col2-${Date.now()}`, label: "New link", url: "/", openInNewTab: false, isEnabled: true },
                      ];
                      set("footerNavigation", {
                        ...(form.footerNavigation ?? {}),
                        col2: { ...col2, links: updated },
                      });
                    }}
                  >
                    <Plus className="mr-1.5 size-3.5" />
                    Add link
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Column Title</Label>
                <Input
                  value={form.footerNavigation?.col2?.heading ?? "Your stay"}
                  onChange={(e) => {
                    set("footerNavigation", {
                      ...(form.footerNavigation ?? {}),
                      col2: {
                        heading: e.target.value,
                        links: form.footerNavigation?.col2?.links ?? [],
                      },
                    });
                  }}
                />
              </div>

              <div className="space-y-2">
                {(form.footerNavigation?.col2?.links ?? []).map((lnk, idx, arr) => (
                  <div key={lnk.id ?? idx} className="flex flex-wrap items-center gap-2 rounded border bg-muted/20 p-2 sm:flex-nowrap">
                    <Input
                      className="h-8 flex-1 text-xs"
                      value={lnk.label}
                      placeholder="Label"
                      onChange={(e) => {
                        const list = arr.map((item, i) => (i === idx ? { ...item, label: e.target.value } : item));
                        set("footerNavigation", {
                          ...(form.footerNavigation ?? {}),
                          col2: { heading: form.footerNavigation?.col2?.heading ?? "Your stay", links: list },
                        });
                      }}
                    />
                    <Input
                      className="h-8 flex-[2] text-xs"
                      value={lnk.url}
                      placeholder="URL"
                      onChange={(e) => {
                        const list = arr.map((item, i) => (i === idx ? { ...item, url: e.target.value } : item));
                        set("footerNavigation", {
                          ...(form.footerNavigation ?? {}),
                          col2: { heading: form.footerNavigation?.col2?.heading ?? "Your stay", links: list },
                        });
                      }}
                    />
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={lnk.openInNewTab ?? false}
                        onCheckedChange={(val) => {
                          const list = arr.map((item, i) => (i === idx ? { ...item, openInNewTab: val } : item));
                          set("footerNavigation", {
                            ...(form.footerNavigation ?? {}),
                            col2: { heading: form.footerNavigation?.col2?.heading ?? "Your stay", links: list },
                          });
                        }}
                      />
                      <span className="text-[10px] text-muted-foreground">New tab</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={lnk.isEnabled ?? true}
                        onCheckedChange={(val) => {
                          const list = arr.map((item, i) => (i === idx ? { ...item, isEnabled: val } : item));
                          set("footerNavigation", {
                            ...(form.footerNavigation ?? {}),
                            col2: { heading: form.footerNavigation?.col2?.heading ?? "Your stay", links: list },
                          });
                        }}
                      />
                      <span className="text-[10px] text-muted-foreground">Active</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => {
                        const list = arr.filter((_, i) => i !== idx);
                        set("footerNavigation", {
                          ...(form.footerNavigation ?? {}),
                          col2: { heading: form.footerNavigation?.col2?.heading ?? "Your stay", links: list },
                        });
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: Links */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold">Column 3 (e.g. A little help)</h4>
                  <p className="text-xs text-muted-foreground">Header and policy / help links in the third column</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Enabled</span>
                    <Switch
                      checked={form.footerNavigation?.col3?.isEnabled !== false}
                      onCheckedChange={(val) => {
                        set("footerNavigation", {
                          ...(form.footerNavigation ?? {}),
                          col3: {
                            heading: form.footerNavigation?.col3?.heading ?? "A little help",
                            links: form.footerNavigation?.col3?.links ?? [],
                            isEnabled: val,
                          },
                        });
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => {
                      const col3 = form.footerNavigation?.col3 ?? { heading: "A little help", links: [], isEnabled: true };
                      const updated = [
                        ...(col3.links ?? []),
                        { id: `col3-${Date.now()}`, label: "New link", url: "/", openInNewTab: false, isEnabled: true },
                      ];
                      set("footerNavigation", {
                        ...(form.footerNavigation ?? {}),
                        col3: { ...col3, links: updated },
                      });
                    }}
                  >
                    <Plus className="mr-1.5 size-3.5" />
                    Add link
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Column Title</Label>
                <Input
                  value={form.footerNavigation?.col3?.heading ?? "A little help"}
                  onChange={(e) => {
                    set("footerNavigation", {
                      ...(form.footerNavigation ?? {}),
                      col3: {
                        heading: e.target.value,
                        links: form.footerNavigation?.col3?.links ?? [],
                      },
                    });
                  }}
                />
              </div>

              <div className="space-y-2">
                {(form.footerNavigation?.col3?.links ?? []).map((lnk, idx, arr) => (
                  <div key={lnk.id ?? idx} className="flex flex-wrap items-center gap-2 rounded border bg-muted/20 p-2 sm:flex-nowrap">
                    <Input
                      className="h-8 flex-1 text-xs"
                      value={lnk.label}
                      placeholder="Label"
                      onChange={(e) => {
                        const list = arr.map((item, i) => (i === idx ? { ...item, label: e.target.value } : item));
                        set("footerNavigation", {
                          ...(form.footerNavigation ?? {}),
                          col3: { heading: form.footerNavigation?.col3?.heading ?? "A little help", links: list },
                        });
                      }}
                    />
                    <Input
                      className="h-8 flex-[2] text-xs"
                      value={lnk.url}
                      placeholder="URL"
                      onChange={(e) => {
                        const list = arr.map((item, i) => (i === idx ? { ...item, url: e.target.value } : item));
                        set("footerNavigation", {
                          ...(form.footerNavigation ?? {}),
                          col3: { heading: form.footerNavigation?.col3?.heading ?? "A little help", links: list },
                        });
                      }}
                    />
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={lnk.openInNewTab ?? false}
                        onCheckedChange={(val) => {
                          const list = arr.map((item, i) => (i === idx ? { ...item, openInNewTab: val } : item));
                          set("footerNavigation", {
                            ...(form.footerNavigation ?? {}),
                            col3: { heading: form.footerNavigation?.col3?.heading ?? "A little help", links: list },
                          });
                        }}
                      />
                      <span className="text-[10px] text-muted-foreground">New tab</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={lnk.isEnabled ?? true}
                        onCheckedChange={(val) => {
                          const list = arr.map((item, i) => (i === idx ? { ...item, isEnabled: val } : item));
                          set("footerNavigation", {
                            ...(form.footerNavigation ?? {}),
                            col3: { heading: form.footerNavigation?.col3?.heading ?? "A little help", links: list },
                          });
                        }}
                      />
                      <span className="text-[10px] text-muted-foreground">Active</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => {
                        const list = arr.filter((_, i) => i !== idx);
                        set("footerNavigation", {
                          ...(form.footerNavigation ?? {}),
                          col3: { heading: form.footerNavigation?.col3?.heading ?? "A little help", links: list },
                        });
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 4: Contact & Bottom Bar */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Column 4: Contact Display</h4>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Enabled</span>
                    <Switch
                      checked={form.footerNavigation?.col4?.isEnabled !== false}
                      onCheckedChange={(val) => {
                        set("footerNavigation", {
                          ...(form.footerNavigation ?? {}),
                          col4: {
                            ...(form.footerNavigation?.col4 ?? { heading: "Contact" }),
                            isEnabled: val,
                          },
                        });
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Column Title</Label>
                  <Input
                    value={form.footerNavigation?.col4?.heading ?? "Contact"}
                    onChange={(e) => {
                      set("footerNavigation", {
                        ...(form.footerNavigation ?? {}),
                        col4: {
                          ...(form.footerNavigation?.col4 ?? {}),
                          heading: e.target.value,
                        },
                      });
                    }}
                  />
                </div>
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Show Phone ({form.phone || "Not set"})</span>
                    <Switch
                      checked={form.footerNavigation?.col4?.showPhone ?? true}
                      onCheckedChange={(val) => {
                        set("footerNavigation", {
                          ...(form.footerNavigation ?? {}),
                          col4: {
                            heading: form.footerNavigation?.col4?.heading ?? "Contact",
                            showPhone: val,
                            showEmail: form.footerNavigation?.col4?.showEmail ?? true,
                            showAddress: form.footerNavigation?.col4?.showAddress ?? false,
                          },
                        });
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Show Email ({form.supportEmail || "Not set"})</span>
                    <Switch
                      checked={form.footerNavigation?.col4?.showEmail ?? true}
                      onCheckedChange={(val) => {
                        set("footerNavigation", {
                          ...(form.footerNavigation ?? {}),
                          col4: {
                            heading: form.footerNavigation?.col4?.heading ?? "Contact",
                            showPhone: form.footerNavigation?.col4?.showPhone ?? true,
                            showEmail: val,
                            showAddress: form.footerNavigation?.col4?.showAddress ?? false,
                          },
                        });
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Show Address</span>
                    <Switch
                      checked={form.footerNavigation?.col4?.showAddress ?? false}
                      onCheckedChange={(val) => {
                        set("footerNavigation", {
                          ...(form.footerNavigation ?? {}),
                          col4: {
                            heading: form.footerNavigation?.col4?.heading ?? "Contact",
                            showPhone: form.footerNavigation?.col4?.showPhone ?? true,
                            showEmail: form.footerNavigation?.col4?.showEmail ?? true,
                            showAddress: val,
                          },
                        });
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="text-sm font-semibold">Footer Bottom Bar</h4>
                <div className="space-y-1">
                  <Label className="text-xs">Copyright Text</Label>
                  <Input
                    value={form.footerNavigation?.bottomBar?.copyrightText ?? "© 2026 Hamptworth Stays"}
                    onChange={(e) => {
                      set("footerNavigation", {
                        ...(form.footerNavigation ?? {}),
                        bottomBar: {
                          ...(form.footerNavigation?.bottomBar ?? {}),
                          copyrightText: e.target.value,
                        },
                      });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Location Text</Label>
                  <Input
                    value={form.footerNavigation?.bottomBar?.locationText ?? "Home Farm · Hamptworth"}
                    onChange={(e) => {
                      set("footerNavigation", {
                        ...(form.footerNavigation ?? {}),
                        bottomBar: {
                          ...(form.footerNavigation?.bottomBar ?? {}),
                          locationText: e.target.value,
                        },
                      });
                    }}
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs">Show "Back to top" button</span>
                  <Switch
                    checked={form.footerNavigation?.bottomBar?.showBackToTop ?? true}
                    onCheckedChange={(val) => {
                      set("footerNavigation", {
                        ...(form.footerNavigation ?? {}),
                        bottomBar: {
                          copyrightText: form.footerNavigation?.bottomBar?.copyrightText ?? "© 2026 Hamptworth Stays",
                          locationText: form.footerNavigation?.bottomBar?.locationText ?? "Home Farm · Hamptworth",
                          showBackToTop: val,
                        },
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Tab Panel: Checkout & Acknowledgement */}
        {activeTab === "checkout" && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl">Checkout Sections & Policies Control</CardTitle>
                <CardDescription className="mt-1">
                  Manage agreement sections, legal checkboxes, timing cards, and action buttons shown on the checkout page.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Book Faster (Optional) Section Control */}
            {(() => {
              const bf = form.bookingAcknowledgement?.bookFaster ?? DEFAULT_BOOK_FASTER;
              const updateBf = (patch: Partial<BookFasterSettings>) => {
                set("bookingAcknowledgement", {
                  ...(form.bookingAcknowledgement ?? {}),
                  bookFaster: { ...bf, ...patch },
                });
              };
              return (
                <div className="rounded-lg border p-4 space-y-4 bg-muted/10">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-semibold">Book Faster (Optional) Section</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Guest account opt-in shown on checkout. Disable to hide it entirely, or customize its copy.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Enabled</span>
                      <Switch
                        checked={bf.isEnabled !== false}
                        onCheckedChange={(val) => updateBf({ isEnabled: val })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Section Heading / Title</Label>
                      <Input
                        value={bf.title ?? ""}
                        placeholder="Book Faster (Optional)"
                        disabled={bf.isEnabled === false}
                        onChange={(e) => updateBf({ title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Checkbox Text</Label>
                      <Input
                        value={bf.checkboxText ?? ""}
                        placeholder="I would like to create an account."
                        disabled={bf.isEnabled === false}
                        onChange={(e) => updateBf({ checkboxText: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs font-semibold">Password Hint</Label>
                      <Input
                        value={bf.passwordHint ?? ""}
                        placeholder="At least 8 characters long, case sensitive, can contain !$#%, no spaces, not the same as previous password or login"
                        disabled={bf.isEnabled === false}
                        onChange={(e) => updateBf({ passwordHint: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <Switch
                        checked={bf.expandedByDefault === true}
                        disabled={bf.isEnabled === false}
                        onCheckedChange={(val) => updateBf({ expandedByDefault: val })}
                      />
                      <span className="text-xs text-muted-foreground">Expanded by default on checkout</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Standard Policies Timing Card Toggle */}
            <div className="rounded-lg border p-4 flex flex-wrap items-center justify-between gap-4 bg-muted/10">
              <div>
                <h4 className="text-sm font-semibold">Standard Policies (Check-in & Check-out timing card)</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Displays the Check-in (after {form.checkInTime || "4:00 pm"}) and Check-out (before {form.checkOutTime || "11:00 am"}) card above checkout agreements.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Enabled</span>
                <Switch
                  checked={form.bookingAcknowledgement?.showPoliciesSection !== false}
                  onCheckedChange={(val) => {
                    set("bookingAcknowledgement", {
                      ...(form.bookingAcknowledgement ?? {}),
                      showPoliciesSection: val,
                    });
                  }}
                />
              </div>
            </div>

            {/* Dynamic Checkout Sections */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div>
                  <h4 className="text-sm font-semibold">Checkout Agreement & Policy Sections</h4>
                  <p className="text-xs text-muted-foreground">
                    You can add multiple agreement sections (e.g. "Acknowledgement", "House Rules", "Security Deposit Terms"), reorder them, edit titles, and toggle them on/off.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full gap-1.5"
                  onClick={() => {
                    const currentSections: CheckoutSection[] =
                      form.bookingAcknowledgement?.sections && form.bookingAcknowledgement.sections.length > 0
                        ? form.bookingAcknowledgement.sections
                        : defaultAckSections(form.bookingAcknowledgement);

                    const newSection: CheckoutSection = {
                      id: `sec-${Date.now()}`,
                      title: "House Rules & Stay Terms",
                      introText: "Please read and confirm the stay guidelines.",
                      isEnabled: true,
                      items: [
                        {
                          id: `ack-${Date.now()}`,
                          text: 'I agree to observe the quiet hours and farm guidelines. <a href="/policies/HOUSE_RULES" target="_blank" rel="noopener noreferrer">House Rules</a>',
                          isRequired: true,
                          isEnabled: true,
                        },
                      ],
                    };

                    set("bookingAcknowledgement", {
                      ...(form.bookingAcknowledgement ?? {}),
                      sections: [...currentSections, newSection],
                    });
                  }}
                >
                  <Plus className="size-3.5" />
                  Add Checkout Section
                </Button>
              </div>

              {(() => {
                const currentSections: CheckoutSection[] =
                  form.bookingAcknowledgement?.sections && form.bookingAcknowledgement.sections.length > 0
                    ? form.bookingAcknowledgement.sections
                    : defaultAckSections(form.bookingAcknowledgement);

                return (
                  <div className="space-y-6">
                    {currentSections.map((sec, secIdx, secArr) => (
                      <div
                        key={sec.id ?? secIdx}
                        className="rounded-xl border bg-card p-4 sm:p-5 shadow-xs space-y-4"
                      >
                        {/* Section Header */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">
                              Section #{secIdx + 1}
                            </span>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={secIdx === 0}
                                className="h-7 w-7 p-0"
                                onClick={() => {
                                  if (secIdx === 0) return;
                                  const updated = [...secArr];
                                  const temp = updated[secIdx - 1];
                                  updated[secIdx - 1] = updated[secIdx];
                                  updated[secIdx] = temp;
                                  set("bookingAcknowledgement", {
                                    ...(form.bookingAcknowledgement ?? {}),
                                    sections: updated,
                                  });
                                }}
                              >
                                <ArrowUp className="size-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={secIdx === secArr.length - 1}
                                className="h-7 w-7 p-0"
                                onClick={() => {
                                  if (secIdx === secArr.length - 1) return;
                                  const updated = [...secArr];
                                  const temp = updated[secIdx + 1];
                                  updated[secIdx + 1] = updated[secIdx];
                                  updated[secIdx] = temp;
                                  set("bookingAcknowledgement", {
                                    ...(form.bookingAcknowledgement ?? {}),
                                    sections: updated,
                                  });
                                }}
                              >
                                <ArrowDown className="size-3.5" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">Enabled</span>
                              <Switch
                                checked={sec.isEnabled !== false}
                                onCheckedChange={(val) => {
                                  const updated = secArr.map((s, i) =>
                                    i === secIdx ? { ...s, isEnabled: val } : s
                                  );
                                  set("bookingAcknowledgement", {
                                    ...(form.bookingAcknowledgement ?? {}),
                                    sections: updated,
                                  });
                                }}
                              />
                            </div>

                            {secArr.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  const updated = secArr.filter((_, i) => i !== secIdx);
                                  set("bookingAcknowledgement", {
                                    ...(form.bookingAcknowledgement ?? {}),
                                    sections: updated,
                                  });
                                }}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Section Title & Intro */}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold">Section Heading / Title</Label>
                            <Input
                              value={sec.title}
                              placeholder="e.g. Acknowledgement"
                              onChange={(e) => {
                                const updated = secArr.map((s, i) =>
                                  i === secIdx ? { ...s, title: e.target.value } : s
                                );
                                set("bookingAcknowledgement", {
                                  ...(form.bookingAcknowledgement ?? {}),
                                  sections: updated,
                                });
                              }}
                            />
                          </div>

                          <div className="space-y-1 sm:col-span-2">
                            <RichTextEditor
                              compact
                              minHeightClass="min-h-16"
                              label="Introductory Note (Optional)"
                              value={sec.introText ?? ""}
                              onChange={(html) => {
                                const updated = secArr.map((s, i) =>
                                  i === secIdx ? { ...s, introText: html } : s
                                );
                                set("bookingAcknowledgement", {
                                  ...(form.bookingAcknowledgement ?? {}),
                                  sections: updated,
                                });
                              }}
                            />
                          </div>
                        </div>

                        {/* Items inside this section */}
                        <div className="rounded-lg border bg-muted/20 p-3 sm:p-4 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                            <div>
                              <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Agreement Checkboxes in "{sec.title || "Section"}" ({sec.items?.length ?? 0})
                              </h5>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs rounded-full gap-1"
                              onClick={() => {
                                const newItem: AcknowledgementItem = {
                                  id: `ack-${Date.now()}`,
                                  text: 'I agree to the <a href="/policies/TERMS" target="_blank" rel="noopener noreferrer">Booking Terms</a>.',
                                  isRequired: true,
                                  isEnabled: true,
                                };
                                const updated = secArr.map((s, i) =>
                                  i === secIdx
                                    ? { ...s, items: [...(s.items ?? []), newItem] }
                                    : s
                                );
                                set("bookingAcknowledgement", {
                                  ...(form.bookingAcknowledgement ?? {}),
                                  sections: updated,
                                });
                              }}
                            >
                              <Plus className="size-3" />
                              Add Checkbox
                            </Button>
                          </div>

                          {(sec.items ?? []).map((item: AcknowledgementItem, itIdx: number, itArr: AcknowledgementItem[]) => (
                            <div
                              key={item.id ?? itIdx}
                              className="rounded-lg border bg-background p-3 space-y-2.5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-semibold text-muted-foreground">
                                    Item #{itIdx + 1}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={itIdx === 0}
                                    className="h-5 w-5 p-0"
                                    onClick={() => {
                                      if (itIdx === 0) return;
                                      const newItems = [...itArr];
                                      const temp = newItems[itIdx - 1];
                                      newItems[itIdx - 1] = newItems[itIdx];
                                      newItems[itIdx] = temp;
                                      const updated = secArr.map((s, i) =>
                                        i === secIdx ? { ...s, items: newItems } : s
                                      );
                                      set("bookingAcknowledgement", {
                                        ...(form.bookingAcknowledgement ?? {}),
                                        sections: updated,
                                      });
                                    }}
                                  >
                                    <ArrowUp className="size-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={itIdx === itArr.length - 1}
                                    className="h-5 w-5 p-0"
                                    onClick={() => {
                                      if (itIdx === itArr.length - 1) return;
                                      const newItems = [...itArr];
                                      const temp = newItems[itIdx + 1];
                                      newItems[itIdx + 1] = newItems[itIdx];
                                      newItems[itIdx] = temp;
                                      const updated = secArr.map((s, i) =>
                                        i === secIdx ? { ...s, items: newItems } : s
                                      );
                                      set("bookingAcknowledgement", {
                                        ...(form.bookingAcknowledgement ?? {}),
                                        sections: updated,
                                      });
                                    }}
                                  >
                                    <ArrowDown className="size-3" />
                                  </Button>
                                </div>

                                <div className="flex items-center gap-2.5">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-muted-foreground">Required</span>
                                    <Switch
                                      checked={item.isRequired !== false}
                                      onCheckedChange={(val) => {
                                        const newItems = itArr.map((it: AcknowledgementItem, i: number) =>
                                          i === itIdx ? { ...it, isRequired: val } : it
                                        );
                                        const updated = secArr.map((s, i) =>
                                          i === secIdx ? { ...s, items: newItems } : s
                                        );
                                        set("bookingAcknowledgement", {
                                          ...(form.bookingAcknowledgement ?? {}),
                                          sections: updated,
                                        });
                                      }}
                                    />
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-muted-foreground">Active</span>
                                    <Switch
                                      checked={item.isEnabled !== false}
                                      onCheckedChange={(val) => {
                                        const newItems = itArr.map((it: AcknowledgementItem, i: number) =>
                                          i === itIdx ? { ...it, isEnabled: val } : it
                                        );
                                        const updated = secArr.map((s, i) =>
                                          i === secIdx ? { ...s, items: newItems } : s
                                        );
                                        set("bookingAcknowledgement", {
                                          ...(form.bookingAcknowledgement ?? {}),
                                          sections: updated,
                                        });
                                      }}
                                    />
                                  </div>

                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                                    onClick={() => {
                                      const newItems = itArr.filter((_: AcknowledgementItem, i: number) => i !== itIdx);
                                      const updated = secArr.map((s, i) =>
                                        i === secIdx ? { ...s, items: newItems } : s
                                      );
                                      set("bookingAcknowledgement", {
                                        ...(form.bookingAcknowledgement ?? {}),
                                        sections: updated,
                                      });
                                    }}
                                  >
                                    <Trash2 className="size-3" />
                                  </Button>
                                </div>
                              </div>

                              <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-1 sm:col-span-2">
                                  <RichTextEditor
                                    compact
                                    minHeightClass="min-h-16"
                                    label="Checkbox Text"
                                    value={item.text}
                                    onChange={(html) => {
                                      const newItems = itArr.map((it: AcknowledgementItem, i: number) =>
                                        i === itIdx ? { ...it, text: html } : it
                                      );
                                      const updated = secArr.map((s, i) =>
                                        i === secIdx ? { ...s, items: newItems } : s
                                      );
                                      set("bookingAcknowledgement", {
                                        ...(form.bookingAcknowledgement ?? {}),
                                        sections: updated,
                                      });
                                    }}
                                  />
                                  <p className="text-[11px] text-muted-foreground">
                                    Use the link tool above to embed a link anywhere in the text.
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Call To Action Buttons & Validation Hints */}
            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="text-sm font-semibold">Button Labels & Validation Hints</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Confirm Button Text</Label>
                  <Input
                    value={form.bookingAcknowledgement?.buttonText ?? "Confirm booking"}
                    onChange={(e) => {
                      set("bookingAcknowledgement", {
                        ...(form.bookingAcknowledgement ?? {}),
                        buttonText: e.target.value,
                      });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Processing / Busy Button Text</Label>
                  <Input
                    value={form.bookingAcknowledgement?.busyButtonText ?? "Holding your cottage…"}
                    onChange={(e) => {
                      set("bookingAcknowledgement", {
                        ...(form.bookingAcknowledgement ?? {}),
                        busyButtonText: e.target.value,
                      });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Incomplete Contact Hint</Label>
                  <Input
                    value={form.bookingAcknowledgement?.incompleteContactHint ?? "Complete contact info above to continue."}
                    onChange={(e) => {
                      set("bookingAcknowledgement", {
                        ...(form.bookingAcknowledgement ?? {}),
                        incompleteContactHint: e.target.value,
                      });
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Incomplete Terms Hint</Label>
                  <Input
                    value={form.bookingAcknowledgement?.incompleteTermsHint ?? "Please accept the required terms to continue."}
                    onChange={(e) => {
                      set("bookingAcknowledgement", {
                        ...(form.bookingAcknowledgement ?? {}),
                        incompleteTermsHint: e.target.value,
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Bottom Save Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t">
          <p className="text-xs text-muted-foreground">
            Changes saved in any tab update the global system live across customer-facing pages.
          </p>
          <Button
            type="submit"
            className="rounded-full px-6"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default SettingsPage;
