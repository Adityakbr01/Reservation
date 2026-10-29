async function main() {
  const r = await fetch("https://api.hamptworthstays.com/api/diagnose");
  const data = await r.json();
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
