import { toast } from "sonner";

// URL เริ่มต้นถัาไม่ได้ตั้งค่า .env
const DEFAULT_BASE_URL = "";

// สร้าง base URL จาก env แล้วตัด / ท้ายสุดออก
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL as string | undefined
)?.replace(/\/+$/, "") ?? DEFAULT_BASE_URL;

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

type ApiError = Error & { status?: number; payload?: unknown };

// คีย์เก็บ token / user ใน localStorage
const TOKEN_STORAGE_KEY = "hangout.auth.token";
const USER_STORAGE_KEY = "hangout.auth.user";

export const authStorage = {
  // จัดการ token ใน localStorage
  getToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  },
  setToken(token: string) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  },
  clearToken() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  },
  getUser(): any | null {
    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setUser(user: unknown) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  },
  clearUser() {
    localStorage.removeItem(USER_STORAGE_KEY);
  },
  clearAll() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  },
};

// สร้าง URL พร้อม base
const buildUrl = (path: string) => {
  const sanitizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${sanitizedPath}`;
};

// ฟังก์ชันหลักสำหรับเรียก API
export async function apiRequest<T>(
  path: string,
  { method = "GET", body, auth = false, headers = {}, signal }: RequestOptions = {},
): Promise<T> {
  const fetchHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (auth) {
    const token = authStorage.getToken();
    if (token) {
      fetchHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers: fetchHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  const contentType = response.headers.get("Content-Type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const error: ApiError = new Error(
      (payload && (payload.message || payload.error)) ||
        `Request failed with status ${response.status}`,
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload as T;
}

// helper แสดง error แบบ Toast
export function handleApiError(error: unknown, fallback = "Something went wrong") {
  if (error instanceof Error && "status" in error) {
    const message = (error as ApiError).payload && typeof (error as ApiError).payload === "object"
      ? ((error as ApiError).payload as any).message
      : error.message;
    toast.error(message ?? fallback);
    return;
  }

  if (error instanceof Error) {
    toast.error(error.message || fallback);
    return;
  }

  toast.error(fallback);
}

export const api = {
  // --- Auth (ล็อกอิน/สมัคร/ดึงข้อมูลตนเอง) ---
  login: (credentials: { email: string; password: string }) =>
    apiRequest<{ token: string; user: any }>("/api/auth/login", {
      method: "POST",
      body: credentials,
    }),
  register: (payload: { fname: string; lname?: string; email: string; password: string; phone?: string }) =>
    apiRequest<{ token: string; user: any }>("/api/auth/register", {
      method: "POST",
      body: payload,
    }),
  me: () =>
    apiRequest<{ user: any }>("/api/auth/me", {
      auth: true,
    }),
  // --- Event & เมนู (ฝั่งลูกค้า/แอดมิน) ---
  getEvents: (options?: { activeOnly?: boolean; signal?: AbortSignal }) => {
    const query = options?.activeOnly ? "?active=1" : "";
    return apiRequest<{ events: any[] }>(`/api/events${query}`, { signal: options?.signal });
  },
  getMenuItems: (signal?: AbortSignal) =>
    apiRequest<{ items: any[] }>("/api/menu-items", { signal }),
  getEvent: (id: number, signal?: AbortSignal) =>
    apiRequest<{ event: any }>(`/api/events/${id}`, { signal }),
  orderMenu: (payload: { items: any[]; table_id?: number | null; note?: string }) =>
    apiRequest<{ order: any }>("/api/menu-orders", {
      method: "POST",
      body: payload,
      auth: true,
    }),
  createEvent: (payload: any) =>
    apiRequest<{ event: any }>("/api/events", {
      method: "POST",
      body: payload,
      auth: true,
    }),
  updateEvent: (id: number, payload: any) =>
    apiRequest<{ event: any }>(`/api/events/${id}`, {
      method: "PUT",
      body: payload,
      auth: true,
    }),
  updateEventStatus: (id: number, status: string) =>
    apiRequest<{ event: any }>(`/api/events/${id}/status`, {
      method: "PATCH",
      body: { status },
      auth: true,
    }),
  deleteEvent: (id: number) =>
    apiRequest<{ message?: string }>(`/api/events/${id}`, {
      method: "DELETE",
      auth: true,
    }),
  // --- สั่งซื้อบัตรเข้าร่วมงาน ---
  orderTickets: (eventId: number, payload: { quantity: number; price: number; reservation: any }) =>
    apiRequest<{ order: any }>(`/api/events/${eventId}/orders`, {
      method: "POST",
      body: payload,
      auth: true,
    }),
  createMenuItem: (payload: any) =>
    apiRequest<{ item: any }>("/api/menu-items", {
      method: "POST",
      body: payload,
      auth: true,
    }),
  updateMenuItem: (id: number, payload: any) =>
    apiRequest<{ item: any }>(`/api/menu-items/${id}`, {
      method: "PUT",
      body: payload,
      auth: true,
    }),
  deleteMenuItem: (id: number) =>
    apiRequest<{ message: string }>(`/api/menu-items/${id}`, {
      method: "DELETE",
      auth: true,
    }),
  // --- รายการคำสั่งซื้อบัตรสำหรับลูกค้า/สตาฟ ---
  getTicketOrders: (options: {
    mine?: boolean;
    status?: string;
    page?: number;
    perPage?: number;
    view?: "active" | "completed" | "all";
    query?: string;
    daysBack?: number;
    signal?: AbortSignal;
  } = {}) => {
    const params = new URLSearchParams();
    if (options.mine !== false) {
      params.set("mine", "1");
    }
    if (options.status) {
      params.set("status", options.status);
    }
    if (options.page && options.page > 1) {
      params.set("page", String(options.page));
    }
    if (options.perPage) {
      params.set("per_page", String(options.perPage));
    }
    if (options.view) {
      params.set("view", options.view);
    }
    if (options.query) {
      params.set("q", options.query);
    }
    if (options.daysBack) {
      params.set("days_back", String(options.daysBack));
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiRequest<{
      orders: any[];
      meta?: { total: number; page: number; per_page: number; last_page: number };
      stats?: Record<string, number>;
    }>(`/api/ticket-orders${query}`, {
      auth: true,
      signal: options.signal,
    });
  },
  updateTicketOrderStatus: (id: number, status: string) =>
    apiRequest<{ order: any }>(`/api/ticket-orders/${id}/status`, {
      method: "PATCH",
      body: { status },
      auth: true,
    }),
  confirmTicket: (id: number, code: string, note?: string) =>
    apiRequest<{ order: any }>(`/api/ticket-orders/${id}/confirm`, {
      method: "POST",
      body: { code, note },
      auth: true,
    }),
  confirmAllTickets: (id: number, note?: string) =>
    apiRequest<{ order: any }>(`/api/ticket-orders/${id}/confirm-all`, {
      method: "POST",
      body: note ? { note } : undefined,
      auth: true,
    }),
  // --- Dashboard แสดงสถิติสตาฟ/แอดมิน ---
  getStaffDashboard: () =>
    apiRequest<{ date: string; ticketsToday: number; reservationsToday: number; fnbOrdersToday: number; guestsToday: number }>(
      "/api/staff/dashboard",
      { auth: true },
    ),
  getAdminDashboard: () =>
    apiRequest<{ totalUsers: number; activeEvents: number; totalRevenue: number; staffCount: number; ticketRevenue?: number; fnbRevenue?: number }>(
      "/api/admin/dashboard",
      { auth: true },
    ),
  // --- การอัปโหลดรูป ---
  uploadImage: (dataUrl: string) =>
    apiRequest<{ url: string; path: string }>("/api/uploads", {
      method: "POST",
      body: { dataUrl },
      auth: true,
    }),
  // --- การจองโต๊ะ ---
  createReservation: (payload: { date: string; partySize: number; note?: string; event_id?: number }) =>
    apiRequest<{ reservation: any }>("/api/reservations", {
      method: "POST",
      body: payload,
      auth: true,
    }),
  getReservations: (options?: {
    mine?: boolean;
    eventId?: number;
    status?: string;
    page?: number;
    perPage?: number;
    view?: "active" | "completed" | "all";
    daysBack?: number;
    signal?: AbortSignal;
  }) => {
    const params = new URLSearchParams();
    if (options?.mine !== false) {
      params.set("mine", "1");
    }
    if (options?.eventId) {
      params.set("event_id", String(options.eventId));
    }
    if (options?.status) {
      params.set("status", options.status);
    }
    if (options?.page && options.page > 1) {
      params.set("page", String(options.page));
    }
    if (options?.perPage) {
      params.set("per_page", String(options.perPage));
    }
    if (options?.view) {
      params.set("view", options.view);
    }
    if (options?.daysBack) {
      params.set("days_back", String(options.daysBack));
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiRequest<{
      reservations: any[];
      meta?: { total: number; page: number; per_page: number; last_page: number };
      stats?: Record<string, number>;
    }>(`/api/reservations${query}`, {
      auth: true,
      signal: options?.signal,
    });
  },
  // --- โต๊ะและการจัดที่นั่ง ---
  getAvailableTables: (eventId: number, signal?: AbortSignal) =>
    apiRequest<{ tables: any[] }>(`/api/events/${eventId}/available-tables`, {
      auth: true,
      signal,
    }),
  updateReservationStatus: (id: number, status: string) =>
    apiRequest<{ reservation: any }>(`/api/reservations/${id}/status`, {
      method: "PATCH",
      body: { status },
      auth: true,
    }),
  assignReservationTable: (id: number, tableIds: number | number[]) =>
    apiRequest<{ reservation: any }>(`/api/reservations/${id}/assign-table`, {
      method: "POST",
      body: Array.isArray(tableIds) ? { table_ids: tableIds } : { table_id: tableIds },
      auth: true,
    }),
  getTables: (signal?: AbortSignal) =>
    apiRequest<{ tables: any[] }>("/api/tables", {
      auth: true,
      signal,
    }),
  // --- ออเดอร์อาหารและเครื่องดื่ม ---
  getFnbOrders: (options: {
    mine?: boolean;
    status?: string;
    page?: number;
    perPage?: number;
    view?: "active" | "completed" | "all";
    daysBack?: number;
    signal?: AbortSignal;
  } = {}) => {
    const params = new URLSearchParams();
    if (options.mine !== false) {
      params.set("mine", "1");
    }
    if (options.status) {
      params.set("status", options.status);
    }
    if (options.page && options.page > 1) {
      params.set("page", String(options.page));
    }
    if (options.perPage) {
      params.set("per_page", String(options.perPage));
    }
    if (options.view) {
      params.set("view", options.view);
    }
    if (options.daysBack) {
      params.set("days_back", String(options.daysBack));
    }
    const query = params.toString();
    return apiRequest<{ orders: any[]; meta?: { total: number; page: number; per_page: number; last_page: number }; stats?: Record<string, number> }>(
      `/api/fnb-orders${query ? `?${query}` : ""}`,
      {
        auth: true,
        signal: options.signal,
      },
    );
  },
  updateFnbOrderStatus: (id: number, status: string) =>
    apiRequest<{ order: any }>(`/api/fnb-orders/${id}/status`, {
      method: "PATCH",
      body: { status },
      auth: true,
    }),
  // --- ปิด/เปิดรอบวันทำการ ---
  getDayClosure: () =>
    apiRequest<{
      closure: any | null;
      summary: any;
      summaryDate: string;
      previousClosure?: any | null;
      nextDate?: string;
    }>("/api/day-closure", {
      auth: true,
    }),
  closeDay: (payload: { note?: string; opened_at?: string; closed_at?: string; date?: string } = {}) =>
    apiRequest<{ closure: any; summary: any; summaryDate: string; nextDate?: string; previousClosure?: any | null }>(
      "/api/day-closure",
      {
        method: "POST",
        body: payload,
        auth: true,
      },
    ),
  startDay: (payload: { date?: string; opened_at?: string; note?: string } = {}) =>
    apiRequest<{ closure: any; summary: any; summaryDate: string; nextDate?: string; previousClosure?: any | null }>(
      "/api/day-closure/start",
      {
        method: "POST",
        body: payload,
        auth: true,
      },
    ),
  // --- ผู้ใช้และข้อมูลส่วนตัว ---
  getUsers: (signal?: AbortSignal) =>
    apiRequest<{ users: any[] }>("/api/users", {
      auth: true,
      signal,
    }),
  updateUserRole: (id: number, role: string) =>
    apiRequest<{ user: any }>(`/api/users/${id}/role`, {
      method: "PATCH",
      body: { role },
      auth: true,
    }),
  updateProfile: (payload: { fname: string; lname?: string; email: string; phone?: string }) =>
    apiRequest<{ user: any }>("/api/profile", {
      method: "PUT",
      body: payload,
      auth: true,
    }),
  deleteProfile: () =>
    apiRequest<{ message?: string }>("/api/profile", {
      method: "DELETE",
      auth: true,
    }),
};
