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
  Home,
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

export interface CottageEnquirySettings {
  isEnabled?: boolean;
  heading?: string;
  description?: string;
  buttonLabel?: string;
  url?: string;
  openInNewTab?: boolean;
  showBookNow?: boolean;
  bookNowLabel?: string;
  dialogDescription?: string;
}

export interface ReservationDetailsSettings {
  isEnabled?: boolean;
  title?: string;
  specialRequestsLabel?: string;
  specialRequestsPlaceholder?: string;
  maxLength?: number;
}

export interface BookingPagePoliciesSettings {
  isEnabled?: boolean;
  title?: string;
  checkInLabel?: string;
  checkInText?: string;
  checkOutLabel?: string;
  checkOutText?: string;
}

export interface BookingJourneySettings {
  previewNotice?: string;
  modalTitle?: string;
  step1Subtitle?: string;
  step1Title?: string;
  step1Note?: string;
  step1ExploreLinkText?: string;
  step1CheckInLabel?: string;
  step1CheckOutLabel?: string;
  step1AdultsLabel?: string;
  step1ChildrenLabel?: string;
  step1ButtonText?: string;
  step2Subtitle?: string;
  step2Title?: string;
  step2Description?: string;
  groupStayText?: string;
  groupStayUrl?: string;
  noCottagesMessage?: string;
  step3DogsTitle?: string;
  step3DogsDescription?: string;
  step3DogsSelectLabel?: string;
  step3DogsZeroOption?: string;
  noPetsNotice?: string;
  seePetCottagesText?: string;
  extrasHeading?: string;
  extrasDescription?: string;
  extrasEmptyMessage?: string;
  extrasDisclaimer?: string;
  skipExtrasText?: string;
  step3NextButtonText?: string;
  step4Title?: string;
  step4Description?: string;
  step4ReservedDescription?: string;
  contactSectionTitle?: string;
  specialRequestsLabel?: string;
  specialRequestsPlaceholder?: string;
  acknowledgementText?: string;
  payButtonText?: string;
  step5Title?: string;
  step5Subtitle?: string;
  step5Note?: string;
  step5Disclaimer?: string;
  sidebarTaxesNotice?: string;
}

export interface BookingPageSettings {
  enquiry?: CottageEnquirySettings;
  reservationDetails?: ReservationDetailsSettings;
  policies?: BookingPagePoliciesSettings;
  bookingJourney?: BookingJourneySettings;
}

export const DEFAULT_BOOKING_PAGE = {
  enquiry: {
    isEnabled: true,
    heading: "Enquire about {cottage}",
    description: "Tell us your dates, party and budget — we will be in touch.",
    buttonLabel: "Enquire now",
    url: "https://hamptworthstays.com/plan-your-experience/",
    openInNewTab: true,
    showBookNow: true,
    bookNowLabel: "Book now",
    dialogDescription:
      "Holiday budget, party size, dates, location, dog friendly — anything helps.",
  } satisfies Required<CottageEnquirySettings>,
  reservationDetails: {
    isEnabled: true,
    title: "Reservation details",
    specialRequestsLabel: "Special Requests",
    specialRequestsPlaceholder: "Special Requests",
    maxLength: 1000,
  } satisfies Required<ReservationDetailsSettings>,
  policies: {
    isEnabled: true,
    title: "Policies",
    checkInLabel: "Check-in",
    checkInText: "after 4:00 pm",
    checkOutLabel: "Check-out",
    checkOutText: "before 10:00 am",
  } satisfies Required<BookingPagePoliciesSettings>,
  bookingJourney: {
    previewNotice: "DESIGN PREVIEW · NO BOOKINGS OR PAYMENTS TAKEN",
    modalTitle: "Book your stay.",
    step1Subtitle: "YOUR STAY AT HOME FARM",
    step1Title: "When would you like to stay?",
    step1Note: "Design preview · example prices, no live availability.",
    step1ExploreLinkText: "Explore the cottages first",
    step1CheckInLabel: "CHECK IN",
    step1CheckOutLabel: "CHECK OUT",
    step1AdultsLabel: "ADULTS",
    step1ChildrenLabel: "CHILDREN",
    step1ButtonText: "See available cottages",
    step2Subtitle: "YOUR STAY AT HOME FARM",
    step2Title: "Choose your cottage.",
    step2Description: "Take a closer look and choose your place at Home Farm.",
    groupStayText: "Booking several cottages? Plan a group stay ↗",
    groupStayUrl: "",
    noCottagesMessage: "No cottages available for these dates and party size.",
    step3DogsTitle: "Bringing a dog?",
    step3DogsDescription: "{cottage} welcomes up to {max} dog{plural}. £{fee} per dog for the whole stay.",
    step3DogsSelectLabel: "DOGS JOINING YOUR STAY",
    step3DogsZeroOption: "No dogs — no charge",
    noPetsNotice: "This cottage does not accommodate pets.",
    seePetCottagesText: "See pet-friendly cottages",
    extrasHeading: "Make it your kind of stay.",
    extrasDescription: "A little more time outdoors, or something lovely around the table. Everything here is optional.",
    extrasEmptyMessage: "No optional extras currently listed for this cottage. Admin can add extras in the Admin Panel anytime.",
    extrasDisclaimer: "These prices demonstrate the booking flow. Final prices, times, availability and package inclusions must be confirmed before the live site offers them.",
    skipExtrasText: "Skip activities & dining →",
    step3NextButtonText: "Your details →",
    step4Title: "Almost there.",
    step4Description: "A short guest checkout, with your selected dates and full total kept in view.",
    step4ReservedDescription: "Your cottage is reserved. Complete payment securely below to confirm your stay.",
    contactSectionTitle: "Contact information",
    specialRequestsLabel: "Special requests",
    specialRequestsPlaceholder: "Any notes for your stay (optional)",
    acknowledgementText: "I understand this is a design preview. No booking, enquiry or payment will be submitted.",
    payButtonText: "Pay with Card",
    step5Title: "A clear path",
    step5Subtitle: "from cottage to checkout.",
    step5Note: "A confirmation email has been sent with your booking details and receipt.",
    step5Disclaimer: "The live payment step needs to connect to the existing booking system and Stripe after the final price and availability are confirmed.",
    sidebarTaxesNotice: "Taxes and all charges included. Secure card payment via Stripe.",
  } satisfies Required<BookingJourneySettings>,
};

