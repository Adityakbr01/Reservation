import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CottageForm } from "../components/CottageForm";
import { useCottage, useUpdateCottage } from "../hooks/use-cottages";

export function CottageEditPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: cottage, isPending, isError, refetch } = useCottage(id);
  const { mutate, isPending: isSaving } = useUpdateCottage(id);

  if (isPending) {
    return (
      <div className="w-full" aria-busy="true" aria-label="Loading cottage">
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (isError || !cottage) {
    return (
      <div className="mx-auto w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Not found</CardTitle>
            <CardDescription>This cottage does not exist or failed to load.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => void refetch()}>
              Retry
            </Button>
            <Button asChild className="flex-1 rounded-full">
              <Link to="/cottages">Back to cottages</Link>
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
          to="/cottages"
          className="text-sm font-medium text-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          ← Back to cottages
        </Link>
        <h1 className="mt-2 font-display text-3xl font-light tracking-tight">{cottage.name}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Cottage details</CardTitle>
        </CardHeader>
        <CardContent>
          <CottageForm
            key={cottage.id}
            initial={cottage}
            submitLabel="Save changes"
            isPending={isSaving}
            onSubmit={(payload) => mutate(payload, { onSuccess: () => navigate("/cottages") })}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export const RoomTypeEditPage = CottageEditPage;
export default CottageEditPage;

