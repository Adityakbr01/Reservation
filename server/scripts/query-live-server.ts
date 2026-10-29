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
  const loginData = await loginRes.json();
  console.log("Admin login status:", loginRes.status, loginData.success ? "Success" : loginData);

  const token = loginData.data?.token;
  if (!token) {
    console.log("No token obtained!");
    return;
  }

  // Get reservations from the live server
  const resList = await fetch(`${base}/admin/reservations?limit=10`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const resData = await resList.json();
  console.log("Live server reservations:", JSON.stringify(resData, null, 2));

  // Also query specific booking 588538e2f27befb6aa40f0da
  const specificRes = await fetch(`${base}/bookings/588538e2f27befb6aa40f0da`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("Specific booking from live server:", await specificRes.text());
}

main().catch(console.error);
