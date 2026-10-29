async function main() {
  const r = await fetch("https://api.hamptworthstays.com/api/v1/webhooks/stripe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ test: true }),
  });
  console.log("Status:", r.status);
  console.log("Body:", await r.text());
}

main().catch(console.error);
