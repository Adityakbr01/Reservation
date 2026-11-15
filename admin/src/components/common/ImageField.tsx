import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MediaPicker } from "./MediaPicker";
import { apiClient } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";

interface ImageFieldProps {
  label: string;
  mediaId: string | null;
  onChange: (
    mediaId: string | null,
    media?: { id: string; url: string; fileName: string } | null,
  ) => void;
}

/** Single-image picker with auto-resolved preview (covers, heroes, logos). */
export function ImageField({ label, mediaId, onChange }: ImageFieldProps) {
  const [open, setOpen] = useState(false);
  const { data: url } = useQuery({
    queryKey: ["media", "resolve", mediaId ?? "none"],
    queryFn: async () => {
      if (!mediaId) return null;
      const response = await apiClient.get<ApiEnvelope<Array<{ id: string; url: string }>>>(
        "/admin/media/resolve",
        { params: { ids: mediaId } },
      );
      return response.data.data[0]?.url ?? null;
    },
    enabled: mediaId !== null,
    staleTime: 300_000,
    retry: false,
  });

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {mediaId && url ? (
        <div className="flex items-center gap-3">
          <img src={url} alt="" className="h-16 w-24 rounded-md object-cover" loading="lazy" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => onChange(null, null)}
          >
            Remove
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setOpen(true)}>
          {mediaId ? "Replace image" : "Choose image"}
        </Button>
      )}
      <MediaPicker open={open} onClose={() => setOpen(false)} onSelect={(m) => onChange(m.id, m)} />
    </div>
  );
}

export default ImageField;
