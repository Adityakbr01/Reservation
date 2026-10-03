import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "../components/LoginForm";

export function LoginPage() {
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
            No account yet?{" "}
            <Link
              to="/register"
              className="font-medium text-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default LoginPage;
