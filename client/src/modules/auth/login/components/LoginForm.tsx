import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/lib/api-client";
import { loginDefaults } from "../form/login.form";
import { useLogin } from "../hooks/use-login";

export function LoginForm() {
  const [form, setForm] = useState(loginDefaults);
  const [showPassword, setShowPassword] = useState(false);
  const { mutate, isPending, error } = useLogin();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutate(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <Label
            htmlFor="password"
            className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
          >
            Password
          </Label>
          <Link
            to="/forgot-password"
            className="text-[11px] font-medium text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="••••••••"
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
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}
