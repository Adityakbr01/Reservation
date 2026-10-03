import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "../components/ResetPasswordForm";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  return (
    <div className="mx-auto w-full max-w-sm py-8 sm:py-12">
      <Card className="shadow-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl sm:text-3xl">Set a new password</CardTitle>
          <CardDescription>
            {token ? "Choose a strong password to secure your account" : "This reset link is incomplete"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                The link is missing its token. Request a fresh reset link to continue.
              </p>
              <Link
                to="/forgot-password"
                className="inline-block text-sm font-medium text-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                Request a new link
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ResetPasswordPage;
