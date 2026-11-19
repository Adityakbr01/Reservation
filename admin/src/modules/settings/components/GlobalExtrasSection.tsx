import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ImageField } from "@/components/common/ImageField";
import { RichTextEditor } from "@/modules/cms/components/RichTextEditor";
import type { CottageExtra } from "@/modules/cottages/types/cottage.types";

interface GlobalExtrasSectionProps {
  extras: CottageExtra[];
  onChange: (extras: CottageExtra[]) => void;
  currencySymbol?: string;
}

export function GlobalExtrasSection({
  extras,
  onChange,
  currencySymbol = "£",
}: GlobalExtrasSectionProps) {
  function handleAddExtra() {
    const newExtra: CottageExtra = {
      id: `extra_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: "",
      description: "",
      price: 25,
      pricingType: "PER_STAY",
      imageMediaId: null,
      imageUrl: null,
      showCounter: true,
      min: 1,
      max: null,
      showInfo: false,
      infoTitle: "",
      infoText: "",
    };
    onChange([...extras, newExtra]);
  }

  function handleLoadDefaultExtras() {
    onChange([
      {
        id: "extra_golf",
        title: "A round of golf",
        description: "Hamptworth Championship Course · per adult",
        price: 50,
        originalPrice: 70,
        pricingType: "PER_PERSON",
        imageMediaId: null,
        imageUrl: null,
        showCounter: true,
        min: 1,
        max: null,
        showInfo: true,
        infoTitle: "A round of golf",
        infoText: "Hamptworth Championship Course 18 holes across scenic parkland.",
      },
      {
        id: "extra_padel",
        title: "Padel court session",
        description: "Court hire · equipment included",
        price: 25,
        originalPrice: 30,
        pricingType: "PER_STAY",
        imageMediaId: null,
        imageUrl: null,
        showCounter: true,
        min: 1,
        max: null,
        showInfo: true,
        infoTitle: "Padel court session",
        infoText: "Court hire with rackets and balls included for up to 4 players.",
      },
      {
        id: "extra_lunch",
        title: "Lunch at the clubhouse",
        description: "Seasonal dishes at The Barn",
        price: 20,
        originalPrice: null,
        pricingType: "PER_PERSON",
        imageMediaId: null,
        imageUrl: null,
        showCounter: true,
        min: 1,
        max: null,
        showInfo: false,
        infoTitle: "",
        infoText: "",
      },
      {
        id: "extra_breakfast",
        title: "Breakfast at the clubhouse",
        description: "Freshly cooked breakfast",
        price: 15,
        originalPrice: null,
        pricingType: "PER_PERSON",
        imageMediaId: null,
        imageUrl: null,
        showCounter: true,
        min: 1,
        max: null,
        showInfo: false,
        infoTitle: "",
        infoText: "",
      },
      {
        id: "extra_massage",
        title: "Massage",
        description: "Relaxing wellness treatment",
        price: 90,
        originalPrice: null,
        pricingType: "PER_PERSON",
        imageMediaId: null,
        imageUrl: null,
        showCounter: true,
        min: 1,
        max: null,
        showInfo: true,
        infoTitle: "Massage treatment",
        infoText: "Relaxing 60-minute wellness massage tailored to your needs.",
      },
      {
        id: "extra_fire_pit",
        title: "Fire pit & smores",
        description: "Logs, firestarter and s'mores kit",
        price: 20,
        originalPrice: null,
        pricingType: "PER_STAY",
        imageMediaId: null,
        imageUrl: null,
        showCounter: true,
        min: 1,
        max: null,
        showInfo: true,
        infoTitle: "Fire pit & s'mores kit",
        infoText: "Hardwood logs, firestarters, skewers, marshmallows and artisan biscuits.",
      },
    ]);
  }

  function updateExtra(index: number, patch: Partial<CottageExtra>) {
    const next = [...extras];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function removeExtra(index: number) {
    onChange(extras.filter((_, i) => i !== index));
  }

  function moveExtra(index: number, dir: "up" | "down") {
    const target = dir === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= extras.length) return;
    const copy = [...extras];
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;
    onChange(copy);
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
        <div>
          <CardTitle className="text-xl">Global Extras &amp; Add-ons</CardTitle>
          <CardDescription className="text-sm mt-1">
            Manage property-wide extras (golf, padel, dining, spa). These appear once in the booking dialog without repeating per cottage.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {extras.length === 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLoadDefaultExtras}
              className="rounded-full"
            >
              Load Starter Extras
            </Button>
          )}
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleAddExtra}
            className="gap-1.5 rounded-full"
          >
            <Plus className="size-4" /> Add Extra
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {extras.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No global extras added yet. Click <strong>Add Extra</strong> or <strong>Load Starter Extras</strong> to add options for guests during checkout.
          </div>
        ) : (
          <div className="space-y-4">
            {extras.map((extra, index) => {
              const plainTitle = (extra.title || "").replace(/<[^>]*>/g, "").trim();
              const counterOn = extra.showCounter === true;
              const minVal = extra.min != null ? String(extra.min) : "1";
              const maxVal = extra.max != null ? String(extra.max) : "";

              return (
                <div
                  key={extra.id}
                  className="rounded-xl border border-border bg-card p-5 transition-all shadow-xs space-y-4"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Extra #{index + 1}: {plainTitle || "(Untitled)"}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => moveExtra(index, "up")}
                        disabled={index === 0}
                        aria-label="Move up"
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => moveExtra(index, "down")}
                        disabled={index === extras.length - 1}
                        aria-label="Move down"
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeExtra(index)}
                        aria-label="Remove extra"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Extra Title *</Label>
                      <RichTextEditor
                        value={extra.title || ""}
                        onChange={(html) => updateExtra(index, { title: html })}
                        minHeightClass="min-h-[60px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Description</Label>
                      <RichTextEditor
                        value={extra.description || ""}
                        onChange={(html) => updateExtra(index, { description: html })}
                        minHeightClass="min-h-[60px]"
                      />
                    </div>
                  </div>

                  {/* Price, Pricing Type & Limits */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Price ({currencySymbol}) *</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={extra.price ?? 0}
                        onChange={(e) =>
                          updateExtra(index, { price: Math.max(0, Number(e.target.value) || 0) })
                        }
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Usual Price ({currencySymbol}) (Optional)</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="e.g. 70"
                        value={extra.originalPrice ?? ""}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          updateExtra(index, {
                            originalPrice: val ? Math.max(0, Number(val)) : null,
                          });
                        }}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Pricing Type</Label>
                      <select
                        value={extra.pricingType ?? "PER_STAY"}
                        onChange={(e) =>
                          updateExtra(index, {
                            pricingType: e.target.value as "PER_PERSON" | "PER_STAY",
                          })
                        }
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="PER_STAY">Per stay (flat fee)</option>
                        <option value="PER_PERSON">Per person / adult</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Quantity Counter</Label>
                      <div className="flex h-9 items-center gap-2">
                        <Switch
                          checked={counterOn}
                          onCheckedChange={(checked) =>
                            updateExtra(index, { showCounter: checked })
                          }
                        />
                        <span className="text-xs text-muted-foreground">
                          {counterOn ? "Enable count (-/+)" : "Single checkbox"}
                        </span>
                      </div>
                    </div>
                    {counterOn && (
                      <div className="flex items-center gap-2">
                        <div className="space-y-1 flex-1">
                          <Label className="text-xs">Min</Label>
                          <Input
                            type="number"
                            min={0}
                            value={minVal}
                            onChange={(e) =>
                              updateExtra(index, { min: Math.max(0, Number(e.target.value) || 0) })
                            }
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-1 flex-1">
                          <Label className="text-xs">Max</Label>
                          <Input
                            type="number"
                            min={1}
                            placeholder="∞"
                            value={maxVal}
                            onChange={(e) => {
                              const val = e.target.value.trim();
                              updateExtra(index, {
                                max: val === "" ? null : Math.max(1, Number(val) || 1),
                              });
                            }}
                            className="h-9 text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Image */}
                  <div className="pt-1">
                    <Label className="text-xs font-medium mb-1.5 block">Extra Image / Photo (Optional)</Label>
                    <ImageField
                      label="Extra photo"
                      mediaId={extra.imageMediaId ?? null}
                      onChange={(id, media) =>
                        updateExtra(index, {
                          imageMediaId: id,
                          imageUrl: media?.url ?? null,
                        })
                      }
                    />
                  </div>

                  {/* Info (ⓘ) Popover Management */}
                  <div className="rounded-lg border border-border/80 bg-muted/20 p-3.5 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex size-4 items-center justify-center rounded-full bg-emerald-700/10 text-emerald-800 text-[10px] font-bold">
                            ⓘ
                          </span>
                          <Label
                            htmlFor={`switch-info-${extra.id}`}
                            className="text-xs font-semibold cursor-pointer"
                          >
                            Show Info (ⓘ) Icon &amp; Popover
                          </Label>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Displays an ⓘ info button beside this extra on the booking dialog &amp; page. When hovered or clicked, guests see a popup balloon with more details.
                        </p>
                      </div>
                      <Switch
                        id={`switch-info-${extra.id}`}
                        checked={extra.showInfo === true}
                        onCheckedChange={(checked) =>
                          updateExtra(index, { showInfo: checked })
                        }
                      />
                    </div>

                    {extra.showInfo === true && (
                      <div className="space-y-3.5 pt-2.5 border-t border-border/60">
                        <div className="space-y-1.5 max-w-md">
                          <Label className="text-xs font-medium">
                            Popover Title (Optional)
                          </Label>
                          <Input
                            placeholder={plainTitle || "e.g. Welcome hamper"}
                            value={extra.infoTitle ?? ""}
                            onChange={(e) =>
                              updateExtra(index, { infoTitle: e.target.value })
                            }
                            className="h-9 text-xs"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Defaults to the extra title if left blank.
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">
                            Popover Information / Details *
                          </Label>
                          <RichTextEditor
                            value={extra.infoText ?? ""}
                            onChange={(html) =>
                              updateExtra(index, { infoText: html })
                            }
                            minHeightClass="min-h-[100px]"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Rich text content (bold, italic, links, lists, etc.) displayed inside the balloon. If left blank, the main description above will be used.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
