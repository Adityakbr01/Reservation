import { connectDatabase, disconnectDatabase } from "../src/config/database";
import { NotificationModel } from "../src/modules/notifications/notification.model";
import { listPaymentsByBooking } from "../src/modules/payments/payment.repository";
import { listRefundsForPayment } from "../src/modules/refunds/refund.model";

/**
 * One-off repair for REFUND_UPDATED rows enqueued without a paymentId
 * (pre-fix cancel flow). Attaches the refunded payment and re-queues
 * them so the worker can render + send.
 */
async function main(): Promise<void> {
  await connectDatabase();
  const broken = await NotificationModel.find({
    type: "REFUND_UPDATED",
    $or: [{ paymentId: null }, { paymentId: { $exists: false } }],
  }).exec();
  console.log(`BROKEN:${broken.length}`);
  for (const row of broken) {
    let paymentId: string | null = null;
    if (row.bookingId) {
      const payments = await listPaymentsByBooking(row.bookingId.toString());
      for (const payment of payments) {
        const refunds = await listRefundsForPayment(payment.id);
        if (refunds.length > 0) {
          paymentId = payment.id;
          break;
        }
      }
    }
    if (!paymentId) {
      console.log(`SKIP:${row._id} no refund found yet`);
      continue;
    }
    row.paymentId = paymentId as unknown as typeof row.paymentId;
    row.status = "QUEUED";
    row.attempts = 0;
    row.nextAttemptAt = new Date();
    row.lastError = null;
    await row.save();
    console.log(`FIXED:${row._id} payment=${paymentId} requeued`);
  }
  await disconnectDatabase();
}

main()
  .then(() => {
    console.log("FIX_DONE");
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error("FIX_FAILED", error instanceof Error ? error.message : error);
    process.exit(1);
  });
