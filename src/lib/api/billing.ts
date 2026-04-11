/**
 * Shared billing API — project members (including client owners) can list invoices and submit payments.
 * Admin-only operations remain in `billing-admin.ts`.
 */
export {
  submitPayment,
  listInvoices,
  listPayments,
  type InvoiceItem,
  type PaymentItem,
} from "./billing-admin";
