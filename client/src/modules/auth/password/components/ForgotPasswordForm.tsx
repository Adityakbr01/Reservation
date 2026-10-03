import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordDefaults } from "../form/password.forms";
import { useForgotPassword } from "../hooks/use-password";

export function ForgotPasswordForm() {
  const [form, setForm] = useState(forgotPasswordDefaults);
  const { mutate, isPending, isSuccess } = useForgotPassword();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutate(form);
  }

  if (isSuccess) {
    return (
      <div className="space-y-4 py-2 text-center">
        <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
        <p className="text-sm text-muted-foreground">
          If an account exists for <span className="font-medium text-foreground">{form.email}</span>,
          a reset link is on its way. Check your inbox.
        </p>
        <Button asChild variant="outline" className="w-full rounded-full">
          <Link to="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ email: e.target.value })}
          placeholder="you@example.com"
        />
      </div>
      <Button type="submit" className="h-11 w-full rounded-full" disabled={isPending}>
        {isPending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
