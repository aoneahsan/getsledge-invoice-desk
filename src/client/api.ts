// Developer: Ahsan Mahmood | https://aoneahsan.com
import type { ApiError, Invoice } from "../shared/invoice";

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  const body: unknown = await response.json();
  if (!response.ok) {
    const error = body as Partial<ApiError>;
    throw new Error(
      error.error?.message || `Request failed (${response.status}).`,
    );
  }
  return body as T;
}

export async function fetchInvoices(signal?: AbortSignal): Promise<Invoice[]> {
  const body = await requestJson<{ invoices: Invoice[] }>("/api/invoices", {
    signal,
  });
  return body.invoices;
}

export async function fetchInvoice(
  id: string,
  signal?: AbortSignal,
): Promise<Invoice> {
  const body = await requestJson<{ invoice: Invoice }>(
    `/api/invoices/${encodeURIComponent(id)}`,
    { signal },
  );
  return body.invoice;
}

export async function decideInvoice(
  id: string,
  status: "approved" | "rejected",
): Promise<Invoice> {
  const body = await requestJson<{ invoice: Invoice }>(
    `/api/invoices/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
  );
  return body.invoice;
}
