"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/http";
import { Spinner } from "@/components/ui/spinner";
import { navigateAfterAuth } from "@/lib/auth/navigate-after-auth";
import { useAuth } from "@/contexts/auth-context";

function EyeOpenIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12Z" />
      <circle cx="12" cy="12" r="3.25" />
    </svg>
  );
}

function EyeClosedIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.6 5.43A10.86 10.86 0 0 1 12 5.25C18 5.25 21.75 12 21.75 12a20.6 20.6 0 0 1-3.53 4.57M14.12 14.12a3 3 0 0 1-4.24-4.24M6.05 6.05A20.94 20.94 0 0 0 2.25 12S6 18.75 12 18.75c1.54 0 2.94-.45 4.2-1.17" />
    </svg>
  );
}

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

function safeInternalPath(raw: string | null): string {
  if (raw == null || typeof raw !== "string") return "/dashboard";
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return "/dashboard";
  return t;
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const afterRegisterPath = safeInternalPath(
    searchParams.get("next") ?? searchParams.get("redirect"),
  );
  const { ready, status, registerWithPassword, user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Skip duplicate redirect when navigation was already triggered from the submit handler. */
  const skipNextAuthRedirect = useRef(false);

  useEffect(() => {
    if (!ready || status !== "authenticated" || !user) return;
    if (skipNextAuthRedirect.current) {
      skipNextAuthRedirect.current = false;
      return;
    }
    navigateAfterAuth(router, afterRegisterPath);
  }, [ready, status, user, router, afterRegisterPath]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setPending(true);
    try {
      await registerWithPassword(email, password, name.trim() || undefined);
      skipNextAuthRedirect.current = true;
      navigateAfterAuth(router, afterRegisterPath);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center bg-[var(--color-canvas)]">
        <Spinner />
      </div>
    );
  }

  if (status === "authenticated" && user) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-3 bg-[var(--color-canvas)] px-4">
        <Spinner />
        <p className="text-sm text-slate-600">Taking you to your workspace…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1">
      <div className="relative hidden w-[42%] min-w-[320px] flex-col justify-between overflow-hidden bg-slate-900 p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.12), transparent 45%), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.08), transparent 40%)",
          }}
        />
        <div className="relative">
          <div>
            <p className="text-sm font-semibold tracking-tight">Eonpulse</p>
            <p className="text-xs text-slate-400">Project delivery workspace</p>
          </div>
          <h2 className="mt-14 max-w-sm text-2xl font-semibold leading-snug tracking-tight">
            Create your workspace account with email and password.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
            You can still sign in with a one-time code anytime from the sign-in page.
          </p>
        </div>
        <p className="relative text-xs text-slate-500">
          © {new Date().getFullYear()} Eonpulse. Internal workspace.
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center bg-[var(--color-canvas)] px-4 py-12 sm:px-8">
        <div className="w-full max-w-[400px]">
          <div className="mb-10 lg:hidden">
            <span className="text-sm font-semibold tracking-tight text-slate-900">Eonpulse</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Create account</h1>
            <p className="mt-2 text-sm text-slate-600">
              New accounts default to the worker role. Your administrator can change roles as needed.
            </p>
          </div>

          <div className="card-elevated p-8">
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label htmlFor="reg-name" className="mb-1.5 block text-sm font-medium text-slate-800">
                  Name <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <input
                  id="reg-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                  className="input-field"
                  placeholder="Alex Kim"
                />
              </div>
              <div>
                <label htmlFor="reg-email" className="mb-1.5 block text-sm font-medium text-slate-800">
                  Email
                </label>
                <input
                  id="reg-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  className="input-field"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label htmlFor="reg-password" className="mb-1.5 block text-sm font-medium text-slate-800">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    className="input-field pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 transition hover:text-slate-800"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeClosedIcon className="h-5 w-5" />
                    ) : (
                      <EyeOpenIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>
              </div>
              <div>
                <label htmlFor="reg-confirm" className="mb-1.5 block text-sm font-medium text-slate-800">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="reg-confirm"
                    name="confirm"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(ev) => setConfirm(ev.target.value)}
                    className="input-field pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 transition hover:text-slate-800"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    title={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? (
                      <EyeClosedIcon className="h-5 w-5" />
                    ) : (
                      <EyeOpenIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              {error ? (
                <p className="text-sm text-[var(--color-danger)]" role="alert">
                  {error}
                </p>
              ) : null}
              <button type="submit" disabled={pending} className="btn-primary w-full">
                {pending ? "Creating account…" : "Create account"}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link
              href={
                afterRegisterPath !== "/dashboard"
                  ? `/login?next=${encodeURIComponent(afterRegisterPath)}`
                  : "/login"
              }
              className="font-medium text-slate-900 underline-offset-2 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full flex-1 items-center justify-center bg-[var(--color-canvas)]">
          <Spinner />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
