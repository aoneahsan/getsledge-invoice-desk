// Developer: Ahsan Mahmood | https://aoneahsan.com
import express, { type Express } from "express";
import type Database from "better-sqlite3";
import { getInvoice, listInvoices, updateInvoiceStatus } from "./db.js";

export function createApp(db: Database.Database): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));

  app.get("/api/invoices", (_request, response) => {
    response.json({ invoices: listInvoices(db) });
  });

  app.get("/api/invoices/:id", (request, response) => {
    const invoice = getInvoice(db, String(request.params.id));
    if (!invoice) {
      response
        .status(404)
        .json({ error: { code: "NOT_FOUND", message: "Invoice not found." } });
      return;
    }
    response.json({ invoice });
  });

  app.patch("/api/invoices/:id/status", (request, response) => {
    const status = request.body?.status;
    if (status !== "approved" && status !== "rejected") {
      response.status(400).json({
        error: {
          code: "INVALID_STATUS",
          message: "Status must be approved or rejected.",
        },
      });
      return;
    }
    const id = String(request.params.id);
    const invoice = updateInvoiceStatus(db, id, status);
    if (invoice) {
      response.json({ invoice });
      return;
    }
    const existing = getInvoice(db, id);
    response.status(existing ? 409 : 404).json({
      error: existing
        ? {
            code: "INVALID_TRANSITION",
            message:
              "Only invoices needing review can be approved or rejected.",
          }
        : { code: "NOT_FOUND", message: "Invoice not found." },
    });
  });

  app.use("/api", (_request, response) => {
    response
      .status(404)
      .json({ error: { code: "NOT_FOUND", message: "API route not found." } });
  });

  app.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
      if (error instanceof SyntaxError && "body" in error) {
        response.status(400).json({
          error: {
            code: "INVALID_JSON",
            message: "Request body must be valid JSON.",
          },
        });
        return;
      }
      if (
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        error.status === 413
      ) {
        response.status(413).json({
          error: {
            code: "BODY_TOO_LARGE",
            message: "Request body is too large.",
          },
        });
        return;
      }
      response.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Something went wrong." },
      });
    },
  );

  return app;
}