export interface HomePageHeroSettings {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  showBird?: boolean;
  showLeaves?: boolean;
}

export interface HomePageSectionSettings {
  heading?: string;
  subtitle?: string;
  enquireUrl?: string;
  showEnquireLink?: boolean;
  isEnabled?: boolean;
}

export interface HomePageSettings {
  hero?: HomePageHeroSettings;
  section1?: HomePageSectionSettings;
  section2?: HomePageSectionSettings;
  emptyHeading?: string;
  emptySubtitle?: string;
}

export const DEFAULT_HOME_PAGE: HomePageSettings = {
  hero: {
    eyebrow: "Hamptworth Stays · Home Farm",
    title: "A little escape.",
    subtitle: "Choose your dates. Enjoy a slower pace.",
    showBird: true,
    showLeaves: true,
  },
  section1: {
    heading: "Available cottages",
    subtitle: "Booking several cottages? Enquire about a group stay",
    enquireUrl: "https://hamptworthstays.com/plan-your-experience/",
    showEnquireLink: true,
  },
  section2: {
    isEnabled: true,
    heading: "More Estate Cottages",
    subtitle: "Explore our additional luxury countryside retreats",
    enquireUrl: "https://hamptworthstays.com/plan-your-experience/",
    showEnquireLink: true,
  },
  emptyHeading: "Nothing available for these dates",
  emptySubtitle: "Try different dates, fewer guests, or fewer cottages.",
};

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
  bookingPage?: BookingPageSettings;
  homePage?: HomePageSettings;
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
      bookingPage: {
        enquiry: {
          ...DEFAULT_BOOKING_PAGE.enquiry,
          ...(initial.bookingPage?.enquiry ?? {}),
        },
        reservationDetails: {
          ...DEFAULT_BOOKING_PAGE.reservationDetails,
          ...(initial.bookingPage?.reservationDetails ?? {}),
        },
        policies: {
          ...DEFAULT_BOOKING_PAGE.policies,
          ...(initial.bookingPage?.policies ?? {}),
        },
        bookingJourney: {
          ...DEFAULT_BOOKING_PAGE.bookingJourney,
          ...(initial.bookingPage?.bookingJourney ?? {}),
        },
      },
      homePage: {
        hero: {
          ...DEFAULT_HOME_PAGE.hero,
          ...(initial.homePage?.hero ?? {}),
        },
        section1: {
          ...DEFAULT_HOME_PAGE.section1,
          ...(initial.homePage?.section1 ?? {}),
        },
        section2: {
          ...DEFAULT_HOME_PAGE.section2,
          ...(initial.homePage?.section2 ?? {}),
        },
        emptyHeading: initial.homePage?.emptyHeading ?? DEFAULT_HOME_PAGE.emptyHeading,
        emptySubtitle: initial.homePage?.emptySubtitle ?? DEFAULT_HOME_PAGE.emptySubtitle,
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

  type SettingsTab = "property" | "homepage" | "benefits" | "header" | "footer" | "checkout";
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
      id: "homepage",
      label: "Home Page & Sections",
      icon: Home,
      desc: "Hero banner text, Section 1 & Section 2 cottage groups",
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
      label: "Bookings & Checkout",
      icon: ShieldCheck,
      desc: "Enquiry block, reservation details, policies & agreements",
    },
  ];

  const home = {
    hero: {
      ...DEFAULT_HOME_PAGE.hero,
      ...(form.homePage?.hero ?? {}),
    },
    section1: {
      ...DEFAULT_HOME_PAGE.section1,
      ...(form.homePage?.section1 ?? {}),
    },
    section2: {
      ...DEFAULT_HOME_PAGE.section2,
      ...(form.homePage?.section2 ?? {}),
    },
    emptyHeading: form.homePage?.emptyHeading ?? DEFAULT_HOME_PAGE.emptyHeading,
    emptySubtitle: form.homePage?.emptySubtitle ?? DEFAULT_HOME_PAGE.emptySubtitle,
  };

  const updateHome = <K extends keyof HomePageSettings>(
    section: K,
    patch: Partial<NonNullable<HomePageSettings[K]>> | string,
  ) => {
    set("homePage", {
      ...home,
      [section]:
        typeof patch === "string"
          ? patch
          : { ...((home[section] as Record<string, unknown>) ?? {}), ...patch },
    });
  };

  const enquiry = {
    ...DEFAULT_BOOKING_PAGE.enquiry,
    ...(form.bookingPage?.enquiry ?? {}),
  };
  const reservation = {
    ...DEFAULT_BOOKING_PAGE.reservationDetails,
    ...(form.bookingPage?.reservationDetails ?? {}),
  };
  const policies = {
    ...DEFAULT_BOOKING_PAGE.policies,
    ...(form.bookingPage?.policies ?? {}),
  };
  const updateEnquiry = (patch: Partial<CottageEnquirySettings>) => {
    set("bookingPage", {
      ...(form.bookingPage ?? {}),
      enquiry: { ...enquiry, ...patch },
    });
  };
  const updateReservation = (patch: Partial<ReservationDetailsSettings>) => {
    set("bookingPage", {
      ...(form.bookingPage ?? {}),
      reservationDetails: { ...reservation, ...patch },
    });
  };
  const updatePolicies = (patch: Partial<BookingPagePoliciesSettings>) => {
    set("bookingPage", {
      ...(form.bookingPage ?? {}),
      policies: { ...policies, ...patch },
    });
  };
  const policiesEnabled =
    form.bookingAcknowledgement?.showPoliciesSection !== false &&
    policies.isEnabled !== false;
  const setPoliciesEnabled = (val: boolean) => {
    set("bookingAcknowledgement", {
      ...(form.bookingAcknowledgement ?? {}),
      showPoliciesSection: val,
    });
    updatePolicies({ isEnabled: val });
  };

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

        {/* Tab Panel: Home Page & Sections */}
        {activeTab === "homepage" && (
          <div className="space-y-6">
            {/* 1. Hero Banner */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Home Page · Hero Banner</CardTitle>
                <CardDescription>
                  Configure the primary top banner headline, eyebrow, subtitle and animated elements seen by all guests.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hp-eyebrow">Top Eyebrow Text</Label>
                  <Input
                    id="hp-eyebrow"
                    value={home.hero.eyebrow ?? ""}
                    onChange={(e) => updateHome("hero", { eyebrow: e.target.value })}
                    placeholder="e.g. Hamptworth Stays · Home Farm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Small uppercase text shown above the main title.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hp-title">Main Hero Title</Label>
                  <Input
                    id="hp-title"
                    value={home.hero.title ?? ""}
                    onChange={(e) => updateHome("hero", { title: e.target.value })}
                    placeholder="e.g. A little escape."
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Large serif title on the hero photograph.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hp-subtitle">Hero Subtitle / Tagline</Label>
                  <Input
                    id="hp-subtitle"
                    value={home.hero.subtitle ?? ""}
                    onChange={(e) => updateHome("hero", { subtitle: e.target.value })}
                    placeholder="e.g. Choose your dates. Enjoy a slower pace."
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Italic subtitle displayed below the title.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 pt-2">
                  <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                    <div className="space-y-0.5">
                      <Label htmlFor="hp-bird" className="text-sm font-medium">Decorative Bird Animation</Label>
                      <p className="text-xs text-muted-foreground">
                        Show the floating countryside bird beside the title.
                      </p>
                    </div>
                    <Switch
                      id="hp-bird"
                      checked={home.hero.showBird !== false}
                      onCheckedChange={(checked) => updateHome("hero", { showBird: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                    <div className="space-y-0.5">
                      <Label htmlFor="hp-leaves" className="text-sm font-medium">Ambient Leaves</Label>
                      <p className="text-xs text-muted-foreground">
                        Show drifting botanical leaves at the hero borders.
                      </p>
                    </div>
                    <Switch
                      id="hp-leaves"
                      checked={home.hero.showLeaves !== false}
                      onCheckedChange={(checked) => updateHome("hero", { showLeaves: checked })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Section 1 (Main / Home Farm Cottages) */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Section 1 · Main Cottages</CardTitle>
                    <CardDescription>
                      Displays all cottages assigned to Section 1 (e.g. Home Farm Cottages).
                    </CardDescription>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                    1st Section
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hp-sec1-heading">Section 1 Heading</Label>
                  <Input
                    id="hp-sec1-heading"
                    value={home.section1.heading ?? ""}
                    onChange={(e) => updateHome("section1", { heading: e.target.value })}
                    placeholder="e.g. Available cottages"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="hp-sec1-sub">Group Stay / Enquire Link Text</Label>
                    <Input
                      id="hp-sec1-sub"
                      value={home.section1.subtitle ?? ""}
                      onChange={(e) => updateHome("section1", { subtitle: e.target.value })}
                      placeholder="e.g. Booking several cottages? Enquire about a group stay"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hp-sec1-url">Group Stay Link URL</Label>
                    <Input
                      id="hp-sec1-url"
                      value={home.section1.enquireUrl ?? ""}
                      onChange={(e) => updateHome("section1", { enquireUrl: e.target.value })}
                      placeholder="e.g. https://hamptworthstays.com/plan-your-experience/"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="hp-sec1-link-toggle" className="text-sm font-medium">Show Enquire Link</Label>
                    <p className="text-xs text-muted-foreground">
                      Display group booking enquire button in Section 1 header.
                    </p>
                  </div>
                  <Switch
                    id="hp-sec1-link-toggle"
                    checked={home.section1.showEnquireLink !== false}
                    onCheckedChange={(checked) => updateHome("section1", { showEnquireLink: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 3. Section 2 (Estate / Other Property Cottages) */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Section 2 · Estate / Other Property Cottages</CardTitle>
                    <CardDescription>
                      Displays cottages assigned to Section 2 (e.g. Other Property / Estate Retreats).
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="hp-sec2-enable" className="text-xs font-medium">Enable Section 2</Label>
                    <Switch
                      id="hp-sec2-enable"
                      checked={home.section2.isEnabled !== false}
                      onCheckedChange={(checked) => updateHome("section2", { isEnabled: checked })}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hp-sec2-heading">Section 2 Heading</Label>
                  <Input
                    id="hp-sec2-heading"
                    value={home.section2.heading ?? ""}
                    onChange={(e) => updateHome("section2", { heading: e.target.value })}
                    placeholder="e.g. More Estate Cottages"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="hp-sec2-sub">Section 2 Subtitle / Link Text</Label>
                    <Input
                      id="hp-sec2-sub"
                      value={home.section2.subtitle ?? ""}
                      onChange={(e) => updateHome("section2", { subtitle: e.target.value })}
                      placeholder="e.g. Explore our additional luxury countryside retreats"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hp-sec2-url">Section 2 Enquire Link URL</Label>
                    <Input
                      id="hp-sec2-url"
                      value={home.section2.enquireUrl ?? ""}
                      onChange={(e) => updateHome("section2", { enquireUrl: e.target.value })}
                      placeholder="e.g. https://hamptworthstays.com/plan-your-experience/"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="hp-sec2-link-toggle" className="text-sm font-medium">Show Enquire Link in Section 2</Label>
                    <p className="text-xs text-muted-foreground">
                      Display enquire button in Section 2 header.
                    </p>
                  </div>
                  <Switch
                    id="hp-sec2-link-toggle"
                    checked={home.section2.showEnquireLink !== false}
                    onCheckedChange={(checked) => updateHome("section2", { showEnquireLink: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 4. Empty State Notice */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Empty Availability Message</CardTitle>
                <CardDescription>
                  Custom message shown when no cottages are available for the guest's selected dates.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hp-empty-heading">Empty Title</Label>
                  <Input
                    id="hp-empty-heading"
                    value={home.emptyHeading ?? ""}
                    onChange={(e) => updateHome("emptyHeading", e.target.value)}
                    placeholder="e.g. Nothing available for these dates"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hp-empty-sub">Empty Subtitle</Label>
                  <Input
                    id="hp-empty-sub"
                    value={home.emptySubtitle ?? ""}
                    onChange={(e) => updateHome("emptySubtitle", e.target.value)}
                    placeholder="e.g. Try different dates, fewer guests, or fewer cottages."
                  />
                </div>
              </CardContent>
            </Card>
          </div>
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

        {/* Tab Panel: Bookings & Checkout */}
        {activeTab === "checkout" && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl">Bookings & Checkout Content</CardTitle>
                <CardDescription className="mt-1">
                  Each section below controls a different part of the guest journey: cottage enquiry block, reservation details, policies, book-faster opt-in, agreements, and checkout buttons.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Section: Cottage Enquiry Block */}
            <div className="rounded-lg border p-4 space-y-4 bg-muted/10">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold">Cottage Enquiry Block</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    "Enquire about …" block shown on every cottage detail page. Disable to hide it entirely.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Show section</span>
                  <Switch
                    checked={enquiry.isEnabled !== false}
                    onCheckedChange={(val) => updateEnquiry({ isEnabled: val })}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">Heading</Label>
                  <Input
                    value={enquiry.heading}
                    disabled={enquiry.isEnabled === false}
                    placeholder="Enquire about {cottage}"
                    onChange={(e) => updateEnquiry({ heading: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Use <code className="font-mono">{"{cottage}"}</code> to insert the cottage name automatically.
                  </p>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">Description</Label>
                  <textarea
                    value={enquiry.description}
                    disabled={enquiry.isEnabled === false}
                    rows={2}
                    placeholder="Tell us your dates, party and budget — we will be in touch."
                    onChange={(e) => updateEnquiry({ description: e.target.value })}
                    className="flex min-h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Enquire Button Label</Label>
                  <Input
                    value={enquiry.buttonLabel}
                    disabled={enquiry.isEnabled === false}
                    placeholder="Enquire now"
                    onChange={(e) => updateEnquiry({ buttonLabel: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Enquire Button URL</Label>
                  <Input
                    value={enquiry.url}
                    disabled={enquiry.isEnabled === false}
                    placeholder="Leave empty to open the enquiry form"
                    onChange={(e) => updateEnquiry({ url: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Leave empty to open the built-in enquiry dialog, or paste an external link.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={enquiry.openInNewTab === true}
                    disabled={enquiry.isEnabled === false}
                    onCheckedChange={(val) => updateEnquiry({ openInNewTab: val })}
                  />
                  <span className="text-xs text-muted-foreground">Open external URL in new tab</span>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">Enquiry Dialog Description</Label>
                  <Input
                    value={enquiry.dialogDescription}
                    disabled={enquiry.isEnabled === false}
                    placeholder="Holiday budget, party size, dates, location, dog friendly — anything helps."
                    onChange={(e) => updateEnquiry({ dialogDescription: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3 border-t pt-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={enquiry.showBookNow !== false}
                    disabled={enquiry.isEnabled === false}
                    onCheckedChange={(val) => updateEnquiry({ showBookNow: val })}
                  />
                  <span className="text-xs text-muted-foreground">Show "Book now" button</span>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Book Now Label</Label>
                  <Input
                    value={enquiry.bookNowLabel}
                    disabled={enquiry.isEnabled === false || enquiry.showBookNow === false}
                    placeholder="Book now"
                    onChange={(e) => updateEnquiry({ bookNowLabel: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Section: Reservation Details */}
            <div className="rounded-lg border p-4 space-y-4 bg-muted/10">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold">Reservation Details Card</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Special requests input shown on the checkout page.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Show card</span>
                  <Switch
                    checked={reservation.isEnabled !== false}
                    onCheckedChange={(val) => updateReservation({ isEnabled: val })}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Card Title</Label>
                  <Input
                    value={reservation.title}
                    disabled={reservation.isEnabled === false}
                    placeholder="Reservation details"
                    onChange={(e) => updateReservation({ title: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Field Label</Label>
                  <Input
                    value={reservation.specialRequestsLabel}
                    disabled={reservation.isEnabled === false}
                    placeholder="Special Requests"
                    onChange={(e) => updateReservation({ specialRequestsLabel: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Placeholder</Label>
                  <Input
                    value={reservation.specialRequestsPlaceholder}
                    disabled={reservation.isEnabled === false}
                    placeholder="Special Requests"
                    onChange={(e) => updateReservation({ specialRequestsPlaceholder: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Maximum Characters</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5000}
                    value={reservation.maxLength}
                    disabled={reservation.isEnabled === false}
                    onChange={(e) =>
                      updateReservation({
                        maxLength: Math.min(5000, Math.max(1, Number(e.target.value) || 1000)),
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Section: Policies */}
            <div className="rounded-lg border p-4 space-y-4 bg-muted/10">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold">Policies Card (Check-in & Check-out)</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Timing card shown above the checkout agreements.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Show card</span>
                  <Switch
                    checked={policiesEnabled}
                    onCheckedChange={setPoliciesEnabled}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">Card Title</Label>
                  <Input
                    value={policies.title}
                    disabled={!policiesEnabled}
                    placeholder="Policies"
                    onChange={(e) => updatePolicies({ title: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Check-in Label</Label>
                  <Input
                    value={policies.checkInLabel}
                    disabled={!policiesEnabled}
                    placeholder="Check-in"
                    onChange={(e) => updatePolicies({ checkInLabel: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Check-in Text</Label>
                  <Input
                    value={policies.checkInText}
                    disabled={!policiesEnabled}
                    placeholder="after 4:00 pm"
                    onChange={(e) => updatePolicies({ checkInText: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Check-out Label</Label>
                  <Input
                    value={policies.checkOutLabel}
                    disabled={!policiesEnabled}
                    placeholder="Check-out"
                    onChange={(e) => updatePolicies({ checkOutLabel: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Check-out Text</Label>
                  <Input
                    value={policies.checkOutText}
                    disabled={!policiesEnabled}
                    placeholder="before 10:00 am"
                    onChange={(e) => updatePolicies({ checkOutText: e.target.value })}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground sm:col-span-2">
                  Type the exact text guests will see under each label (for example, "after 4:00 pm" or "before 10:00 am").
                </p>
              </div>
            </div>

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

            {/* Booking Journey Preview Modal Content */}
            {(() => {
              const bj = form.bookingPage?.bookingJourney ?? DEFAULT_BOOKING_PAGE.bookingJourney;
              const updateBj = (patch: Partial<BookingJourneySettings>) => {
                set("bookingPage", {
                  ...(form.bookingPage ?? {}),
                  bookingJourney: { ...bj, ...patch },
                });
              };

              return (
                <div className="rounded-lg border p-4 space-y-4 bg-muted/10">
                  <div className="border-b pb-3">
                    <h4 className="text-sm font-semibold">Booking Journey Preview Modal Content</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configure text, titles, subtitles, notices, and disclaimers displayed inside the 5-step interactive booking preview dialog.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Header Top Controls */}
                    <div className="border-b pb-4">
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                        Dialog Header Bar
                      </h5>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Header Top Notice</Label>
                          <Input
                            value={bj.previewNotice ?? ""}
                            placeholder="DESIGN PREVIEW · NO BOOKINGS OR PAYMENTS TAKEN"
                            onChange={(e) => updateBj({ previewNotice: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Modal Main Title</Label>
                          <Input
                            value={bj.modalTitle ?? ""}
                            placeholder="Book your stay."
                            onChange={(e) => updateBj({ modalTitle: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Step 1: Dates & Guests */}
                    <div className="border-b pb-4">
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                        Step 1: Dates &amp; Guests
                      </h5>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Step 1 Subtitle</Label>
                          <Input
                            value={bj.step1Subtitle ?? ""}
                            placeholder="YOUR STAY AT HOME FARM"
                            onChange={(e) => updateBj({ step1Subtitle: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Step 1 Heading</Label>
                          <Input
                            value={bj.step1Title ?? ""}
                            placeholder="When would you like to stay?"
                            onChange={(e) => updateBj({ step1Title: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <RichTextEditor
                            label="Step 1 Subtitle Note"
                            compact
                            minHeightClass="min-h-[55px]"
                            value={bj.step1Note ?? ""}
                            onChange={(html) => updateBj({ step1Note: html })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Explore Link Text</Label>
                          <Input
                            value={bj.step1ExploreLinkText ?? ""}
                            placeholder="Explore the cottages first"
                            onChange={(e) => updateBj({ step1ExploreLinkText: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Button Text</Label>
                          <Input
                            value={bj.step1ButtonText ?? ""}
                            placeholder="See available cottages"
                            onChange={(e) => updateBj({ step1ButtonText: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Check-in Field Label</Label>
                          <Input
                            value={bj.step1CheckInLabel ?? ""}
                            placeholder="CHECK IN"
                            onChange={(e) => updateBj({ step1CheckInLabel: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Check-out Field Label</Label>
                          <Input
                            value={bj.step1CheckOutLabel ?? ""}
                            placeholder="CHECK OUT"
                            onChange={(e) => updateBj({ step1CheckOutLabel: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Adults Field Label</Label>
                          <Input
                            value={bj.step1AdultsLabel ?? ""}
                            placeholder="ADULTS"
                            onChange={(e) => updateBj({ step1AdultsLabel: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Children Field Label</Label>
                          <Input
                            value={bj.step1ChildrenLabel ?? ""}
                            placeholder="CHILDREN"
                            onChange={(e) => updateBj({ step1ChildrenLabel: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Step 2: Cottage Selection */}
                    <div className="border-b pb-4">
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                        Step 2: Cottage Selection
                      </h5>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Step 2 Subtitle</Label>
                          <Input
                            value={bj.step2Subtitle ?? ""}
                            placeholder="YOUR STAY AT HOME FARM"
                            onChange={(e) => updateBj({ step2Subtitle: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Step 2 Heading</Label>
                          <Input
                            value={bj.step2Title ?? ""}
                            placeholder="Choose your cottage."
                            onChange={(e) => updateBj({ step2Title: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs font-semibold">Step 2 Description</Label>
                          <Input
                            value={bj.step2Description ?? ""}
                            placeholder="Take a closer look and choose your place at Home Farm."
                            onChange={(e) => updateBj({ step2Description: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <RichTextEditor
                            label="Group Stay Banner Note"
                            compact
                            minHeightClass="min-h-[55px]"
                            value={bj.groupStayText ?? ""}
                            onChange={(html) => updateBj({ groupStayText: html })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Group Stay Link URL</Label>
                          <Input
                            value={bj.groupStayUrl ?? ""}
                            placeholder="https://hamptworthstays.com/plan-your-experience/"
                            onChange={(e) => updateBj({ groupStayUrl: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">No Cottages Available Message</Label>
                          <Input
                            value={bj.noCottagesMessage ?? ""}
                            placeholder="No cottages available for these dates and party size."
                            onChange={(e) => updateBj({ noCottagesMessage: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Extras & Dogs */}
                    <div className="border-b pb-4">
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                        Step 3: Optional Extras &amp; Dogs
                      </h5>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Dogs Policy Card Title</Label>
                          <Input
                            value={bj.step3DogsTitle ?? ""}
                            placeholder="Bringing a dog?"
                            onChange={(e) => updateBj({ step3DogsTitle: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Non-Pet Notice</Label>
                          <Input
                            value={bj.noPetsNotice ?? ""}
                            placeholder="This cottage does not accommodate pets."
                            onChange={(e) => updateBj({ noPetsNotice: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs font-semibold">Dog Fee Description Format</Label>
                          <Input
                            value={bj.step3DogsDescription ?? ""}
                            placeholder="{cottage} welcomes up to {max} dog{plural}. £{fee} per dog for the whole stay."
                            onChange={(e) => updateBj({ step3DogsDescription: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Dogs Select Label</Label>
                          <Input
                            value={bj.step3DogsSelectLabel ?? ""}
                            placeholder="DOGS JOINING YOUR STAY"
                            onChange={(e) => updateBj({ step3DogsSelectLabel: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Zero Dogs Option Text</Label>
                          <Input
                            value={bj.step3DogsZeroOption ?? ""}
                            placeholder="No dogs — no charge"
                            onChange={(e) => updateBj({ step3DogsZeroOption: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">See Pet Cottages Button Text</Label>
                          <Input
                            value={bj.seePetCottagesText ?? ""}
                            placeholder="See pet-friendly cottages"
                            onChange={(e) => updateBj({ seePetCottagesText: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Skip Extras Link Text</Label>
                          <Input
                            value={bj.skipExtrasText ?? ""}
                            placeholder="Skip activities & dining →"
                            onChange={(e) => updateBj({ skipExtrasText: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <RichTextEditor
                            label="Step 3 Extras Heading / Title"
                            compact
                            minHeightClass="min-h-[55px]"
                            value={bj.extrasHeading ?? ""}
                            onChange={(html) => updateBj({ extrasHeading: html })}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <RichTextEditor
                            label="Step 3 Extras Description / Subtitle"
                            compact
                            minHeightClass="min-h-[75px]"
                            value={bj.extrasDescription ?? ""}
                            onChange={(html) => updateBj({ extrasDescription: html })}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <RichTextEditor
                            label="Step 3 Extras Empty State Notice (When cottage has no add-ons)"
                            compact
                            minHeightClass="min-h-[55px]"
                            value={bj.extrasEmptyMessage ?? ""}
                            onChange={(html) => updateBj({ extrasEmptyMessage: html })}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <RichTextEditor
                            label="Step 3 Extras Disclaimer / Footer Notice"
                            compact
                            minHeightClass="min-h-[55px]"
                            value={bj.extrasDisclaimer ?? ""}
                            onChange={(html) => updateBj({ extrasDisclaimer: html })}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs font-semibold">Next Step Button Text</Label>
                          <Input
                            value={bj.step3NextButtonText ?? ""}
                            placeholder="Your details →"
                            onChange={(e) => updateBj({ step3NextButtonText: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Step 4: Details & Payment */}
                    <div className="border-b pb-4">
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                        Step 4: Guest Details &amp; Payment
                      </h5>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Step 4 Heading</Label>
                          <Input
                            value={bj.step4Title ?? ""}
                            placeholder="Guest Details & Payment"
                            onChange={(e) => updateBj({ step4Title: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Contact Section Title</Label>
                          <Input
                            value={bj.contactSectionTitle ?? ""}
                            placeholder="Contact information"
                            onChange={(e) => updateBj({ contactSectionTitle: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs font-semibold">Step 4 Description (Before Reserve)</Label>
                          <Input
                            value={bj.step4Description ?? ""}
                            placeholder="Please provide your contact details to secure your reservation at Home Farm."
                            onChange={(e) => updateBj({ step4Description: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs font-semibold">Step 4 Description (When Cottage Held)</Label>
                          <Input
                            value={bj.step4ReservedDescription ?? ""}
                            placeholder="Your cottage is reserved. Complete payment securely below to confirm your stay."
                            onChange={(e) => updateBj({ step4ReservedDescription: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Special Requests Label</Label>
                          <Input
                            value={bj.specialRequestsLabel ?? ""}
                            placeholder="Special requests"
                            onChange={(e) => updateBj({ specialRequestsLabel: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Special Requests Placeholder</Label>
                          <Input
                            value={bj.specialRequestsPlaceholder ?? ""}
                            placeholder="Any notes for your stay (optional)"
                            onChange={(e) => updateBj({ specialRequestsPlaceholder: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <RichTextEditor
                            label="Step 4 Acknowledgement Checkbox Text"
                            compact
                            minHeightClass="min-h-[55px]"
                            value={bj.acknowledgementText ?? ""}
                            onChange={(html) => updateBj({ acknowledgementText: html })}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs font-semibold">Pay Button Text</Label>
                          <Input
                            value={bj.payButtonText ?? ""}
                            placeholder="Pay with Card"
                            onChange={(e) => updateBj({ payButtonText: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Step 5: Confirmation */}
                    <div className="border-b pb-4">
                      <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                        Step 5: Confirmation &amp; Summary
                      </h5>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Confirmation Title</Label>
                          <Input
                            value={bj.step5Title ?? ""}
                            placeholder="Thank you for your stay request"
                            onChange={(e) => updateBj({ step5Title: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Confirmation Subtitle</Label>
                          <Input
                            value={bj.step5Subtitle ?? ""}
                            placeholder="We have received your enquiry and our team will get in touch shortly."
                            onChange={(e) => updateBj({ step5Subtitle: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <RichTextEditor
                            label="Confirmation Email / Next Steps Note"
                            compact
                            minHeightClass="min-h-[55px]"
                            value={bj.step5Note ?? ""}
                            onChange={(html) => updateBj({ step5Note: html })}
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <RichTextEditor
                            label="Sidebar Taxes &amp; Stripe Security Notice"
                            compact
                            minHeightClass="min-h-[55px]"
                            value={bj.sidebarTaxesNotice ?? ""}
                            onChange={(html) => updateBj({ sidebarTaxesNotice: html })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
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
