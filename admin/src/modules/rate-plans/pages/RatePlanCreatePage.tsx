import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RatePlanForm } from "../components/RatePlanForm";
import { useCreateRatePlan } from "../hooks/use-rate-plans";

export function RatePlanCreatePage() {
  const navigate = useNavigate();
  const { mutate, isPending } = useCreateRatePlan();

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/rate-plans"
          className="text-sm font-medium text-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          ← Back to rate plans
        </Link>
        <h1 className="mt-2 font-display text-3xl font-light tracking-tight">New rate plan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Amounts enter in rupees and store as paise.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <RatePlanForm
            submitLabel="Create rate plan"
            isPending={isPending}
            onSubmit={(payload) => mutate(payload, { onSuccess: () => navigate("/rate-plans") })}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default RatePlanCreatePage;
