import { Link } from "react-router-dom";
import { AuthSection } from "@/components/ui/auth-section-1";
import { LoginForm } from "../components/LoginForm";
import { useRedirectIfAuthenticated } from "@/app/use-redirect-if-authenticated";

export function LoginPage() {
  useRedirectIfAuthenticated();
  return (
    <AuthSection
      mode="login"
      eyebrow="Member sign in"
      title="Welcome back"
      description="Sign in to manage your stays, check booking details and pick up where you left off."
      footer={
        <p>
          No account yet?{" "}
          <Link
            to="/register"
            className="font-medium text-brand underline underline-offset-4 hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Create one
          </Link>
        </p>
      }
    >
      <LoginForm />
    </AuthSection>
  );
}

export default LoginPage;
