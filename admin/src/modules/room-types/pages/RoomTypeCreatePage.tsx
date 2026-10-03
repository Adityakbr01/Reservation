import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RoomTypeForm } from "../components/RoomTypeForm";
import { useCreateRoomType } from "../hooks/use-room-types";

export function RoomTypeCreatePage() {
  const navigate = useNavigate();
  const { mutate, isPending } = useCreateRoomType();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <Link
          to="/room-types"
          className="text-sm font-medium text-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          ← Back to room types
        </Link>
        <h1 className="mt-2 font-display text-3xl font-light tracking-tight">New room type</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Media and SEO attach later via the media and CMS modules.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Details</CardTitle>
          <CardDescription>Slug auto-generates when left empty</CardDescription>
        </CardHeader>
        <CardContent>
          <RoomTypeForm
            submitLabel="Create room type"
            isPending={isPending}
            onSubmit={(payload) => mutate(payload, { onSuccess: () => navigate("/room-types") })}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default RoomTypeCreatePage;
