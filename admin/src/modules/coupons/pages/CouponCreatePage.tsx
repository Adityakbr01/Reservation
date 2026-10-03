import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CouponForm } from "../components/CouponForm";
import { useCreateCoupon } from "../hooks/use-coupons";

export function CouponCreatePage() {
  const navigate = useNavigate();
  const { mutate, isPending } = useCreateCoupon();

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/coupons"
          className="text-sm font-medium text-brand hover:text-brand-dark focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          ← Back to coupons
        </Link>
        <h1 className="mt-2 font-display text-3xl font-light tracking-tight">New coupon</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <CouponForm
            submitLabel="Create coupon"
            isPending={isPending}
            onSubmit={(payload) => mutate(payload, { onSuccess: () => navigate("/coupons") })}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default CouponCreatePage;
