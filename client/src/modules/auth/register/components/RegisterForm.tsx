import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api-client";
import { registerDefaults } from "../form/register.form";
import { useRegister } from "../hooks/use-register";

export function RegisterForm() {
  const [form, setForm] = useState(registerDefaults);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const { mutate, isPending, error } = useRegister();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!acceptedTerms) {
      setTermsError(true);
      return;
    }
    mutate(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label
            htmlFor="name"
            className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
          >
            Name
          </Label>
          <Input
            id="name"
            required
            autoComplete="name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Jane Doe"
            className="h-11 rounded-md border-border bg-card text-[15px] shadow-none focus-visible:border-brand focus-visible:ring-brand/25"
          />
        </div>

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
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="you@example.com"
            className="h-11 rounded-md border-border bg-card text-[15px] shadow-none focus-visible:border-brand focus-visible:ring-brand/25"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="password"
          className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
        >
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="At least 8 characters"
            className="h-11 rounded-md border-border bg-card pr-11 text-[15px] shadow-none focus-visible:border-brand focus-visible:ring-brand/25"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </button>
        </div>
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
            Creating account…
          </>
        ) : (
          "Create account"
        )}
      </Button>
    </form>
  );
}
