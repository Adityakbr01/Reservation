import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChangePasswordForm } from "../components/ChangePasswordForm";
import { ProfileForm } from "../components/ProfileForm";
import { useMe } from "../hooks/use-me";

function ProfileSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading profile">
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

export function ProfilePage() {
  const { data: user, isPending, isError, refetch } = useMe();

  if (isPending) return <ProfileSkeleton />;

  if (isError || !user) {
    return (
      <div className="mx-auto w-full max-w-sm">
        <Card className="shadow-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Profile unavailable</CardTitle>
            <CardDescription>We could not load your profile. Check your connection and retry.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="h-11 w-full rounded-full" onClick={() => void refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initial = user.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardContent className="flex items-center gap-4 p-6">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={`${user.name}'s avatar`}
              className="size-16 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex size-16 items-center justify-center rounded-full bg-night font-display text-2xl font-light text-white"
              aria-hidden
            >
              {initial}
            </div>
          )}
          <div className="min-w-0 space-y-1">
            <h1 className="truncate font-display text-2xl font-light tracking-tight sm:text-3xl">
              {user.name}
            </h1>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            <span className="inline-block rounded-full bg-surface-2 px-3 py-1 text-xs font-medium capitalize text-foreground">
              {user.role}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Edit profile</CardTitle>
            <CardDescription>Update your display name or avatar</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm key={user.id} user={user} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Change password</CardTitle>
            <CardDescription>Use at least 8 characters</CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ProfilePage;
