// เก็บคลาสพื้นหลังแบบไล่สีสำหรับสถานะสำคัญ
const gradientClasses = {
  success:
    "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow ring-1 ring-emerald-400/30",
  warning:
    "bg-gradient-to-r from-amber-400 to-orange-400 text-slate-900 shadow ring-1 ring-amber-500/40",
  danger:
    "bg-gradient-to-r from-rose-500 to-red-500 text-white shadow ring-1 ring-rose-500/40",
  neutral: "bg-muted text-foreground/80",
};

// เก็บคลาสพื้นหลังแบบเรียบใช้กับ badge ธรรมดา
const flatClasses = {
  success: "bg-emerald-500 text-white border border-emerald-200 shadow-sm",
  warning: "bg-amber-500 text-white border border-amber-200 shadow-sm",
  danger: "bg-red-500 text-white border border-red-200 shadow-sm",
  neutral: "bg-slate-100 text-slate-900 border border-slate-200 shadow-sm",
};

// danger set
const dangerStatuses = new Set(["cancelled", "canceled", "no_show", "failed", "rejected", "voided"]);
// success set
const successStatuses = new Set([
  "confirmed",
  "completed",
  "complete",
  "seated",
  "ready",
  "served",
  "paid",
  "verified",
  "success",
  "active",
]);
// warning set
const warningStatuses = new Set([
  "pending",
  "preparing",
  "in_progress",
  "processing",
  "queued",
  "holding",
  "open",
  "awaiting",
]);

// คืนคลาส badge แบบไล่สีให้ใช้ในจุดที่เน้นสถานะสำคัญ
export const getStatusBadgeClass = (status?: string) => {
  if (!status) {
    return gradientClasses.neutral;
  }
  const normalized = status.toLowerCase();
  if (dangerStatuses.has(normalized)) {
    return gradientClasses.danger;
  }
  if (successStatuses.has(normalized)) {
    return gradientClasses.success;
  }
  return gradientClasses.warning;
};

// คืนคลาส badge แบบพื้นเรียบให้ใช้ในจุดที่ต้องการสีเรียบง่าย
export const getFlatStatusBadgeClass = (status?: string | null) => {
  if (!status) {
    return flatClasses.neutral;
  }
  const normalized = status.toLowerCase();
  if (dangerStatuses.has(normalized)) {
    return flatClasses.danger;
  }
  if (successStatuses.has(normalized)) {
    return flatClasses.success;
  }
  if (warningStatuses.has(normalized)) {
    return flatClasses.warning;
  }
  return flatClasses.neutral;
};

// คลาสพื้นฐานที่ใช้ร่วมทุก badge ให้มีขนาดพอดี
export const statusBadgeBase = "min-w-[120px] justify-center text-center px-3";
