import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/common/StatusBadge";
import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import { formatMoney } from "@/lib/money";

interface PaymentDetail {
  payment: {
    id: string;
    bookingId: string;
    amount: number;
    currency: string;
    status: string;
    providerPaymentIntentId: string | null;
    failureCode: string | null;
    failureMessage: string | null;
    paidAt: string | null;
    createdAt: string;
  };
  bookingNumber: string | null;
  refunds: Array<{
    id: string;
    providerRefundId: string;
    amount: number;
    currency: string;
    status: string;
    processedAt: string | null;
  }>;
}

export function PaymentDetailPage() {
  const { id = "" } = useParams();
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["admin-payments", "detail", id],
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<PaymentDetail>>(`/admin/payments/${id}`);
      return unwrapResponse(response);
    },
    enabled: id.length > 0,
  });

  if (isPending) {
    return <div className="h-40 animate-pulse rounded-xl bg-muted" aria-label="Loading payment" />;
  }

  if (isError || !data) {
    return (
      <div className="mx-auto w-full max-w-sm py-8 text-center">
        <p className="font-medium">Payment not found.</p>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="flex-1 rounded-full" onClick={() => void refetch()}>
            Retry
          </Button>
          <Button asChild className="flex-1 rounded-full">
            <Link to="/payments">Back to list</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { payment, bookingNumber, refunds } = data;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/payments" className="text-sm font-medium text-brand hover:text-brand-dark">
          ← Back to payments
        </Link>
        <h1 className="mt-2 font-display text-3xl font-light tracking-tight">
          {formatMoney(payment.amount, payment.currency)}
        </h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <StatusBadge status={payment.status} />
          {bookingNumber ? (
            <Link to={`/reservations/${payment.bookingId}`} className="text-brand hover:text-brand-dark">
              {bookingNumber}
            </Link>
          ) : (
            "no booking"
          )}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Charge</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="break-all text-muted-foreground">
              Intent: {payment.providerPaymentIntentId ?? "—"}
            </p>
            <p className="text-muted-foreground">Paid: {payment.paidAt ?? "—"}</p>
            {payment.failureMessage && (
              <p className="text-destructive">
                {payment.failureCode}: {payment.failureMessage}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Refunds ({refunds.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {refunds.length === 0 ? (
              <p className="text-sm text-muted-foreground">No refunds on this payment.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refunds.map((refund) => (
                    <TableRow key={refund.id}>
                      <TableCell>{formatMoney(refund.amount, refund.currency)}</TableCell>
                      <TableCell>
                        <StatusBadge status={refund.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default PaymentDetailPage;
