import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.documentElement;
const storedTheme = localStorage.getItem("theme");
const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
const initialTheme =
  storedTheme === "light" || storedTheme === "dark"
    ? storedTheme
    : prefersDark
      ? "dark"
      : "light";

if (initialTheme === "dark") {
  rootElement.classList.add("dark");
} else {
  rootElement.classList.remove("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
