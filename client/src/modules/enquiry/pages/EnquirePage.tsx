import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EnquiryForm } from "../components/EnquiryForm";

export function EnquirePage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 pb-8">
      <Link to="/" className="text-sm font-medium text-brand hover:text-brand-dark">← Back to search</Link>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-3xl font-light">Enquire</CardTitle>
          <CardDescription>Tell us about your ideal holiday — budget, party, bedrooms, dates, location, dog friendly…</CardDescription>
        </CardHeader>
        <CardContent>
          <EnquiryForm submitLabel="Send enquiry" />
        </CardContent>
      </Card>
    </div>
  );
}

export default EnquirePage;
