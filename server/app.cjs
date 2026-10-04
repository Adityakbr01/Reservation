// GoDaddy cPanel ("Setup Node.js App") / Passenger startup file.
// Application Startup File me iska naam dalein:  app.cjs
// Plain `node` se chalta hai — Bun ki zaroorat nahi. Pehle ek baar
// `npm run build:node` chalana zaroori hai (dist-node/ ban jayega).
import("./dist-node/server.js").catch((err) => {
  console.error("[app] failed to start server:", err);
  process.exit(1);
});
