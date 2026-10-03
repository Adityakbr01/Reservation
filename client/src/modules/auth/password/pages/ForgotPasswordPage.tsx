import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ForgotPasswordForm } from "../components/ForgotPasswordForm";
import { useRedirectIfAuthenticated } from "@/app/use-redirect-if-authenticated";

export function ForgotPasswordPage() {
  useRedirectIfAuthenticated();
  return (
    <div className="mx-auto w-full max-w-sm py-8 sm:py-12">
      <Card className="shadow-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl sm:text-3xl">Forgot password</CardTitle>
          <CardDescription>Enter your account email and we will send a reset link</CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}

export default ForgotPasswordPage;
