async function main() {
  const p = await fetch("https://api.hamptworthstays.com/api/public/property");
  console.log("Property from live:", await p.json());

  const r = await fetch("https://api.hamptworthstays.com/api/public/room-types");
  const rooms = await r.json();
  console.log("Rooms count from live:", rooms.data?.length);
}

main().catch(console.error);
