import { Link } from "react-router-dom";
import { AuthSection } from "@/components/ui/auth-section-1";
import { ForgotPasswordForm } from "../components/ForgotPasswordForm";
import { useRedirectIfAuthenticated } from "@/app/use-redirect-if-authenticated";

export function ForgotPasswordPage() {
  useRedirectIfAuthenticated();
  return (
    <AuthSection
      mode="forgot"
      eyebrow="Password help"
      title="Forgot your password?"
      description="Enter the email linked to your account and we'll send you a secure reset link."
      footer={
        <p>
          Remembered it?{" "}
          <Link
            to="/login"
            className="font-medium text-brand underline underline-offset-4 hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthSection>
  );
}

export default ForgotPasswordPage;
