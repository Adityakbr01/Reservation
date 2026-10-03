import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  BedDouble,
  Bell,
  Building2,
  CalendarCheck,
  CalendarDays,
  CircleHelp,
  FileText,
  Image,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  Receipt,
  ScrollText,
  Settings,
  Tags,
  Ticket,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useLogout } from "@/app/use-logout";
import { useAuthStore } from "@/stores/auth-store";

const OVERVIEW_LINKS = [
  { to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/sales", label: "Sales", Icon: TrendingUp },
];

const MANAGE_LINKS = [
  { to: "/reservations", label: "Reservations", Icon: CalendarCheck },
  { to: "/customers", label: "Customers", Icon: Users },
  { to: "/room-types", label: "Room types", Icon: Building2 },
  { to: "/rooms", label: "Rooms", Icon: BedDouble },
  { to: "/rate-plans", label: "Rate plans", Icon: Tags },
  { to: "/availability", label: "Availability", Icon: CalendarDays },
  { to: "/payments", label: "Payments", Icon: Receipt },
  { to: "/coupons", label: "Coupons", Icon: Ticket },
  { to: "/notifications", label: "Notifications", Icon: Bell },
];

const CONTENT_LINKS = [
  { to: "/cms/pages", label: "Pages", Icon: FileText },
  { to: "/cms/blogs", label: "Blog", Icon: Newspaper },
  { to: "/cms/faqs", label: "FAQs", Icon: CircleHelp },
  { to: "/cms/offers", label: "Offers", Icon: Tags },
  { to: "/cms/policies", label: "Policies", Icon: FileText },
  { to: "/media", label: "Media", Icon: Image },
  { to: "/settings", label: "Settings", Icon: Settings },
  { to: "/audit-logs", label: "Audit logs", Icon: ScrollText },
];

function sideLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "flex min-h-[44px] items-center gap-3 rounded-full px-4 text-sm font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    isActive ? "bg-night text-white" : "text-foreground hover:bg-surface-2",
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="px-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

/**
 * Authenticated management chrome. Mounted only behind RequireAuth, so
 * signed-out visitors never see the sidebar, topbar, or section links.
 */
export function AdminShell() {
  const logout = useLogout();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);

  const initial = user?.name.trim().charAt(0).toUpperCase() || "?";

  const sidebar = (
    <div className="flex h-full flex-col bg-background">
      <Link
        to="/dashboard"
        onClick={() => setOpen(false)}
        className="px-6 pb-2 pt-6 font-display text-lg font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        Reservation · Admin
      </Link>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Management">
        <div className="space-y-1">
          <SectionLabel>Overview</SectionLabel>
          {OVERVIEW_LINKS.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} end={to === "/dashboard"} onClick={() => setOpen(false)} className={sideLinkClass}>
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </NavLink>
          ))}
        </div>
        <div className="space-y-1">
          <SectionLabel>Manage</SectionLabel>
          {MANAGE_LINKS.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)} className={sideLinkClass}>
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </NavLink>
          ))}
        </div>
        <div className="space-y-1">
          <SectionLabel>Content</SectionLabel>
          {CONTENT_LINKS.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)} className={sideLinkClass}>
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </NavLink>
          ))}
        </div>
        <div className="space-y-1">
          <SectionLabel>Account</SectionLabel>
          <NavLink to="/profile" onClick={() => setOpen(false)} className={sideLinkClass}>
            <User className="size-4 shrink-0" aria-hidden />
            Profile
          </NavLink>
        </div>
      </nav>
      <div className="p-3">
        <Separator className="mb-3" />
        <Button variant="destructive" className="w-full justify-start rounded-full text-white!" onClick={logout}>
          <LogOut aria-hidden />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background font-sans text-foreground">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border lg:block">
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-border bg-background">
            <div className="flex justify-end p-2">
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setOpen(false)}>
                <X aria-hidden />
                <span className="sr-only">Close menu</span>
              </Button>
            </div>
            <div className="h-[calc(100%-3rem)]">{sidebar}</div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex h-16 items-center gap-2 px-4 sm:px-6">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full lg:hidden"
              onClick={() => setOpen(true)}
            >
              <Menu aria-hidden />
              <span className="sr-only">Open menu</span>
            </Button>
            <span className="font-display text-base font-semibold tracking-tight lg:hidden">
              Reservation · Admin
            </span>
            <div className="flex-1" />
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-2 rounded-full p-1 outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    aria-label="Account menu"
                  >
                    <Avatar>
                      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                      <AvatarFallback>{initial}</AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">
                      {user.name}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <span className="block truncate">{user.name}</span>
                    <span className="block truncate font-normal capitalize">{user.role}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={logout}>Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>
        <main className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
