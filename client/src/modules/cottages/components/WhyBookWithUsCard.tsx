import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Gift,
  Headphones,
  Heart,
  Home,
  KeyRound,
  Leaf,
  Map as MapIcon,
  ShieldCheck,
  Sparkles,
  Star,
  Wifi,
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

const ICON_MAP: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  heart: Heart,
  shield: ShieldCheck,
  map: MapIcon,
  headphones: Headphones,
  home: Home,
  building: Building2,
  leaf: Leaf,
  star: Star,
  gift: Gift,
  key: KeyRound,
  wifi: Wifi,
};

export function resolveWhyIcon(icon?: string | null, title?: string): LucideIcon {
  if (icon) {
    const key = icon.toLowerCase().trim();
    if (ICON_MAP[key]) return ICON_MAP[key];
  }
  return whyIconFor(title || "");
}

export interface WhyBookItem {
  title: string;
  text?: string | null;
  icon?: string | null;
  imageMediaId?: string | null;
  imageUrl?: string | null;
  badgeColor?: string | null;
}

export interface WhyBookWithUsCardProps {
  heading?: string | null;
  items: WhyBookItem[];
}

export function WhyBookWithUsCard({ heading, items }: WhyBookWithUsCardProps) {
  if (!items || items.length === 0) return null;
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
          {heading?.trim() || "Why book with us?"}
        </h2>
        <ul className="space-y-4">
          {items.map((w, i) => {
            const Icon = resolveWhyIcon(w.icon, w.title);
            const customBg = w.badgeColor ? { backgroundColor: w.badgeColor } : undefined;
            return (
              <li key={i} className="flex gap-3">
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                    w.badgeColor ? "" : "bg-brand/10"
                  } text-brand-dark overflow-hidden`}
                  style={customBg}
                >
                  {w.imageUrl ? (
                    <img
                      src={w.imageUrl}
                      alt=""
                      className="size-5 object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <Icon className="size-5" aria-hidden />
                  )}
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
