import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// รวมคลาส Tailwind ที่ซ้ำกันให้เหลือเวอร์ชันล่าสุด
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
