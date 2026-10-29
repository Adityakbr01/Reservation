async function main() {
  const base = "https://api.hamptworthstays.com";
  
  try {
    const health = await fetch(`${base}/health`);
    console.log("Health status:", health.status, await health.text());
  } catch (e: any) {
    console.log("Health error:", e.message);
  }

  try {
    const healthV1 = await fetch(`${base}/api/v1/health`);
    console.log("Health v1 status:", healthV1.status, await healthV1.text());
  } catch (e: any) {
    console.log("Health v1 error:", e.message);
  }

  try {
    const booking = await fetch(`${base}/api/v1/bookings/588538e2f27befb6aa40f0da`);
    console.log("Booking 588538e2f27befb6aa40f0da status:", booking.status, await booking.text());
  } catch (e: any) {
    console.log("Booking error:", e.message);
  }
}

main().catch(console.error);
