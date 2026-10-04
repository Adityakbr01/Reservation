import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy } from "lucide-react";
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
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatMoney } from "@/lib/money";
import { useCoupons, useUpdateCoupon } from "../hooks/use-coupons";
import type { CouponStatus } from "../types/coupon.types";

const STATUS_FILTERS = ["all", "ACTIVE", "INACTIVE", "EXPIRED"] as const;

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard API needs a secure context; fall back to legacy exec.
      const area = document.createElement("textarea");
      area.value = code;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 rounded-full"
      onClick={() => void handleCopy()}
      title={copied ? "Copied" : `Copy ${code}`}
      aria-label={copied ? "Copied" : `Copy ${code}`}
    >
      {copied ? <Check aria-hidden className="text-success" /> : <Copy aria-hidden />}
    </Button>
  );
}

function discountLabel(code: {
  discountType: string;
  discountValue: number;
  maxDiscount: number | null;
}): string {
  if (code.discountType === "PERCENTAGE") {
    return `${code.discountValue}%${code.maxDiscount != null ? ` (cap ${formatMoney(code.maxDiscount, "INR")})` : ""}`;
  }
  return formatMoney(code.discountValue, "INR");
}

export function CouponsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);
  const updateMutation = useUpdateCoupon();

  const filters = useMemo(
    () => ({
      page,
      limit: 10,
      ...(debouncedSearch.trim() ? { q: debouncedSearch.trim() } : {}),
      ...(status !== "all" ? { status: status as CouponStatus } : {}),
    }),
    [page, debouncedSearch, status],
  );
  const { data, isPending, isError, refetch } = useCoupons(filters);
  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-light tracking-tight sm:text-4xl">Coupons</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `${data.total} coupons` : "Discount codes for checkout"}
          </p>
        </div>
        <Button asChild className="rounded-full">
          <Link to="/coupons/new">New coupon</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search code…"
          className="sm:max-w-xs"
          aria-label="Search coupons"
        />
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as (typeof STATUS_FILTERS)[number]);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-52" aria-label="Filter by status">
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
        <div className="space-y-2" aria-busy="true" aria-label="Loading coupons">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Could not load coupons.</p>
          <Button variant="outline" className="mt-4 rounded-full" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border p-8 text-center">
          <p className="font-medium">No coupons found</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell>
                    <span className="inline-flex items-center gap-1">
                      <Link
                        to={`/coupons/${coupon.id}/edit`}
                        className="font-medium text-brand hover:text-brand-dark"
                      >
                        {coupon.code}
                      </Link>
                      <CopyCodeButton code={coupon.code} />
                    </span>
                  </TableCell>
                  <TableCell>{discountLabel(coupon)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {coupon.usageCount}
                    {coupon.usageLimit != null ? ` / ${coupon.usageLimit}` : ""}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={coupon.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {coupon.status === "ACTIVE" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        disabled={updateMutation.isPending}
                        onClick={() =>
                          updateMutation.mutate({
                            id: coupon.id,
                            payload: { status: "INACTIVE" },
                          })
                        }
                      >
                        Disable
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PaginationControls page={page} totalPages={data?.totalPages ?? 0} onPage={setPage} />
        </>
      )}
    </div>
  );
}

export default CouponsPage;
