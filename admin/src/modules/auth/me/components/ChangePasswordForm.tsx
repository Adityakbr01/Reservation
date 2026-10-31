import { useState } from "react";
import type { FormEvent } from "react";
import { Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSetPassword } from "../hooks/use-me";

export function ChangePasswordForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const { mutate, isPending, isSuccess } = useSetPassword();

  const tooShort = newPassword.length > 0 && newPassword.length < 8;
  const mismatch = confirm.length > 0 && confirm !== newPassword;
  const invalid = newPassword.length < 8 || newPassword !== confirm;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (invalid) return;
    mutate(
      { newPassword },
      {
        onSuccess: () => {
          setNewPassword("");
          setConfirm("");
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Minimum 8 characters"
          aria-invalid={tooShort}
        />
        {tooShort && <p className="text-xs text-error">Password must be at least 8 characters.</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <Input
          id="confirm-password"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={mismatch}
        />
        {mismatch && <p className="text-xs text-error">Passwords do not match.</p>}
      </div>
      <Button type="submit" className="h-11 rounded-full px-8" disabled={isPending || invalid}>
        {isPending ? (
          <>
            <Loader className="size-4 animate-spin" aria-hidden />
            <span className="sr-only">Updating…</span>
          </>
        ) : (
          "Update password"
        )}
      </Button>
      {isSuccess && (
        <p className="text-xs text-success">Password updated. Use it next time you sign in.</p>
      )}
    </form>
  );
}
