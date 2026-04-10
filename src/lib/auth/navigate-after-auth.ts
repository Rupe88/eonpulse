/**
 * Client-side navigation after login/register. `router.replace` alone can occasionally
 * fail to leave auth routes in the App Router; we fall back to a full navigation.
 */
export function navigateAfterAuth(router: { replace: (href: string) => void }, path: string): void {
  const dest = path.startsWith("/") ? path : `/${path}`;
  router.replace(dest);
  window.setTimeout(() => {
    if (typeof window === "undefined") return;
    const here = window.location.pathname;
    if (here === "/login" || here === "/register") {
      window.location.assign(dest);
    }
  }, 400);
}

/**
 * When redirecting to login from a protected route, `replace` can stall; fall back to full navigation.
 * `ifPathStartsWith` is the route you are trying to leave (e.g. `/admin`).
 */
export function replaceOrHardNavigate(
  router: { replace: (href: string) => void },
  href: string,
  ifPathStartsWith: string,
): void {
  router.replace(href);
  window.setTimeout(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname.startsWith(ifPathStartsWith)) {
      window.location.assign(href);
    }
  }, 400);
}
