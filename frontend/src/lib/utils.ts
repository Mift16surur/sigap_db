/**
 * SIGAP Frontend Utilities & Classname helper
 */
export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatDateTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return isoString;
  }
}

