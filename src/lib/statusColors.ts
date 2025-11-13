const baseClasses = {
  success:
    "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow ring-1 ring-emerald-400/30",
  warning:
    "bg-gradient-to-r from-amber-400 to-orange-400 text-slate-900 shadow ring-1 ring-amber-500/40",
  danger:
    "bg-gradient-to-r from-rose-500 to-red-500 text-white shadow ring-1 ring-rose-500/40",
  neutral: "bg-muted text-foreground/80",
};

const dangerStatuses = new Set(["cancelled", "canceled", "no_show", "failed", "rejected"]);
const successStatuses = new Set([
  "confirmed",
  "completed",
  "seated",
  "ready",
  "served",
  "paid",
  "verified",
  "success",
]);

export const getStatusBadgeClass = (status?: string) => {
  if (!status) {
    return baseClasses.neutral;
  }
  const normalized = status.toLowerCase();
  if (dangerStatuses.has(normalized)) {
    return baseClasses.danger;
  }
  if (successStatuses.has(normalized)) {
    return baseClasses.success;
  }
  return baseClasses.warning;
};
