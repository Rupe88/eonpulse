/** Human-readable task state for tables */
export function taskStateLabel(state: string): string {
  return state.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
