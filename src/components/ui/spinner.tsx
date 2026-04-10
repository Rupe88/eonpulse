export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900 ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
