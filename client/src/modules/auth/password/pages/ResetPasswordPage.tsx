import { Link, useSearchParams } from "react-router-dom";
import { AuthSection } from "@/components/ui/auth-section-1";
import { ResetPasswordForm } from "../components/ResetPasswordForm";
import { useRedirectIfAuthenticated } from "@/app/use-redirect-if-authenticated";

export function ResetPasswordPage() {
  useRedirectIfAuthenticated();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  return (
    <AuthSection
      mode="reset"
      eyebrow="Account recovery"
      title="Set a new password"
      description={
        token
          ? "Choose a strong password to secure your account."
          : "This reset link is incomplete, so we cannot verify your request."
      }
      footer={
        <p>
          Back to{" "}
          <Link
            to="/login"
            className="font-medium text-brand underline underline-offset-4 hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            sign in
          </Link>
          .
        </p>
      }
    >
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="space-y-5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            The link is missing its token. Request a fresh reset link to continue.
          </p>
          <Link
            to="/forgot-password"
            className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-[13px] tracking-wide text-primary-foreground transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Request a new link
          </Link>
        </div>
      )}
    </AuthSection>
  );
}

export default ResetPasswordPage;
