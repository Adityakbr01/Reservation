import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitEnquiry } from "../api/enquiry.api";

export function EnquirePage() {
  const [form, setForm] = useState({
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
  });
  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
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
      }),
    onSuccess: () => {
      toast.success("Enquiry sent — we will reply shortly");
      setForm({ title: "", firstName: "", lastName: "", email: "", telephone: "", holidayBudget: "", partySize: "", bedrooms: "", fromDate: "", toDate: "", specificLocation: "", dogFriendly: "", details: "" });
    },
    onError: () => toast.error("Could not send enquiry"),
  });
  const invalid = !form.firstName.trim() || !form.lastName.trim() || !/.+@.+\..+/.test(form.email) || form.telephone.trim().length < 4;
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 pb-8">
      <Link to="/" className="text-sm font-medium text-brand hover:text-brand-dark">← Back to search</Link>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-3xl font-light">Enquire</CardTitle>
          <CardDescription>Tell us about your ideal holiday — budget, party, bedrooms, dates, location, dog friendly…</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1"><Label htmlFor="eq-title">Title</Label><Input id="eq-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Mr / Mrs / Ms" /></div>
          <div className="space-y-1"><Label htmlFor="eq-budget">Holiday budget</Label><Input id="eq-budget" value={form.holidayBudget} onChange={(e) => set("holidayBudget", e.target.value)} placeholder="£1500" /></div>
          <div className="space-y-1"><Label htmlFor="eq-first">First name *</Label><Input id="eq-first" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="eq-last">Last name *</Label><Input id="eq-last" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="eq-email">Email *</Label><Input id="eq-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="eq-tel">Telephone *</Label><Input id="eq-tel" value={form.telephone} onChange={(e) => set("telephone", e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="eq-party">Number of people</Label><Input id="eq-party" type="number" min={1} value={form.partySize} onChange={(e) => set("partySize", e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="eq-bed">Number of bedrooms</Label><Input id="eq-bed" type="number" min={0} value={form.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="eq-from">From date</Label><Input id="eq-from" type="date" value={form.fromDate} onChange={(e) => set("fromDate", e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="eq-to">To date</Label><Input id="eq-to" type="date" value={form.toDate} onChange={(e) => set("toDate", e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="eq-loc">Specific location</Label><Input id="eq-loc" value={form.specificLocation} onChange={(e) => set("specificLocation", e.target.value)} /></div>
          <div className="space-y-1"><Label htmlFor="eq-dog">Dog friendly?</Label><select id="eq-dog" value={form.dogFriendly} onChange={(e) => set("dogFriendly", e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Select</option><option value="yes">Yes</option><option value="no">No</option></select></div>
          <div className="space-y-1 sm:col-span-2"><Label htmlFor="eq-details">Additional details</Label><textarea id="eq-details" value={form.details} onChange={(e) => set("details", e.target.value)} rows={4} className="flex min-h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Anything else?" /></div>
          <div className="sm:col-span-2"><Button className="h-11 w-full rounded-full" disabled={mutation.isPending || invalid} onClick={() => mutation.mutate()}>{mutation.isPending ? "Sending…" : "Send enquiry"}</Button></div>
        </CardContent>
      </Card>
    </div>
  );
}

export default EnquirePage;
