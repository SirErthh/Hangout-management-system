import { toast } from "sonner";

const DEFAULT_BASE_URL = "";

const API_BASE_URL = (
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

const TOKEN_STORAGE_KEY = "hangout.auth.token";
const USER_STORAGE_KEY = "hangout.auth.user";

export const authStorage = {
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

const buildUrl = (path: string) => {
  const sanitizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${sanitizedPath}`;
};

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
  getEvents: (signal?: AbortSignal) =>
    apiRequest<{ events: any[] }>("/api/events", { signal }),
  getMenuItems: (signal?: AbortSignal) =>
    apiRequest<{ items: any[] }>("/api/menu-items", { signal }),
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
  deleteEvent: (id: number) =>
    apiRequest<{ message?: string }>(`/api/events/${id}`, {
      method: "DELETE",
      auth: true,
    }),
  orderTickets: (eventId: number, payload: { quantity: number; price: number }) =>
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
  getTicketOrders: (mine = true, signal?: AbortSignal) =>
    apiRequest<{ orders: any[] }>(`/api/ticket-orders${mine ? "?mine=1" : ""}`, {
      auth: true,
      signal,
    }),
  updateTicketOrderStatus: (id: number, status: string) =>
    apiRequest<{ order: any }>(`/api/ticket-orders/${id}/status`, {
      method: "PATCH",
      body: { status },
      auth: true,
    }),
  confirmTicket: (id: number, code: string) =>
    apiRequest<{ order: any }>(`/api/ticket-orders/${id}/confirm`, {
      method: "POST",
      body: { code },
      auth: true,
    }),
  confirmAllTickets: (id: number) =>
    apiRequest<{ order: any }>(`/api/ticket-orders/${id}/confirm-all`, {
      method: "POST",
      auth: true,
    }),
  getReservations: (mine = true, signal?: AbortSignal) =>
    apiRequest<{ reservations: any[] }>(`/api/reservations${mine ? "?mine=1" : ""}`, {
      auth: true,
      signal,
    }),
  updateReservationStatus: (id: number, status: string) =>
    apiRequest<{ reservation: any }>(`/api/reservations/${id}/status`, {
      method: "PATCH",
      body: { status },
      auth: true,
    }),
  assignReservationTable: (id: number, tableId: number) =>
    apiRequest<{ reservation: any }>(`/api/reservations/${id}/assign-table`, {
      method: "POST",
      body: { table_id: tableId },
      auth: true,
    }),
  getTables: (signal?: AbortSignal) =>
    apiRequest<{ tables: any[] }>("/api/tables", {
      auth: true,
      signal,
    }),
  getFnbOrders: (mine = true, signal?: AbortSignal) =>
    apiRequest<{ orders: any[] }>(`/api/fnb-orders${mine ? "?mine=1" : ""}`, {
      auth: true,
      signal,
    }),
  updateFnbOrderStatus: (id: number, status: string) =>
    apiRequest<{ order: any }>(`/api/fnb-orders/${id}/status`, {
      method: "PATCH",
      body: { status },
      auth: true,
    }),
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
