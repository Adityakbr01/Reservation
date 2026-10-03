import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RoomForm } from "../components/RoomForm";
import { useCreateRoom } from "../hooks/use-rooms";

export function RoomCreatePage() {
  const navigate = useNavigate();
  const { mutate, isPending } = useCreateRoom();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <Link
          to="/rooms"
          className="text-sm font-medium text-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          ← Back to rooms
        </Link>
        <h1 className="mt-2 font-display text-3xl font-light tracking-tight">New room</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Details</CardTitle>
          <CardDescription>Room numbers stay unique within the property</CardDescription>
        </CardHeader>
        <CardContent>
          <RoomForm
            submitLabel="Create room"
            isPending={isPending}
            onSubmit={(payload) => mutate(payload, { onSuccess: () => navigate("/rooms") })}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default RoomCreatePage;
