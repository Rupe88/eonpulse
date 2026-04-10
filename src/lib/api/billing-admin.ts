import { apiGet, apiPatch, apiPost } from "./client";

export type InvoiceItem = {
  id: string;
  milestoneId: string;
  amount: string;
  dueAt: string;
  state: string;
  invoiceNumber: string;
  issuedAt: string;
};

export type PaymentItem = {
  id: string;
  milestoneId: string;
  invoiceId: string | null;
  amount: string;
  state: string;
  transactionRef: string | null;
  note: string | null;
  createdAt: string;
};

export function listInvoices(accessToken: string, projectId: string, milestoneId?: string) {
  const sp = new URLSearchParams({ projectId });
  if (milestoneId) sp.set("milestoneId", milestoneId);
  return apiGet<InvoiceItem[]>(`/billing/invoices?${sp.toString()}`, accessToken);
}

export function listPayments(accessToken: string, projectId: string, state?: string) {
  const sp = new URLSearchParams({ projectId });
  if (state) sp.set("state", state);
  return apiGet<PaymentItem[]>(`/billing/payments?${sp.toString()}`, accessToken);
}

export function issueInvoice(
  accessToken: string,
  milestoneId: string,
  body: { amount?: number; paymentDueDays?: number; note?: string } = {},
) {
  return apiPost<InvoiceItem>(
    `/billing/milestones/${encodeURIComponent(milestoneId)}/invoice`,
    accessToken,
    body,
  );
}

export function submitPayment(
  accessToken: string,
  invoiceId: string,
  body: { amount: number; transactionRef?: string; note?: string },
) {
  return apiPost<PaymentItem>(
    `/billing/invoices/${encodeURIComponent(invoiceId)}/payments`,
    accessToken,
    body,
  );
}

export function verifyPayment(
  accessToken: string,
  paymentId: string,
  body: { transactionRef?: string; note?: string } = {},
) {
  return apiPost<PaymentItem>(
    `/billing/payments/${encodeURIComponent(paymentId)}/verify`,
    accessToken,
    body,
  );
}

export function rejectPayment(
  accessToken: string,
  paymentId: string,
  body: { note?: string } = {},
) {
  return apiPatch<PaymentItem>(
    `/billing/payments/${encodeURIComponent(paymentId)}/reject`,
    accessToken,
    body,
  );
}

export function getOverdueSummary(accessToken: string, projectId: string) {
  const sp = new URLSearchParams({ projectId });
  return apiGet<{
    overdueCount: number;
    pendingReminderCount: number;
    overdueInvoices: InvoiceItem[];
    pendingReminders: Array<{
      id: string;
      scheduledAt: string;
      invoice: { id: string; invoiceNumber: string; dueAt: string; amount: string };
    }>;
  }>(`/billing/overdue?${sp.toString()}`, accessToken);
}
