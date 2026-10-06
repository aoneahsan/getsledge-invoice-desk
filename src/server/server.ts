// Developer: Ahsan Mahmood | https://aoneahsan.com
import express from "express";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createApp } from "./app.js";
import { openDatabase } from "./db.js";

const db = openDatabase(
  process.env.DB_PATH ? resolve(process.env.DB_PATH) : undefined,
);
const app = createApp(db);
const clientDir = resolve("dist/client");

if (existsSync(clientDir)) {
  app.use(express.static(clientDir));
  app.get("/{*path}", (_request, response) =>
    response.sendFile(resolve(clientDir, "index.html")),
  );
}

const port = Number(process.env.PORT ?? 3001);
const server = app.listen(port, () => {
  console.log(`Invoice desk running on http://localhost:${port}`);
});

function shutdown(): void {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
