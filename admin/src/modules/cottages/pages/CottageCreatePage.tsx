import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CottageForm } from "../components/CottageForm";
import { useCreateCottage } from "../hooks/use-cottages";

export function CottageCreatePage() {
  const navigate = useNavigate();
  const { mutate, isPending } = useCreateCottage();

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/cottages"
          className="text-sm font-medium text-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          ← Back to cottages
        </Link>
        <h1 className="mt-2 font-display text-3xl font-light tracking-tight">New cottage</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a holiday cottage with photos, features, and nightly rate.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Cottage details</CardTitle>
          <CardDescription>Slug auto-generates when left empty</CardDescription>
        </CardHeader>
        <CardContent>
          <CottageForm
            submitLabel="Create cottage"
            isPending={isPending}
            onSubmit={(payload) => mutate(payload, { onSuccess: () => navigate("/cottages") })}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export const RoomTypeCreatePage = CottageCreatePage;
export default CottageCreatePage;

