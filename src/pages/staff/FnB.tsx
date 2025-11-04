import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UtensilsCrossed, Clock, CheckCircle } from "lucide-react";

type OrderItem = {
  name: string;
  price: number;
  quantity: number;
} | string;

type Order = {
  id: number;
  table: string | number;
  time: string;
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled";
  items: OrderItem[];
  total?: number;
};

type TableRow = {
  id: number | string;
  number: string | number;
  capacity: number;
  status: "available" | "occupied";
};

const StaffFnB = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);

  useEffect(() => {
    const storedOrders = localStorage.getItem("menuOrders");
    if (storedOrders) {
      try {
        const parsed = JSON.parse(storedOrders);
        if (Array.isArray(parsed)) setOrders(parsed as Order[]);
      } catch {}
    }

    const storedTables = localStorage.getItem("tables");
    if (storedTables) {
      try {
        const parsed = JSON.parse(storedTables);
        if (Array.isArray(parsed)) setTables(parsed as TableRow[]);
      } catch {}
    }
  }, []);

  const updateOrderStatus = (orderId: number, newStatus: Order["status"]) => {
    const updatedOrders = orders.map((o) =>
      o.id === orderId ? { ...o, status: newStatus } : o
    );
    setOrders(updatedOrders);
    localStorage.setItem("menuOrders", JSON.stringify(updatedOrders));
    toast.success(`Order #${orderId} → ${newStatus}`);
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

  const safeTotal = (order: Order) => {
    if (typeof order.total === "number") return order.total;
    if (!Array.isArray(order.items)) return 0;
    return order.items.reduce((sum, it) => {
      if (typeof it === "string") return sum; // no price info
      const price = Number(it.price) || 0;
      const qty = Number(it.quantity) || 0;
      return sum + price * qty;
    }, 0);
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
            <CardDescription>Avg. Prep Time</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">15m</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {orders.map((order) => {
          const StatusIcon = getStatusIcon(order.status);
          const total = safeTotal(order);
          return (
            <Card key={order.id} className="glass-effect border-2">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-base sm:text-lg">Table {order.table}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1 text-xs sm:text-sm">
                      <Clock className="h-3 w-3" />
                      {order.time}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(order.status)}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    <span className="text-xs sm:text-sm">{order.status}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs sm:text-sm font-medium mb-2">Order Items:</p>
                    <ul className="space-y-1">
                      {Array.isArray(order.items) && order.items.length > 0 ? (
                        order.items.map((item, idx) => {
                          if (typeof item === "string") {
                            return (
                              <li
                                key={idx}
                                className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2"
                              >
                                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                {item}
                              </li>
                            );
                          }
                          const lineTotal = ((Number(item.price) || 0) * (Number(item.quantity) || 0)).toFixed(2);
                          return (
                            <li
                              key={idx}
                              className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2"
                            >
                              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                              <span className="truncate">{item.name} × {item.quantity} — ฿{lineTotal}</span>
                            </li>
                          );
                        })
                      ) : (
                        <li className="text-xs sm:text-sm text-muted-foreground italic">
                          No items
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t">
                    <span className="text-base sm:text-lg font-bold">฿{total.toFixed(2)}</span>
                    <Select
                      value={order.status}
                      onValueChange={(newStatus) =>
                        updateOrderStatus(order.id, newStatus as Order["status"])
                      }
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
    </div>
  );
};

export default StaffFnB;
