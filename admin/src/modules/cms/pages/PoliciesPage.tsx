import { useState } from "react";
import type { FormEvent } from "react";
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
import { StatusButtons } from "../components/StatusButtons";
import { RichTextEditor } from "../components/RichTextEditor";
import { usePolicies, useSavePolicy, useSetPolicyStatus } from "../hooks/use-cms";

const POLICY_KEYS = [
  "CANCELLATION",
  "CHECKIN",
  "CHECKOUT",
  "CHILDREN",
  "PETS",
  "SMOKING",
  "PAYMENT",
  "PRIVACY",
  "TERMS",
] as const;

export function PoliciesPage() {
  const { data, isPending, isError, refetch } = usePolicies();
  const [key, setKey] = useState<(typeof POLICY_KEYS)[number]>("CANCELLATION");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const { mutate, isPending: isSaving } = useSavePolicy();
  const statusMutation = useSetPolicyStatus();
  const items = data ?? [];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) return;
    mutate({ key, title: title.trim(), body });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-light tracking-tight sm:text-4xl">Policies</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Explanatory text only — refunds and rules are enforced by the backend
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Edit document</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="grid gap-4"
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Document</Label>
                <Select
                  value={key}
                  onValueChange={(v) => {
                    const next = v as (typeof POLICY_KEYS)[number];
                    setKey(next);
                    const existing = items.find((doc) => doc.key === next);
                    if (existing) {
                      setTitle(existing.title);
                      setBody(existing.body);
                    } else {
                      setTitle("");
                      setBody("");
                    }
                  }}
                >
                  <SelectTrigger aria-label="Policy document">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POLICY_KEYS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pol-title">Title</Label>
                <Input
                  id="pol-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Cancellation policy"
                />
              </div>
            </div>
            <div className="space-y-2">
              <RichTextEditor label="Body" value={body} onChange={setBody} />
            </div>
            <div>
              <Button type="submit" className="rounded-full" disabled={isSaving}>
                {isSaving ? "Saving…" : "Save draft"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isPending ? (
        <div className="h-14 animate-pulse rounded-xl bg-muted" aria-label="Loading policies" />
      ) : isError ? (
        <div className="rounded-xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Could not load policies.</p>
          <Button variant="outline" className="mt-4 rounded-full" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {items.map((doc) => (
                <li key={doc.key} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium">
                      {doc.key} · {doc.title}
                    </p>
                    <p className="text-xs text-muted-foreground">v{doc.version}</p>
                  </div>
                  <StatusButtons
                    status={doc.status}
                    pending={statusMutation.isPending}
                    onChange={(to) => statusMutation.mutate({ key: doc.key, to })}
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default PoliciesPage;
