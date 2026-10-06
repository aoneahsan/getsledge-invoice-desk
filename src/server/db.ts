// Developer: Ahsan Mahmood | https://aoneahsan.com
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Invoice, InvoiceStatus } from "../shared/invoice.js";

interface InvoiceRow {
  id: string;
  vendor: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  description: string;
  amount_cents: number;
  currency: "USD";
  status: InvoiceStatus;
  duplicate_of: string | null;
  created_at: string;
  updated_at: string;
}

const seedInvoices = [
  [
    "inv-1001",
    "Northline Steel",
    "NS-2408",
    "2026-09-24",
    "2026-10-24",
    "Structural steel delivery",
    842550,
    "USD",
    "approved",
    null,
  ],
  [
    "inv-1002",
    "Northline Steel",
    "NS-2408",
    "2026-09-25",
    "2026-10-24",
    "Structural steel delivery",
    842550,
    "USD",
    "needs_review",
    "inv-1001",
  ],
  [
    "inv-1003",
    "Cedar Electric",
    "CE-1842",
    "2026-09-23",
    "2026-10-23",
    "Electrical rough-in materials",
    316400,
    "USD",
    "needs_review",
    null,
  ],
  [
    "inv-1004",
    "Atlas Concrete",
    "AC-5901",
    "2026-09-21",
    "2026-10-21",
    "Foundation concrete",
    1250000,
    "USD",
    "processing",
    null,
  ],
  [
    "inv-1005",
    "Harbor Plumbing",
    "HP-7712",
    "2026-09-18",
    "2026-10-18",
    "Pipe fittings",
    189775,
    "USD",
    "rejected",
    null,
  ],
] as const;

function toInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    vendor: row.vendor,
    invoiceNumber: row.invoice_number,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    description: row.description,
    amountCents: row.amount_cents,
    currency: row.currency,
    status: row.status,
    duplicateOf: row.duplicate_of,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function openDatabase(
  filePath = resolve("data/invoices.sqlite"),
): Database.Database {
  if (filePath !== ":memory:") {
    mkdirSync(dirname(filePath), { recursive: true });
  }
  const db = new Database(filePath);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      vendor TEXT NOT NULL,
      invoice_number TEXT NOT NULL,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      description TEXT NOT NULL,
      amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
      currency TEXT NOT NULL CHECK (currency = 'USD'),
      status TEXT NOT NULL CHECK (status IN ('processing', 'needs_review', 'approved', 'rejected')),
      duplicate_of TEXT REFERENCES invoices(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date DESC);
  `);

  const count = db.prepare("SELECT COUNT(*) AS count FROM invoices").get() as {
    count: number;
  };
  if (count.count === 0) {
    const now = new Date().toISOString();
    const insert = db.prepare(`INSERT INTO invoices
      (id, vendor, invoice_number, issue_date, due_date, description, amount_cents, currency, status, duplicate_of, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    db.transaction(() => {
      for (const invoice of seedInvoices) insert.run(...invoice, now, now);
    })();
  }
  return db;
}

export function listInvoices(db: Database.Database): Invoice[] {
  const rows = db
    .prepare("SELECT * FROM invoices ORDER BY issue_date DESC, id DESC")
    .all() as InvoiceRow[];
  return rows.map(toInvoice);
}

export function getInvoice(db: Database.Database, id: string): Invoice | null {
  const row = db.prepare("SELECT * FROM invoices WHERE id = ?").get(id) as
    InvoiceRow | undefined;
  return row ? toInvoice(row) : null;
}

export function updateInvoiceStatus(
  db: Database.Database,
  id: string,
  status: "approved" | "rejected",
): Invoice | null {
  const updatedAt = new Date().toISOString();
  const result = db
    .prepare(
      `UPDATE invoices SET status = ?, updated_at = ?
    WHERE id = ? AND status = 'needs_review'`,
    )
    .run(status, updatedAt, id);
  return result.changes === 1 ? getInvoice(db, id) : null;
}
