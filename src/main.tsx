import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// เตรียม element root สำหรับสลับธีม
const rootElement = document.documentElement;
// ดึงธีมจาก localStorage ถ้ามี
const storedTheme = localStorage.getItem("theme");
// ตรวจสอบว่าระบบชอบโหมดมืดหรือไม่
const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
// เลือกธีมเริ่มต้นจากค่าที่จำไว้ หรือค่าที่ระบบชอบ
const initialTheme =
  storedTheme === "light" || storedTheme === "dark"
    ? storedTheme
    : prefersDark
      ? "dark"
      : "light";

// ใส่/ลบ class dark ให้ document ตามธีมเริ่มต้น
if (initialTheme === "dark") {
  rootElement.classList.add("dark");
} else {
  rootElement.classList.remove("dark");
}

// สร้าง React root แล้วเรนเดอร์ App
createRoot(document.getElementById("root")!).render(<App />);
