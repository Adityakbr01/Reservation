import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RatePlanForm } from "../components/RatePlanForm";
import { DailyPriceGrid } from "../components/DailyPriceGrid";
import { useRatePlan, useUpdateRatePlan } from "../hooks/use-rate-plans";

export function RatePlanEditPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: plan, isPending, isError, refetch } = useRatePlan(id);
  const { mutate, isPending: isSaving } = useUpdateRatePlan(id);

  if (isPending) {
    return (
      <div className="w-full" aria-busy="true" aria-label="Loading rate plan">
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (isError || !plan) {
    return (
      <div className="mx-auto w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Not found</CardTitle>
            <CardDescription>This rate plan does not exist or failed to load.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => void refetch()}>
              Retry
            </Button>
            <Button asChild className="flex-1 rounded-full">
              <Link to="/rate-plans">Back to list</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/rate-plans"
          className="text-sm font-medium text-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          ← Back to rate plans
        </Link>
        <h1 className="mt-2 font-display text-3xl font-light tracking-tight">{plan.name}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <RatePlanForm
            key={plan.id}
            initial={plan}
            submitLabel="Save changes"
            isPending={isSaving}
            onSubmit={(payload) => mutate(payload, { onSuccess: () => navigate("/rate-plans") })}
          />
        </CardContent>
      </Card>
      <DailyPriceGrid ratePlanId={plan.id} basePrice={plan.pricing.amount} currency={plan.pricing.currency} />
    </div>
  );
}

export default RatePlanEditPage;
