import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CouponForm } from "../components/CouponForm";
import { useCoupon, useUpdateCoupon } from "../hooks/use-coupons";

export function CouponEditPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data, isPending, isError, refetch } = useCoupon(id);
  const { mutate, isPending: isSaving } = useUpdateCoupon();

  if (isPending) {
    return <div className="h-40 animate-pulse rounded-xl bg-muted" aria-label="Loading coupon" />;
  }

  if (isError || !data) {
    return (
      <div className="mx-auto w-full max-w-sm py-8 text-center">
        <p className="font-medium">Coupon not found.</p>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="flex-1 rounded-full" onClick={() => void refetch()}>
            Retry
          </Button>
          <Button asChild className="flex-1 rounded-full">
            <Link to="/coupons">Back to list</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/coupons"
          className="text-sm font-medium text-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          ← Back to coupons
        </Link>
        <h1 className="mt-2 font-display text-3xl font-light tracking-tight">{data.code}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Used {data.usageCount}
          {data.usageLimit != null ? ` of ${data.usageLimit}` : ""} · history is preserved on
          disable
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <CouponForm
            initial={data}
            submitLabel="Save changes"
            isPending={isSaving}
            onSubmit={(payload) =>
              mutate(
                {
                  id,
                  payload: {
                    discountValue: payload.discountValue,
                    maxDiscount: payload.maxDiscount,
                    minimumBookingAmount: payload.minimumBookingAmount,
                    validFrom: payload.validFrom,
                    validUntil: payload.validUntil,
                    usageLimit: payload.usageLimit,
                  },
                },
                { onSuccess: () => navigate("/coupons") },
              )
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default CouponEditPage;
