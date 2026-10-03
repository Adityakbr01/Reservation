import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TEXTAREA_CLASS =
  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
import type { PageSection } from "../types/cms.types";

const BLOCK_KINDS = ["HERO", "EDITORIAL_TEXT", "CTA", "FAQ"] as const;

interface SectionsEditorProps {
  value: PageSection[];
  onChange: (sections: PageSection[]) => void;
}

export function SectionsEditor({ value, onChange }: SectionsEditorProps) {
  const [kind, setKind] = useState<(typeof BLOCK_KINDS)[number]>("HERO");

  function add() {
    onChange([...value, { kind }]);
  }

  function patch(index: number, patch: Partial<PageSection>) {
    onChange(value.map((section, i) => (i === index ? { ...section, ...patch } : section)));
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {value.map((section, index) => (
        <div key={index} className="space-y-3 rounded-xl border border-border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{section.kind}</p>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => move(index, -1)}
                aria-label="Move up"
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => move(index, 1)}
                aria-label="Move down"
              >
                ↓
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => remove(index)}
              >
                Remove
              </Button>
            </div>
          </div>
          {(section.kind === "HERO" || section.kind === "CTA") && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Heading</Label>
                <Input
                  value={section.heading ?? ""}
                  onChange={(e) => patch(index, { heading: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Subheading</Label>
                <Input
                  value={section.subheading ?? ""}
                  onChange={(e) => patch(index, { subheading: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Button label</Label>
                <Input
                  value={section.ctaLabel ?? ""}
                  onChange={(e) => patch(index, { ctaLabel: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Button URL (/path or https://…)</Label>
                <Input
                  value={section.ctaUrl ?? ""}
                  onChange={(e) => patch(index, { ctaUrl: e.target.value })}
                />
              </div>
            </div>
          )}
          {section.kind === "EDITORIAL_TEXT" && (
            <div className="space-y-1">
              <Label>Body (simple HTML allowed)</Label>
              <textarea className={TEXTAREA_CLASS}
                rows={5}
                value={section.html ?? ""}
                onChange={(e) => patch(index, { html: e.target.value })}
              />
            </div>
          )}
          {section.kind === "FAQ" && (
            <div className="space-y-1">
              <Label>FAQ category (blank = all)</Label>
              <Input
                value={section.category ?? ""}
                onChange={(e) => patch(index, { category: e.target.value })}
              />
            </div>
          )}
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Select value={kind} onValueChange={(v) => setKind(v as (typeof BLOCK_KINDS)[number])}>
          <SelectTrigger className="w-52" aria-label="Block type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BLOCK_KINDS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" className="rounded-full" onClick={add}>
          Add block
        </Button>
      </div>
    </div>
  );
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function PageFields({
  title,
  slug,
  excerpt,
  onTitle,
  onSlug,
  onExcerpt,
}: {
  title: string;
  slug: string;
  excerpt: string;
  onTitle: (v: string) => void;
  onSlug: (v: string) => void;
  onExcerpt: (v: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="cms-title">Title</Label>
        <Input
          id="cms-title"
          required
          minLength={2}
          value={title}
          onChange={(e) => {
            onTitle(e.target.value);
            if (!slug) onSlug(slugifyTitle(e.target.value));
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cms-slug">Slug</Label>
        <Input
          id="cms-slug"
          required
          value={slug}
          onChange={(e) => onSlug(e.target.value.toLowerCase())}
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="cms-excerpt">Excerpt</Label>
        <textarea className={TEXTAREA_CLASS}
          id="cms-excerpt"
          rows={2}
          value={excerpt}
          onChange={(e) => onExcerpt(e.target.value)}
        />
      </div>
    </div>
  );
}

export function SubmitBar({ label, pending }: { label: string; pending: boolean }) {
  return (
    <Button type="submit" className="rounded-full" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export type { FormEvent };
