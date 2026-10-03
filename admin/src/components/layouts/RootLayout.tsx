import { Link, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function RootLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <nav className="mx-auto flex max-w-5xl items-center gap-2 p-4">
          <Button asChild variant="ghost">
            <Link to="/">Dashboard</Link>
          </Button>
          <div className="flex-1" />
          <Button asChild variant="ghost">
            <Link to="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link to="/register">Register</Link>
          </Button>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl p-4">
        <Outlet />
      </main>
    </div>
  );
}
