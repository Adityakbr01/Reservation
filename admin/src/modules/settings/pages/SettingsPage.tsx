import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageField } from "@/components/common/ImageField";
import { CkEditorField } from "@/components/common/CkEditorField";
import {
  apiClient,
  getApiErrorMessage,
  unwrapResponse,
} from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import { settingsKeys } from "@/lib/query-keys";

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
  whyBookWithUs?: Array<{ title: string; text?: string | null }>;
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
      void queryClient.invalidateQueries({ queryKey: settingsKeys.all });
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
              <Label htmlFor="set-tz">Timezone</Label>
              <Input
                id="set-tz"
                value={form.timezone}
                onChange={(e) => set("timezone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="set-cur">Currency</Label>
              <Input
                id="set-cur"
                maxLength={3}
                value={form.currency}
                onChange={(e) => set("currency", e.target.value.toUpperCase())}
              />
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
            <CardTitle className="text-xl">Why book with us?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {(form.whyBookWithUs ?? []).map((item, i) => (
              <div key={i} className="space-y-3 rounded-lg border border-border p-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor={`why-title-${i}`}>Title</Label>
                    <Input
                      id={`why-title-${i}`}
                      value={item.title}
                      onChange={(e) =>
                        set("whyBookWithUs", (form.whyBookWithUs ?? []).map((w, j) => (j === i ? { ...w, title: e.target.value } : w)))
                      }
                      placeholder="Local knowledge"
                      aria-label={`Why book title ${i + 1}`}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-6 text-destructive"
                    onClick={() =>
                      set("whyBookWithUs", (form.whyBookWithUs ?? []).filter((_, j) => j !== i))
                    }
                    aria-label={`Remove reason ${i + 1}`}
                  >
                    Remove
                  </Button>
                </div>
                <CkEditorField
                  label={`Body ${i + 1}`}
                  value={item.text ?? ""}
                  onChange={(html) =>
                    set("whyBookWithUs", (form.whyBookWithUs ?? []).map((w, j) => (j === i ? { ...w, text: html || null } : w)))
                  }
                  placeholder="What makes booking direct better…"
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => set("whyBookWithUs", [...(form.whyBookWithUs ?? []), { title: "", text: null }])}
            >
              Add reason
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
