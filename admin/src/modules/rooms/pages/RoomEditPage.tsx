import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RoomForm } from "../components/RoomForm";
import { useRoom, useUpdateRoom } from "../hooks/use-rooms";

export function RoomEditPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data: room, isPending, isError, refetch } = useRoom(id);
  const { mutate, isPending: isSaving } = useUpdateRoom(id);

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-2xl" aria-busy="true" aria-label="Loading room">
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (isError || !room) {
    return (
      <div className="mx-auto w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Not found</CardTitle>
            <CardDescription>This room does not exist or failed to load.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => void refetch()}>
              Retry
            </Button>
            <Button asChild className="flex-1 rounded-full">
              <Link to="/rooms">Back to list</Link>
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
          to="/rooms"
          className="text-sm font-medium text-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          ← Back to rooms
        </Link>
        <h1 className="mt-2 font-display text-3xl font-light tracking-tight">
          Room {room.roomNumber}
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <RoomForm
            key={room.id}
            initial={room}
            submitLabel="Save changes"
            isPending={isSaving}
            onSubmit={(payload) => mutate(payload, { onSuccess: () => navigate("/rooms") })}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default RoomEditPage;
