import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Headphones,
  Heart,
  Map as MapIcon,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function whyIconFor(title: string): LucideIcon {
  const t = title.toLowerCase();
  if (t.includes("local") || t.includes("knowledge")) return MapIcon;
  if (t.includes("propert")) return Building2;
  if (t.includes("quality") || t.includes("check")) return ShieldCheck;
  if (t.includes("satisf") || t.includes("guest")) return Heart;
  if (t.includes("24/7") || t.includes("support")) return Headphones;
  return Sparkles;
}

export interface WhyBookItem {
  title: string;
  text?: string | null;
}

export interface WhyBookWithUsCardProps {
  items: WhyBookItem[];
}

export function WhyBookWithUsCard({ items }: WhyBookWithUsCardProps) {
  if (items.length === 0) return null;
  return (
    <Card className="relative overflow-hidden shadow-card">
      {/* Subtle ambient leaf accent at the bottom corner */}
      <div
        className="pointer-events-none absolute -bottom-4 -right-2 w-16 select-none opacity-85"
        aria-hidden
      >
        <img
          src="/sunflower.gif"
          alt=""
          className="w-full"
          loading="lazy"
        />
      </div>
      <CardContent className="relative z-10 space-y-4 p-5">
        <h2 className="font-display text-xl font-medium tracking-tight">
          Why book with us?
        </h2>
        <ul className="space-y-4">
          {items.map((w, i) => {
            const Icon = whyIconFor(w.title);
            return (
              <li key={i} className="flex gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand-dark">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">
                    {w.title}
                  </span>
                  {w.text ? (
                    <span
                      className="rich-body mt-0.5 block text-xs leading-relaxed text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: w.text }}
                    />
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

export default WhyBookWithUsCard;
