import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api-client";
import { forgotPasswordDefaults } from "../form/password.forms";
import { useForgotPassword } from "../hooks/use-password";

export function ForgotPasswordForm() {
  const [form, setForm] = useState(forgotPasswordDefaults);
  const { mutate, isPending, isSuccess, error } = useForgotPassword();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutate(form);
  }

  if (isSuccess) {
    return (
      <div className="space-y-5">
        <span className="flex size-11 items-center justify-center rounded-full bg-accent text-brand">
          <CheckCircle2 className="size-5" aria-hidden />
        </span>
        <p className="text-sm leading-relaxed text-muted-foreground">
          If an account exists for{" "}
          <span className="font-medium text-foreground">{form.email}</span>, a reset link is on
          its way. Check your inbox — and your spam folder, just in case.
        </p>
        <Button
          asChild
          className="h-11 w-full rounded-md bg-primary text-[13px] tracking-wide hover:bg-brand-dark"
        >
          <Link to="/login">Back to sign in</Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          Never registered?{" "}
          <Link
            to="/register"
            className="font-medium text-brand underline underline-offset-4 hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Create an account
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label
          htmlFor="email"
          className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
        >
          Email
        </Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ email: e.target.value })}
          placeholder="you@example.com"
          className="h-11 rounded-md border-border bg-card text-[15px] shadow-none focus-visible:border-brand focus-visible:ring-brand/25"
        />
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
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader className="size-4 animate-spin" aria-hidden />
            Sending…
          </>
        ) : (
          "Send reset link"
        )}
      </Button>
    </form>
  );
}
