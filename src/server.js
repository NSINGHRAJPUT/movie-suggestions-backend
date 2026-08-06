import "dotenv/config";
import app from "./app.js";
import { closeDriver, verifyConnectivity } from "./config/db.js";

const PORT = process.env.PORT || 5000;

let server;

async function start() {
  try {
    await verifyConnectivity();
    console.log("[db] Connected to CognoDB Cloud successfully.");
  } catch (error) {
    console.error("[db] Failed to connect to CognoDB Cloud:", error.message);
    console.error("[db] Server is starting anyway; requests will fail until the database is reachable.");
  }

  server = app.listen(PORT, () => {
    console.log(`[server] CineGraph API listening on port ${PORT}`);
  });
}

async function shutdown(signal) {
  console.log(`\n[server] Received ${signal}. Shutting down gracefully...`);

  if (server) {
    await new Promise((resolve) => server.close(resolve));
    console.log("[server] HTTP server closed.");
  }

  await closeDriver();
  console.log("[db] CognoDB driver connection closed.");
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  console.error("[fatal] Unhandled promise rejection:", reason);
});

start();
