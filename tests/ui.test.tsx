// @vitest-environment jsdom
// Developer: Ahsan Mahmood | https://aoneahsan.com
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Invoice } from "../src/shared/invoice";
import { App } from "../src/client/App";

let invoices: Invoice[];
const invoice = (
  id: string,
  status: Invoice["status"],
  duplicateOf: string | null = null,
): Invoice => ({
  id,
  vendor: id === "inv-2" ? "Northline Steel" : "Cedar Electric",
  invoiceNumber: id === "inv-2" ? "NS-2408" : "CE-1842",
  issueDate: "2026-09-25",
  dueDate: "2026-10-24",
  description: "Materials",
  amountCents: 842550,
  currency: "USD",
  status,
  duplicateOf,
  createdAt: "2026-10-06T00:00:00.000Z",
  updatedAt: "2026-10-06T00:00:00.000Z",
});

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  invoices = [
    invoice("inv-1", "approved"),
    invoice("inv-2", "needs_review", "inv-1"),
    invoice("inv-3", "processing"),
  ];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, options?: RequestInit) => {
      const path = String(input);
      let body: unknown;
      if (path === "/api/invoices") body = { invoices };
      else {
        const id = path.split("/")[3];
        const found = invoices.find((item) => item.id === id);
        if (options?.method === "PATCH" && found)
          found.status = JSON.parse(String(options.body)).status;
        body = { invoice: found };
      }
      return { ok: true, json: async () => body };
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("shows the duplicate, saves an approval, and moves it to the decided tab", async () => {
  const user = userEvent.setup();
  render(<App />);
  expect(
    await screen.findByRole("button", { name: "Approve invoice" }),
  ).toBeTruthy();
  expect(screen.getAllByText("Possible duplicate").length).toBeGreaterThan(0);
  await user.click(screen.getByRole("button", { name: "Approve invoice" }));
  expect(await screen.findByText("This decision is final.")).toBeTruthy();
  expect(invoices.find((item) => item.id === "inv-2")?.status).toBe("approved");
  expect(window.location.search).toContain("tab=decided");
});

it("keeps Processing read-only", async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole("button", { name: "Approve invoice" });
  await user.click(screen.getByRole("tab", { name: /Processing/ }));
  await waitFor(() =>
    expect(screen.getByText("This invoice is still processing.")).toBeTruthy(),
  );
  expect(screen.queryByRole("button", { name: "Approve invoice" })).toBeNull();
});
