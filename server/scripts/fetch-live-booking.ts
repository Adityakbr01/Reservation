async function main() {
  const base = "https://api.hamptworthstays.com/api/v1";
  
  // Login as admin
  const loginRes = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@gmail.com",
      password: "admin@gmail.com"
    })
  });
  const { data: { token } } = await loginRes.json();

  // Fetch the reservation
  const resRes = await fetch(`${base}/admin/reservations/588538e2f27befb6aa40f0da`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("Reservation 588538e2f27befb6aa40f0da:", JSON.stringify(await resRes.json(), null, 2));

  // Fetch the payment
  const payRes = await fetch(`${base}/admin/payments/141577e23bd7bcb9fd7e31e3`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("Payment 141577e23bd7bcb9fd7e31e3:", JSON.stringify(await payRes.json(), null, 2));
}

main().catch(console.error);
