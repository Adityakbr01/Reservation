import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "../components/RegisterForm";
import { useRedirectIfAuthenticated } from "@/app/use-redirect-if-authenticated";

export function RegisterPage() {
  useRedirectIfAuthenticated();
  return (
    <div className="mx-auto w-full max-w-sm py-8 sm:py-12">
      <Card className="shadow-card">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl sm:text-3xl">Create an account</CardTitle>
          <CardDescription>Get started in seconds</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default RegisterPage;
