import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationControls } from "@/components/common/PaginationControls";
import { StatusBadge } from "@/components/common/StatusBadge";
import { formatMoney } from "@/lib/money";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useCottages } from "../hooks/use-cottages";
import { listCategories } from "../api/categories.api";
import { CategoryManagerDialog } from "../components/CategoryManagerDialog";
import type { CottageStatus } from "../types/cottage.types";

const STATUS_FILTERS = ["all", "DRAFT", "ACTIVE", "INACTIVE"] as const;

export function CottagesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isCatManagerOpen, setIsCatManagerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const { data: categories = [] } = useQuery({
    queryKey: ["cottage-categories"],
    queryFn: listCategories,
  });

  const filters = useMemo(
    () => ({
      page,
      limit: 10,
      ...(debouncedSearch.trim() ? { q: debouncedSearch.trim() } : {}),
      ...(status !== "all" ? { status: status as CottageStatus } : {}),
      ...(selectedCategory !== "all" ? { category_id: selectedCategory } : {}),
    }),
    [page, debouncedSearch, status, selectedCategory],
  );
  const { data, isPending, isError, refetch } = useCottages(filters);
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-light tracking-tight sm:text-4xl">Cottages</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.total} holiday cottages` : "Manage your holiday cottages, pricing, and details"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-full px-5 gap-2"
            onClick={() => setIsCatManagerOpen(true)}
          >
            <Layers className="size-4" /> Manage Categories
          </Button>
          <Button asChild className="h-11 rounded-full px-6">
            <Link to="/cottages/new">New cottage</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search cottage name or slug…"
          className="sm:max-w-xs"
          aria-label="Search cottages"
        />
        <Select
          value={selectedCategory}
          onValueChange={(value) => {
            setSelectedCategory(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-52" aria-label="Filter by category">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as (typeof STATUS_FILTERS)[number]);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-44" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((option) => (
              <SelectItem key={option} value={option}>
                {option === "all" ? "All statuses" : option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading cottages">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Could not load cottages.</p>
          <Button variant="outline" className="mt-4 rounded-full" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border p-8 text-center">
          <p className="font-medium">No cottages yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first cottage to start taking bookings.
          </p>
          <Button asChild className="mt-4 h-11 rounded-full px-6">
            <Link to="/cottages/new">New cottage</Link>
          </Button>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cottage</TableHead>
                <TableHead>Collection / Category</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Rate / night</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((cottage) => (
                <TableRow key={cottage.id}>
                  <TableCell>
                    <div className="font-medium">{cottage.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {cottage.bedrooms ? `${cottage.bedrooms} bed` : ""}
                      {cottage.bathrooms ? ` · ${cottage.bathrooms} bath` : ""}
                      {` · /${cottage.slug}`}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-muted border border-border text-foreground">
                      {cottage.category?.name ?? (cottage.homeSection === "section_2" ? "The Estate Collection" : "Farm Cottages")}
                    </span>
                  </TableCell>
                  <TableCell>
                    {cottage.maxAdults} adults · {cottage.maxChildren} children (max {cottage.maxOccupancy})
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatMoney(Number(cottage.basePrice ?? cottage.base_price ?? 150) * 100)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={cottage.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm" className="rounded-full">
                      <Link to={`/cottages/${cottage.id}/edit`}>Edit</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationControls page={data?.page ?? 1} totalPages={totalPages} onPage={setPage} />
        </>
      )}

      <CategoryManagerDialog open={isCatManagerOpen} onOpenChange={setIsCatManagerOpen} />
    </div>
  );
}

export const RoomTypesPage = CottagesPage;
export default CottagesPage;

