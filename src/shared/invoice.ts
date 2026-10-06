// Developer: Ahsan Mahmood | https://aoneahsan.com
export type InvoiceStatus =
  "processing" | "needs_review" | "approved" | "rejected";

export interface Invoice {
  id: string;
  vendor: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  description: string;
  amountCents: number;
  currency: "USD";
  status: InvoiceStatus;
  duplicateOf: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  error: { code: string; message: string };
}
