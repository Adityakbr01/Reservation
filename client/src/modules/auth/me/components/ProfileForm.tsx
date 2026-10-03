import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthUser } from "@/types/auth";
import { useUpdateMe } from "../hooks/use-me";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function ProfileForm({ user }: { user: AuthUser }) {
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const { mutate, isPending } = useUpdateMe();

  const nameError = name.trim().length > 0 && name.trim().length < 2 ? "Name needs at least 2 characters." : null;
  const invalid = name.trim().length < 2 || fileError !== null;

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setAvatar(null);
      setFileError(null);
      return;
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      setAvatar(null);
      setFileError("Only JPEG, PNG, or WebP images are allowed.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatar(null);
      setFileError("Avatar must be smaller than 5 MB.");
      return;
    }
    setFileError(null);
    setAvatar(file);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (invalid) return;
    mutate({ name: name.trim(), avatar: avatar ?? undefined });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="profile-name">Display name</Label>
        <Input
          id="profile-name"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={nameError !== null}
        />
        {nameError && <p className="text-xs text-error">{nameError}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="profile-avatar">Avatar</Label>
        <Input
          id="profile-avatar"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          aria-invalid={fileError !== null}
        />
        {avatar ? (
          <p className="text-xs text-muted-foreground">
            Selected: {avatar.name} ({Math.round(avatar.size / 1024)} KB)
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP up to 5 MB.</p>
        )}
        {fileError && <p className="text-xs text-error">{fileError}</p>}
      </div>
      <Button type="submit" className="h-11 rounded-full px-8" disabled={isPending || invalid}>
        {isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
