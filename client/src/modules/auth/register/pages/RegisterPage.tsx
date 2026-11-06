import { Link } from "react-router-dom";
import { AuthSection } from "@/components/ui/auth-section-1";
import { RegisterForm } from "../components/RegisterForm";
import { useRedirectIfAuthenticated } from "@/app/use-redirect-if-authenticated";

export function RegisterPage() {
  useRedirectIfAuthenticated();
  return (
    <AuthSection
      mode="register"
      eyebrow="Create your account"
      title="Make yourself at home"
      description="Save your details, book directly and keep every cottage break in one place."
      footer={
        <p>
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-brand underline underline-offset-4 hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthSection>
  );
}

export default RegisterPage;
