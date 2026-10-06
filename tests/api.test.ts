// Developer: Ahsan Mahmood | https://aoneahsan.com
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type Database from "better-sqlite3";
import { createApp } from "../src/server/app.js";
import { getInvoice, listInvoices, openDatabase } from "../src/server/db.js";

describe("invoice API", () => {
  let directory: string;
  let filePath: string;
  let db: Database.Database;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "sledge-invoices-"));
    filePath = join(directory, "invoices.sqlite");
    db = openDatabase(filePath);
  });

  afterEach(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it("seeds five invoices once and identifies one duplicate", () => {
    expect(listInvoices(db)).toHaveLength(5);
    const duplicate = listInvoices(db).filter((invoice) => invoice.duplicateOf);
    expect(duplicate).toHaveLength(1);
    expect(duplicate[0]?.duplicateOf).toBe("inv-1001");
    db.close();
    db = openDatabase(filePath);
    expect(listInvoices(db)).toHaveLength(5);
  });

  it("lists and gets invoices", async () => {
    const app = createApp(db);
    const list = await request(app).get("/api/invoices").expect(200);
    expect(list.body.invoices).toHaveLength(5);
    expect(list.body.invoices[0].id).toBe("inv-1002");
    const detail = await request(app).get("/api/invoices/inv-1002").expect(200);
    expect(detail.body.invoice.duplicateOf).toBe("inv-1001");
    await request(app)
      .get("/api/invoices/unknown")
      .expect(404, {
        error: { code: "NOT_FOUND", message: "Invoice not found." },
      });
  });

  it("persists an approval through a database reopen and rejects a second decision", async () => {
    const app = createApp(db);
    const approved = await request(app)
      .patch("/api/invoices/inv-1003/status")
      .send({ status: "approved" })
      .expect(200);
    expect(approved.body.invoice.status).toBe("approved");
    await request(app)
      .patch("/api/invoices/inv-1003/status")
      .send({ status: "rejected" })
      .expect(409);
    db.close();
    db = openDatabase(filePath);
    expect(getInvoice(db, "inv-1003")?.status).toBe("approved");
    expect(listInvoices(db)).toHaveLength(5);
  });

  it("rejects invalid input, processing decisions, and missing invoices", async () => {
    const app = createApp(db);
    await request(app)
      .patch("/api/invoices/inv-1003/status")
      .send({ status: "processing" })
      .expect(400);
    await request(app)
      .patch("/api/invoices/inv-1003/status")
      .set("Content-Type", "application/json")
      .send("{bad")
      .expect(400);
    await request(app)
      .patch("/api/invoices/inv-1004/status")
      .send({ status: "approved" })
      .expect(409);
    await request(app)
      .patch("/api/invoices/missing/status")
      .send({ status: "approved" })
      .expect(404);
  });
});
