"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/http";
import { Spinner } from "@/components/ui/spinner";
import { navigateAfterAuth } from "@/lib/auth/navigate-after-auth";
import { useAuth } from "@/contexts/auth-context";

type Step = "email" | "code";
type AuthMode = "otp" | "password";

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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const afterLoginPath = safeInternalPath(
    searchParams.get("next") ?? searchParams.get("redirect"),
  );
  const {
    ready,
    status,
    requestOtp,
    verifyOtp,
    loginWithPassword,
    user,
  } = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode>("otp");
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skipNextAuthRedirect = useRef(false);

  useEffect(() => {
    if (!ready || status !== "authenticated" || !user) return;
    if (skipNextAuthRedirect.current) {
      skipNextAuthRedirect.current = false;
      return;
    }
    navigateAfterAuth(router, afterLoginPath);
  }, [ready, status, user, router, afterLoginPath]);

  async function onRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await requestOtp(email);
      setStep("code");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await verifyOtp(email, code);
      skipNextAuthRedirect.current = true;
      navigateAfterAuth(router, afterLoginPath);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function onPasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await loginWithPassword(email, password);
      skipNextAuthRedirect.current = true;
      navigateAfterAuth(router, afterLoginPath);
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
            Operate every client project from discovery to payment in one workspace.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
            Milestones, reviews, approvals, and billing gates—aligned with your team’s workflow.
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

          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in</h1>
            <p className="mt-2 text-sm text-slate-600">
              {authMode === "otp"
                ? "Use a one-time code sent to your email, or switch to password."
                : "Sign in with the password you chose at registration."}
            </p>
          </div>

          <div className="mb-6 flex rounded-lg border border-slate-200 bg-slate-100/80 p-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode("otp");
                setError(null);
              }}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                authMode === "otp"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Email code
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("password");
                setError(null);
                setStep("email");
              }}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                authMode === "password"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Password
            </button>
          </div>

          <div className="card-elevated p-8">
            {authMode === "password" ? (
              <form onSubmit={onPasswordLogin} className="space-y-5">
                <div>
                  <label
                    htmlFor="pw-email"
                    className="mb-1.5 block text-sm font-medium text-slate-800"
                  >
                    Email
                  </label>
                  <input
                    id="pw-email"
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
                  <label
                    htmlFor="pw-password"
                    className="mb-1.5 block text-sm font-medium text-slate-800"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="pw-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
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
                </div>
                {error ? (
                  <p className="text-sm text-[var(--color-danger)]" role="alert">
                    {error}
                  </p>
                ) : null}
                <button type="submit" disabled={pending} className="btn-primary w-full">
                  {pending ? "Signing in…" : "Sign in"}
                </button>
              </form>
            ) : step === "email" ? (
              <form onSubmit={onRequestOtp} className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-medium text-slate-800"
                  >
                    Work email
                  </label>
                  <input
                    id="email"
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
                {error ? (
                  <p className="text-sm text-[var(--color-danger)]" role="alert">
                    {error}
                  </p>
                ) : null}
                <button type="submit" disabled={pending} className="btn-primary w-full">
                  {pending ? "Sending code…" : "Send verification code"}
                </button>
              </form>
            ) : (
              <form onSubmit={onVerify} className="space-y-5">
                <div>
                  <label
                    htmlFor="code"
                    className="mb-1.5 block text-sm font-medium text-slate-800"
                  >
                    Verification code
                  </label>
                  <input
                    id="code"
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={code}
                    onChange={(ev) => setCode(ev.target.value.replace(/\D/g, ""))}
                    className="input-field text-center font-mono text-lg tracking-[0.35em]"
                    placeholder="••••••"
                  />
                </div>
                {error ? (
                  <p className="text-sm text-[var(--color-danger)]" role="alert">
                    {error}
                  </p>
                ) : null}
                <div className="flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={pending || code.length !== 6}
                    className="btn-primary w-full"
                  >
                    {pending ? "Signing in…" : "Verify and sign in"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setCode("");
                      setError(null);
                    }}
                    className="text-sm font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
                  >
                    Use a different email
                  </button>
                </div>
              </form>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-slate-600">
            No account?{" "}
            <Link
              href={afterLoginPath !== "/dashboard" ? `/register?next=${encodeURIComponent(afterLoginPath)}` : "/register"}
              className="font-medium text-slate-900 underline-offset-2 hover:underline"
            >
              Create one
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-slate-500">
            Protected access. Contact your administrator if you need an account.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full flex-1 items-center justify-center bg-[var(--color-canvas)]">
          <Spinner />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
