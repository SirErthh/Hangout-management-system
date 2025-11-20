import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UtensilsCrossed, Clock, CheckCircle, Users, Calendar } from "lucide-react";
import { api, handleApiError } from "@/lib/api";
import { getFlatStatusBadgeClass, statusBadgeBase } from "@/lib/statusColors";
import { PaginationControls } from "@/components/PaginationControls";

type OrderItem = {
  id: number;
  name: string;
  quantity: number;
  price: number;
  line_total?: number;
  status: string;
  remark?: string | null;
};

type Order = {
  id: number;
  customer: string;
  table: string;
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled";
  total: number;
  createdAt: string;
  note?: string | null;
  items: OrderItem[];
};

const PAGE_SIZE = 20;
const DEFAULT_STATS: Record<Order["status"], number> = {
  pending: 0,
  preparing: 0,
  ready: 0,
  completed: 0,
  cancelled: 0,
};

const VIEW_OPTIONS: { value: "active" | "completed" | "all"; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "all", label: "All" },
];

const DATE_RANGE_OPTIONS = [
  { label: "Today", value: 1 },
  { label: "Last 3 days", value: 3 },
  { label: "Last 7 days", value: 7 },
  { label: "Last 14 days", value: 14 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
];

const StaffFnB = () => {
  // เก็บ F&B orders และ filter ต่างๆ
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"active" | "completed" | "all">("active");
  const [daysBack, setDaysBack] = useState(7);
  const [meta, setMeta] = useState({
    total: 0,
    per_page: PAGE_SIZE,
    page: 1,
    last_page: 1,
  });
  const [stats, setStats] = useState(DEFAULT_STATS);

  const perPage = meta.per_page ?? PAGE_SIZE;
  const totalOrders = meta.total ?? orders.length;
  const totalPages = Math.max(1, Math.ceil(Math.max(totalOrders, 1) / perPage));
  const startItem = totalOrders === 0 ? 0 : (page - 1) * perPage + 1;
  const endItem = totalOrders === 0 ? 0 : Math.min(page * perPage, totalOrders);

  // โหลดข้อมูลคำสั่งซื้ออาหาร/เครื่องดื่ม
  const loadOrders = useCallback(async (pageToLoad: number, signal?: AbortSignal) => {
    setLoading(true);
    try {
      const payload = await api.getFnbOrders({
        mine: false,
        page: pageToLoad,
        perPage: PAGE_SIZE,
        view,
        daysBack,
        signal,
      });

      if (signal?.aborted) {
        return;
      }

      setOrders(payload.orders ?? []);
      setMeta(
        payload.meta ?? {
          total: payload.orders?.length ?? 0,
          per_page: PAGE_SIZE,
          page: pageToLoad,
          last_page: 1,
        },
      );
      setStats({
        pending: payload.stats?.pending ?? 0,
        preparing: payload.stats?.preparing ?? 0,
        ready: payload.stats?.ready ?? 0,
        completed: payload.stats?.completed ?? 0,
        cancelled: payload.stats?.cancelled ?? 0,
      });
    } catch (error) {
      if (!signal?.aborted) {
        handleApiError(error, "Failed to load F&B orders");
        setOrders([]);
        setStats(DEFAULT_STATS);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [view, daysBack]);

  // โหลดคำสั่งซื้อเมื่อเปลี่ยนหน้า, filter
  useEffect(() => {
    const controller = new AbortController();
    loadOrders(page, controller.signal);
    return () => controller.abort();
  }, [loadOrders, page]);

  useEffect(() => {
    const handler = () => loadOrders(page);
    window.addEventListener("day-closure-updated", handler);
    return () => window.removeEventListener("day-closure-updated", handler);
  }, [loadOrders, page]);

  // เปลี่ยนสถานะ order
  const updateOrderStatus = async (orderId: number, newStatus: Order["status"]) => {
    setUpdatingId(orderId);
    try {
      const { order } = await api.updateFnbOrderStatus(orderId, newStatus);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
      toast.success(`Order #${orderId} → ${newStatus}`);
      loadOrders(page);
    } catch (error) {
      handleApiError(error, "Failed to update order status");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusIcon = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return Clock;
      case "preparing":
        return UtensilsCrossed;
      case "ready":
      case "completed":
        return CheckCircle;
      case "cancelled":
        return Clock;
      default:
        return Clock;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">F&B / Kitchen</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage food and beverage orders</p>
        </div>
        <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
          <div className="flex flex-wrap justify-end gap-2">
            {VIEW_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={view === option.value ? "default" : "outline"}
                size="sm"
                className="min-w-[90px]"
                onClick={() => {
                  setView(option.value);
                  setPage(1);
                }}
                disabled={loading && view === option.value}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Date range</span>
            <Select
              value={String(daysBack)}
              onValueChange={(value) => {
                setDaysBack(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
        <Card className="glass-effect">
          <CardHeader className="pb-2">
            <CardDescription>Pending Orders</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardHeader className="pb-2">
            <CardDescription>Preparing</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.preparing}</p>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardHeader className="pb-2">
            <CardDescription>Ready</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.ready}</p>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardHeader className="pb-2">
            <CardDescription>Total Orders</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalOrders}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">Loading orders...</CardContent>
        </Card>
      ) : totalOrders === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">No orders yet.</CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No orders on this page. Try a different page.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {orders.map((order) => {
            const StatusIcon = getStatusIcon(order.status);
            const createdDate = order.createdAt ? new Date(order.createdAt) : null;
            const createdTimeLabel = createdDate
              ? createdDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "-";
            const createdDateLabel = createdDate ? createdDate.toLocaleDateString() : "-";
            return (
              <Card key={order.id} className="glass-effect border-2 h-full flex flex-col">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <CardTitle className="text-base sm:text-lg">Table {order.table}</CardTitle>
                      <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
                        <Users className="h-3 w-3" />
                        {order.customer}
                      </CardDescription>
                      <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>{createdDateLabel}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>{createdTimeLabel}</span>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`${statusBadgeBase} ${getFlatStatusBadgeClass(order.status)}`}
                    >
                      <StatusIcon className="h-3 w-3 mr-1" />
                      <span className="text-xs sm:text-sm capitalize">{order.status}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="space-y-4 flex-1">
                    <div>
                      <p className="text-xs sm:text-sm font-medium mb-2">Order Items:</p>
                      <ul className="space-y-2">
                        {order.items?.length ? (
                          order.items.map((item) => (
                            <li key={item.id} className="text-xs sm:text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                <span className="truncate">
                                  {item.name} × {item.quantity} — ฿{(
                                    item.line_total ?? item.price * item.quantity
                                  ).toFixed(2)}
                                </span>
                              </div>
                              {item.remark && (
                                <p className="ml-4 mt-1 text-[11px] sm:text-xs text-muted-foreground/80">
                                  Remark: {item.remark}
                                </p>
                              )}
                            </li>
                          ))
                        ) : (
                          <li className="text-xs sm:text-sm text-muted-foreground italic">No items</li>
                        )}
                      </ul>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t">
                      <span className="text-base sm:text-lg font-bold">฿{order.total.toFixed(2)}</span>
                      <Select
                        value={order.status}
                        onValueChange={(newStatus) =>
                          updateOrderStatus(order.id, newStatus as Order["status"])
                        }
                        disabled={updatingId === order.id}
                      >
                        <SelectTrigger className="w-full sm:w-44">
                          <SelectValue placeholder="Update status…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="preparing">Preparing</SelectItem>
                          <SelectItem value="ready">Ready</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled" className="text-red-500">
                            Cancelled
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-border/40">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{startItem}</span>-
              <span className="font-medium">{endItem}</span> of{" "}
              <span className="font-medium">{totalOrders}</span> orders
            </p>
            <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffFnB;
