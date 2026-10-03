import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RoomTypeForm } from "../components/RoomTypeForm";
import { useRoomType, useUpdateRoomType } from "../hooks/use-room-types";

export function RoomTypeEditPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: roomType, isPending, isError, refetch } = useRoomType(id);
  const { mutate, isPending: isSaving } = useUpdateRoomType(id);

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-2xl" aria-busy="true" aria-label="Loading room type">
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (isError || !roomType) {
    return (
      <div className="mx-auto w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Not found</CardTitle>
            <CardDescription>This room type does not exist or failed to load.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => void refetch()}>
              Retry
            </Button>
            <Button asChild className="flex-1 rounded-full">
              <Link to="/room-types">Back to list</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <Link
          to="/room-types"
          className="text-sm font-medium text-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          ← Back to room types
        </Link>
        <h1 className="mt-2 font-display text-3xl font-light tracking-tight">{roomType.name}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <RoomTypeForm
            key={roomType.id}
            initial={roomType}
            submitLabel="Save changes"
            isPending={isSaving}
            onSubmit={(payload) => mutate(payload, { onSuccess: () => navigate("/room-types") })}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default RoomTypeEditPage;
