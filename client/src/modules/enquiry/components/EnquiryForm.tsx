import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage, publicApiClient } from "@/lib/api-client";
import { submitEnquiry } from "../api/enquiry.api";

interface EnquiryFormProps {
  roomTypeId?: string | null;
  roomName?: string;
  /** Called after a successful send (dialogs use it to close). */
  onSuccess?: () => void;
  submitLabel?: string;
  variant?: "page" | "dialog";
}

const initialForm = {
  title: "",
  firstName: "",
  lastName: "",
  email: "",
  telephone: "",
  holidayBudget: "",
  partySize: "",
  bedrooms: "",
  fromDate: "",
  toDate: "",
  specificLocation: "",
  dogFriendly: "",
  details: "",
};

const labelClass =
  "text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground";
const fieldClass =
  "h-10 rounded-md border-border bg-card text-[15px] shadow-none focus-visible:border-brand focus-visible:ring-brand/25 xl:h-11";

export function EnquiryForm({
  roomTypeId,
  roomName,
  onSuccess,
  submitLabel,
  variant = "dialog",
}: EnquiryFormProps) {
  const [form, setForm] = useState(initialForm);
  const [subscribed, setSubscribed] = useState(false);
  const isPage = variant === "page";

  function set<K extends keyof typeof initialForm>(key: K, value: (typeof initialForm)[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  const mutation = useMutation({
    mutationFn: () =>
      submitEnquiry({
        title: form.title || null,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        telephone: form.telephone.trim(),
        holidayBudget: form.holidayBudget || null,
        partySize: form.partySize ? Number(form.partySize) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        fromDate: form.fromDate || null,
        toDate: form.toDate || null,
        specificLocation: form.specificLocation || null,
        dogFriendly: form.dogFriendly === "" ? null : form.dogFriendly === "yes",
        details: form.details || null,
        roomTypeId: roomTypeId ?? null,
      }),
    onSuccess: () => {
      toast.success(
        roomName
          ? `Enquiry sent for ${roomName} — we will reply shortly`
          : "Enquiry sent — we will reply shortly",
      );
      setForm(initialForm);
      onSuccess?.();
    },
    onError: () => toast.error("Could not send enquiry — check required fields"),
  });

  const invalid =
    !form.firstName.trim() ||
    !form.lastName.trim() ||
    !/.+@.+\..+/.test(form.email) ||
    form.telephone.trim().length < 4;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!invalid) mutation.mutate();
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <div
          className={
            isPage
              ? "grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4"
              : "grid gap-3 sm:grid-cols-3"
          }
        >
          <div className="space-y-2">
            <Label htmlFor="eq-title" className={labelClass}>
              Title
            </Label>
            <Input
              id="eq-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Mr / Mrs / Ms"
              autoComplete="honorific-prefix"
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eq-first" className={labelClass}>
              First name *
            </Label>
            <Input
              id="eq-first"
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              autoComplete="given-name"
              required
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eq-last" className={labelClass}>
              Last name *
            </Label>
            <Input
              id="eq-last"
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              autoComplete="family-name"
              required
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eq-email" className={labelClass}>
              Email *
            </Label>
            <Input
              id="eq-email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              autoComplete="email"
              required
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eq-tel" className={labelClass}>
              Telephone *
            </Label>
            <Input
              id="eq-tel"
              type="tel"
              value={form.telephone}
              onChange={(e) => set("telephone", e.target.value)}
              autoComplete="tel"
              required
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eq-budget" className={labelClass}>
              Holiday budget
            </Label>
            <Input
              id="eq-budget"
              value={form.holidayBudget}
              onChange={(e) => set("holidayBudget", e.target.value)}
              placeholder="£1500"
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eq-party" className={labelClass}>
              Number of people
            </Label>
            <Input
              id="eq-party"
              type="number"
              min={1}
              value={form.partySize}
              onChange={(e) => set("partySize", e.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eq-bed" className={labelClass}>
              Number of bedrooms
            </Label>
            <Input
              id="eq-bed"
              type="number"
              min={0}
              value={form.bedrooms}
              onChange={(e) => set("bedrooms", e.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eq-from" className={labelClass}>
              From date
            </Label>
            <Input
              id="eq-from"
              type="date"
              value={form.fromDate}
              onChange={(e) => set("fromDate", e.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eq-to" className={labelClass}>
              To date
            </Label>
            <Input
              id="eq-to"
              type="date"
              value={form.toDate}
              onChange={(e) => set("toDate", e.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eq-loc" className={labelClass}>
              Specific location
            </Label>
            <Input
              id="eq-loc"
              value={form.specificLocation}
              onChange={(e) => set("specificLocation", e.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eq-dog" className={labelClass}>
              Dog friendly?
            </Label>
            <select
              id="eq-dog"
              value={form.dogFriendly}
              onChange={(e) => set("dogFriendly", e.target.value)}
              className="flex h-10 w-full rounded-md border border-border bg-card px-3 text-[15px] text-foreground shadow-none outline-none transition-colors focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand/25 xl:h-11"
            >
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="eq-details" className={labelClass}>
            Additional details
          </Label>
          <textarea
            id="eq-details"
            value={form.details}
            onChange={(e) => set("details", e.target.value)}
            rows={2}
            className="flex min-h-16 w-full rounded-md border border-border bg-card px-3 py-2 text-[15px] text-foreground shadow-none outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand/25"
            placeholder="Anything else we should know? Celebrations, accessibility needs, preferred cottages…"
          />
        </div>

        {mutation.error ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs leading-relaxed text-destructive"
          >
            {getApiErrorMessage(mutation.error)}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={mutation.isPending || invalid}
          className={
            isPage
              ? "h-11 w-full rounded-md bg-primary text-[13px] tracking-wide hover:bg-brand-dark"
              : "h-11 rounded-md bg-primary text-[13px] tracking-wide hover:bg-brand-dark"
          }
        >
          {mutation.isPending ? (
            <>
              <Loader className="size-4 animate-spin" aria-hidden />
              Sending…
            </>
          ) : (
            (submitLabel ?? "Send enquiry")
          )}
        </Button>
      </form>

      {!isPage ? (
        <p className="text-xs text-muted-foreground">
          Prefer to subscribe?{" "}
          {subscribed ? (
            <span>Subscribed — thank you.</span>
          ) : (
            <button
              type="button"
              className="underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onClick={() => {
                if (!/.+@.+\..+/.test(form.email)) {
                  toast.error("Enter your email above first");
                  return;
                }
                void publicApiClient
                  .post("/public/newsletter/subscribe", { email: form.email, source: "enquiry" })
                  .then(() => {
                    setSubscribed(true);
                    toast.success("Subscribed to newsletter");
                  })
                  .catch(() => toast.error("Could not subscribe"));
              }}
            >
              Subscribe to newsletter
            </button>
          )}
        </p>
      ) : null}
    </div>
  );
}

export default EnquiryForm;
