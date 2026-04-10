"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/http";
import { listMyProjects, type MyProjectRow } from "@/lib/api/workspace";
import {
  getOverdueSummary,
  issueInvoice,
  listInvoices,
  listPayments,
  rejectPayment,
  submitPayment,
  verifyPayment,
  type InvoiceItem,
  type PaymentItem,
} from "@/lib/api/billing-admin";

type Toast = { id: string; type: "success" | "error"; message: string };

function em(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

export function BillingPanel() {
  const { accessToken } = useAuth();
  const token = accessToken ?? "";
  const [projects, setProjects] = useState<MyProjectRow[]>([]);
  const [projectId, setProjectId] = useState("");
  const [milestoneId, setMilestoneId] = useState("");
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [stateFilter, setStateFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [amount, setAmount] = useState("");
  const [invoiceForPayment, setInvoiceForPayment] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [overdue, setOverdue] = useState<{ overdueCount: number; pendingReminderCount: number } | null>(null);

  const pushToast = (type: Toast["type"], message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((p) => [...p, { id, type, message }]);
    window.setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3200);
  };

  useEffect(() => {
    if (!token) return;
    void (async () => {
      const p = await listMyProjects(token);
      setProjects(p);
      setProjectId((prev) => prev || p[0]?.projectId || "");
    })();
  }, [token]);

  async function reload() {
    if (!token || !projectId) return;
    setLoading(true);
    try {
      const [i, p, o] = await Promise.all([
        listInvoices(token, projectId),
        listPayments(token, projectId, stateFilter || undefined),
        getOverdueSummary(token, projectId),
      ]);
      setInvoices(i);
      setPayments(p);
      setOverdue({ overdueCount: o.overdueCount, pendingReminderCount: o.pendingReminderCount });
    } catch (e) {
      pushToast("error", em(e));
    } finally {
      setLoading(false);
      setFirstLoadDone(true);
    }
  }

  useEffect(() => {
    void reload();
  }, [token, projectId, stateFilter]);

  const totalPages = Math.max(1, Math.ceil(payments.length / pageSize));
  const paged = useMemo(() => payments.slice((page - 1) * pageSize, page * pageSize), [payments, page, pageSize]);

  async function onIssueInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !milestoneId) return;
    try {
      await issueInvoice(token, milestoneId, {
        amount: amount ? Number(amount) : undefined,
      });
      pushToast("success", "Invoice issued");
      setMilestoneId("");
      setAmount("");
      await reload();
    } catch (e) {
      pushToast("error", em(e));
    }
  }

  async function onSubmitPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !invoiceForPayment || !paymentAmount) return;
    try {
      await submitPayment(token, invoiceForPayment, { amount: Number(paymentAmount) });
      pushToast("success", "Payment submitted");
      setInvoiceForPayment("");
      setPaymentAmount("");
      await reload();
    } catch (e) {
      pushToast("error", em(e));
    }
  }

  async function onVerify(id: string) {
    try {
      await verifyPayment(token, id);
      pushToast("success", "Payment verified");
      await reload();
    } catch (e) {
      pushToast("error", em(e));
    }
  }

  async function onReject(id: string) {
    try {
      await rejectPayment(token, id, { note: "Rejected from billing queue" });
      pushToast("success", "Payment rejected");
      await reload();
    } catch (e) {
      pushToast("error", em(e));
    }
  }

  return (
    <div className="space-y-6">
      <div className="fixed right-5 top-5 z-[80] space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className={`min-w-[260px] rounded-lg border px-4 py-3 text-sm shadow-lg ${t.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}>{t.message}</div>
        ))}
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="">Select project</option>
            {projects.map((p) => <option key={p.projectId} value={p.projectId}>{p.name} ({p.code})</option>)}
          </select>
          <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="">All payment states</option>
            <option value="VERIFICATION_PENDING">VERIFICATION_PENDING</option>
            <option value="PAID">PAID</option>
            <option value="AWAITING_PAYMENT">AWAITING_PAYMENT</option>
            <option value="FAILED_REJECTED">FAILED_REJECTED</option>
          </select>
          {overdue ? <p className="text-xs text-neutral-600">Overdue: {overdue.overdueCount} | Reminders due: {overdue.pendingReminderCount}</p> : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <form onSubmit={onIssueInvoice} className="rounded-lg border border-neutral-200 p-3 space-y-2">
            <h3 className="text-sm font-semibold">Issue invoice</h3>
            <input value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)} placeholder="Milestone ID" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (optional)" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            <button className="rounded-md border border-neutral-900 bg-neutral-900 px-3 py-2 text-xs font-semibold text-white">Issue invoice</button>
          </form>
          <form onSubmit={onSubmitPayment} className="rounded-lg border border-neutral-200 p-3 space-y-2">
            <h3 className="text-sm font-semibold">Submit payment</h3>
            <input value={invoiceForPayment} onChange={(e) => setInvoiceForPayment(e.target.value)} placeholder="Invoice ID" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            <input value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="Amount" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            <button className="rounded-md border border-neutral-900 bg-neutral-900 px-3 py-2 text-xs font-semibold text-white">Submit payment</button>
          </form>
        </div>

        {!firstLoadDone && loading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <>
            {loading ? <div className="flex items-center gap-2 text-sm text-neutral-600"><Spinner className="!h-4 !w-4 border-neutral-300 border-t-neutral-900" /> Loading billing data...</div> : null}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-2 py-2 font-semibold">Payment</th>
                    <th className="px-2 py-2 font-semibold">Invoice</th>
                    <th className="px-2 py-2 font-semibold">Amount</th>
                    <th className="px-2 py-2 font-semibold">State</th>
                    <th className="px-2 py-2 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {paged.map((p) => (
                    <tr key={p.id}>
                      <td className="px-2 py-2">{p.id.slice(0, 8)}...</td>
                      <td className="px-2 py-2">{p.invoiceId || "—"}</td>
                      <td className="px-2 py-2">{p.amount}</td>
                      <td className="px-2 py-2">{p.state}</td>
                      <td className="px-2 py-2 text-right">
                        <div className="inline-flex gap-2">
                          <button type="button" onClick={() => void onVerify(p.id)} className="rounded-md border border-neutral-900 bg-neutral-900 px-2.5 py-1.5 text-xs font-semibold text-white">Verify</button>
                          <button type="button" onClick={() => void onReject(p.id)} className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700">Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-xs text-neutral-600">
              <p>Invoices: {invoices.length} | Payments: {payments.length}</p>
              <div className="flex items-center gap-2">
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded-md border border-neutral-300 px-2 py-1">
                  <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option>
                </select>
                <button type="button" onClick={() => setPage((v) => Math.max(1, v - 1))} disabled={page <= 1} className="rounded-md border border-neutral-200 px-2 py-1">Prev</button>
                <span>Page {page}/{totalPages}</span>
                <button type="button" onClick={() => setPage((v) => Math.min(totalPages, v + 1))} disabled={page >= totalPages} className="rounded-md border border-neutral-200 px-2 py-1">Next</button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
