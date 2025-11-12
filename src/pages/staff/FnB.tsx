import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UtensilsCrossed, Clock, CheckCircle, Users, Calendar } from "lucide-react";
import { api, handleApiError } from "@/lib/api";

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

const StaffFnB = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadOrders = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const { orders: fetched } = await api.getFnbOrders(false, signal);
        if (!signal?.aborted) {
          setOrders(fetched ?? []);
        }
      } catch (error) {
        if (!signal?.aborted) {
          handleApiError(error, "Failed to load F&B orders");
          setOrders([]);
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadOrders(controller.signal);
    return () => controller.abort();
  }, [loadOrders]);

  useEffect(() => {
    const handler = () => loadOrders();
    window.addEventListener("day-closure-updated", handler);
    return () => window.removeEventListener("day-closure-updated", handler);
  }, [loadOrders]);

  const updateOrderStatus = async (orderId: number, newStatus: Order["status"]) => {
    setUpdatingId(orderId);
    try {
      const { order } = await api.updateFnbOrderStatus(orderId, newStatus);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
      toast.success(`Order #${orderId} → ${newStatus}`);
    } catch (error) {
      handleApiError(error, "Failed to update order status");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "preparing":
        return "bg-blue-500";
      case "ready":
        return "bg-green-500";
      case "completed":
        return "bg-gray-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
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
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
        <Card className="glass-effect">
          <CardHeader className="pb-2">
            <CardDescription>Pending Orders</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {orders.filter((o) => o.status === "pending").length}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardHeader className="pb-2">
            <CardDescription>Preparing</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {orders.filter((o) => o.status === "preparing").length}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardHeader className="pb-2">
            <CardDescription>Ready</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {orders.filter((o) => o.status === "ready").length}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardHeader className="pb-2">
            <CardDescription>Total Orders</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{orders.length}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Loading orders...
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No orders yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {orders.map((order) => {
            const StatusIcon = getStatusIcon(order.status);
            const createdDate = order.createdAt ? new Date(order.createdAt) : null;
            const createdTimeLabel = createdDate
              ? createdDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "-";
            const createdDateLabel = createdDate ? createdDate.toLocaleDateString() : "-";
            return (
              <Card key={order.id} className="glass-effect border-2">
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
                    <Badge className={getStatusColor(order.status)}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      <span className="text-xs sm:text-sm capitalize">{order.status}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
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
      )}
    </div>
  );
};

export default StaffFnB;
