import { AuthSection } from "@/components/ui/auth-section-1";
import { EnquiryForm } from "../components/EnquiryForm";

export function EnquirePage() {
  return (
    <AuthSection
      mode="enquiry"
      wide
      eyebrow="Enquire"
      title="Plan your stay"
      description="A few details and we'll come back with the right cottage and price."
      footer={
        <p>
          Prefer to talk?{" "}
          <a
            href="tel:+441794390155"
            className="font-medium text-brand underline underline-offset-4 hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Call +44 7943 547557
          </a>
          .
        </p>
      }
    >
      <EnquiryForm variant="page" submitLabel="Send enquiry" />
    </AuthSection>
  );
}

export default EnquirePage;
