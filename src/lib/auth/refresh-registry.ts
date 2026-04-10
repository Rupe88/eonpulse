/**
 * Lets the API client call back into AuthProvider to refresh tokens on 401.
 */
export type RefreshHandler = () => Promise<boolean>;

let handler: RefreshHandler | null = null;

export function registerRefreshHandler(fn: RefreshHandler | null): void {
  handler = fn;
}

export function getRefreshHandler(): RefreshHandler | null {
  return handler;
}
