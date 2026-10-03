import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResetPassword } from "../hooks/use-password";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const { mutate, isPending, isSuccess } = useResetPassword();

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && confirm !== password;
  const invalid = password.length < 8 || password !== confirm;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (invalid) return;
    mutate({ token, password });
  }

  if (isSuccess) {
    return (
      <div className="space-y-4 py-2 text-center">
        <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Your password has been reset. Sign in with the new one.
        </p>
        <Button asChild className="h-11 w-full rounded-full">
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimum 8 characters"
          aria-invalid={tooShort}
        />
        {tooShort && <p className="text-xs text-error">Password must be at least 8 characters.</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat the new password"
          aria-invalid={mismatch}
        />
        {mismatch && <p className="text-xs text-error">Passwords do not match.</p>}
      </div>
      <Button type="submit" className="h-11 w-full rounded-full" disabled={isPending || invalid}>
        {isPending ? (
          <>
            <Loader className="size-4 animate-spin" aria-hidden />
            <span className="sr-only">Resetting…</span>
          </>
        ) : (
          "Reset password"
        )}
      </Button>
    </form>
  );
}
