import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "../components/LoginForm";
import { useRedirectIfAuthenticated } from "@/app/use-redirect-if-authenticated";

export function LoginPage() {
  useRedirectIfAuthenticated();
  return (
    <div className="mx-auto w-full max-w-sm py-8 sm:py-12">
      <Card className="shadow-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl sm:text-3xl">Admin login</CardTitle>
          <CardDescription>Sign in to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Staff accounts are provisioned by your administrator.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;
