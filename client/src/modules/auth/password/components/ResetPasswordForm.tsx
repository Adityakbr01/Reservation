import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api-client";
import { useResetPassword } from "../hooks/use-password";

const labelClass =
  "text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground";
const fieldClass =
  "h-11 rounded-md border-border bg-card text-[15px] shadow-none focus-visible:border-brand focus-visible:ring-brand/25";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const { mutate, isPending, isSuccess, error } = useResetPassword();

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
      <div className="space-y-5">
        <span className="flex size-11 items-center justify-center rounded-full bg-accent text-brand">
          <CheckCircle2 className="size-5" aria-hidden />
        </span>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Your password has been reset. Sign in with the new one and pick up where you left off.
        </p>
        <Button
          asChild
          className="h-11 w-full rounded-md bg-primary text-[13px] tracking-wide hover:bg-brand-dark"
        >
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password" className={labelClass}>
          New password
        </Label>
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimum 8 characters"
          aria-invalid={tooShort || undefined}
          className={fieldClass}
        />
        {tooShort ? (
          <p className="text-xs text-destructive">Password must be at least 8 characters.</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm" className={labelClass}>
          Confirm password
        </Label>
        <Input
          id="confirm"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat the new password"
          aria-invalid={mismatch || undefined}
          className={fieldClass}
        />
        {mismatch ? <p className="text-xs text-destructive">Passwords do not match.</p> : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs leading-relaxed text-destructive"
        >
          {getApiErrorMessage(error)}
        </p>
      ) : null}

      <Button
        type="submit"
        className="h-11 w-full rounded-md bg-primary text-[13px] tracking-wide hover:bg-brand-dark"
        disabled={isPending || invalid}
      >
        {isPending ? (
          <>
            <Loader className="size-4 animate-spin" aria-hidden />
            Resetting…
          </>
        ) : (
          "Reset password"
        )}
      </Button>
    </form>
  );
}
