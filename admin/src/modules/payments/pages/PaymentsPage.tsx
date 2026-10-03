import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { useAdminPayments, useAdminRefunds } from "../hooks/use-payments";
import { PAYMENT_STATUSES, REFUND_STATUSES } from "../types/payment.types";
import type { PaymentStatus, RefundStatus } from "../types/payment.types";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function PaymentsPage() {
  const [tab, setTab] = useState<"payments" | "refunds">("payments");
  const [paymentStatus, setPaymentStatus] = useState<string>("all");
  const [refundStatus, setRefundStatus] = useState<string>("all");
  const [page, setPage] = useState(1);

  const paymentFilters = useMemo(
    () => ({
      page,
      limit: 10,
      ...(paymentStatus !== "all" ? { status: paymentStatus as PaymentStatus } : {}),
    }),
    [page, paymentStatus],
  );
  const refundFilters = useMemo(
    () => ({
      page,
      limit: 10,
      ...(refundStatus !== "all" ? { status: refundStatus as RefundStatus } : {}),
    }),
    [page, refundStatus],
  );

  const paymentsQuery = useAdminPayments(paymentFilters);
  const refundsQuery = useAdminRefunds(refundFilters);
  const paymentItems = paymentsQuery.data?.items ?? [];
  const refundItems = refundsQuery.data?.items ?? [];

  function switchTab(next: "payments" | "refunds") {
    setTab(next);
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-light tracking-tight sm:text-4xl">Payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Charges and refunds — money moves only via Stripe webhooks
        </p>
      </div>

      <div className="flex gap-2" role="tablist" aria-label="Payments or refunds">
        {(["payments", "refunds"] as const).map((option) => (
          <Button
            key={option}
            role="tab"
            aria-selected={tab === option}
            variant={tab === option ? "default" : "outline"}
            className="rounded-full capitalize"
            onClick={() => switchTab(option)}
          >
            {option}
          </Button>
        ))}
      </div>

      {tab === "payments" ? (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Select
              value={paymentStatus}
              onValueChange={(value) => {
                setPaymentStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="sm:w-52" aria-label="Filter by payment status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {PAYMENT_STATUSES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {paymentsQuery.isPending ? (
            <div className="space-y-2" aria-busy="true" aria-label="Loading payments">
              {[0, 1, 2].map((row) => (
                <div key={row} className="h-14 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : paymentsQuery.isError ? (
            <div className="rounded-xl border border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">Could not load payments.</p>
              <Button
                variant="outline"
                className="mt-4 rounded-full"
                onClick={() => void paymentsQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : paymentItems.length === 0 ? (
            <div className="rounded-xl border border-border p-8 text-center">
              <p className="font-medium">No payments yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Charges appear here once customers pay.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid at</TableHead>
                    <TableHead>Failure</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentItems.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {formatMoney(payment.amount, payment.currency)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={payment.status} />
                      </TableCell>
                      <TableCell>{formatDate(payment.paidAt)}</TableCell>
                      <TableCell className="max-w-48 truncate text-xs text-muted-foreground">
                        {payment.failureCode ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationControls
                page={paymentsQuery.data?.page ?? 1}
                totalPages={paymentsQuery.data?.totalPages ?? 0}
                onPage={setPage}
              />
            </>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Select
              value={refundStatus}
              onValueChange={(value) => {
                setRefundStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="sm:w-52" aria-label="Filter by refund status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {REFUND_STATUSES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {refundsQuery.isPending ? (
            <div className="space-y-2" aria-busy="true" aria-label="Loading refunds">
              {[0, 1, 2].map((row) => (
                <div key={row} className="h-14 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : refundsQuery.isError ? (
            <div className="rounded-xl border border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">Could not load refunds.</p>
              <Button
                variant="outline"
                className="mt-4 rounded-full"
                onClick={() => void refundsQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : refundItems.length === 0 ? (
            <div className="rounded-xl border border-border p-8 text-center">
              <p className="font-medium">No refunds yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Refunds from cancellations appear here.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refundItems.map((refund) => (
                    <TableRow key={refund.id}>
                      <TableCell className="font-medium">
                        {formatMoney(refund.amount, refund.currency)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={refund.status} />
                      </TableCell>
                      <TableCell className="max-w-48 truncate text-xs text-muted-foreground">
                        {refund.reason ?? "—"}
                      </TableCell>
                      <TableCell>{formatDate(refund.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationControls
                page={refundsQuery.data?.page ?? 1}
                totalPages={refundsQuery.data?.totalPages ?? 0}
                onPage={setPage}
              />
            </>
          )}
        </>
      )}
      <p className="text-xs text-muted-foreground">
        Money moves only through Stripe — this screen is read-only except refunds started
        from a reservation.
      </p>
    </div>
  );
}

export default PaymentsPage;
