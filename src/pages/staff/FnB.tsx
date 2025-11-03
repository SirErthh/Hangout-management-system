import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UtensilsCrossed, Clock, CheckCircle } from "lucide-react";

const StaffFnB = () => {
  const [orders, setOrders] = useState([
    { 
      id: 1, 
      table: "12", 
      items: ["Burger x2", "Pasta x1", "Beer x3"], 
      total: 1080,
      status: "pending",
      time: "5 min ago"
    },
    { 
      id: 2, 
      table: "8", 
      items: ["Salad x1", "Salmon x1", "Juice x2"], 
      total: 840,
      status: "preparing",
      time: "12 min ago"
    },
    { 
      id: 3, 
      table: "5", 
      items: ["Mojito x2", "Espresso Martini x1"], 
      total: 700,
      status: "ready",
      time: "2 min ago"
    }
  ]);

  const updateOrderStatus = (orderId: number, newStatus: string) => {
    setOrders(orders.map(o => 
      o.id === orderId ? { ...o, status: newStatus } : o
    ));
    toast.success(`Order updated to ${newStatus}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'preparing': return 'bg-blue-500';
      case 'ready': return 'bg-green-500';
      case 'delivered': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock;
      case 'preparing': return UtensilsCrossed;
      case 'ready': return CheckCircle;
      default: return Clock;
    }
  };

  return (
    <div className="p-6 space-y-6 animate-slide-up">
      <div>
        <h1 className="text-3xl font-bold mb-2">F&B / Kitchen</h1>
        <p className="text-muted-foreground">Manage food and beverage orders</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <Card className="glass-effect">
          <CardHeader className="pb-2">
            <CardDescription>Pending Orders</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {orders.filter(o => o.status === 'pending').length}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardHeader className="pb-2">
            <CardDescription>Preparing</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {orders.filter(o => o.status === 'preparing').length}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardHeader className="pb-2">
            <CardDescription>Ready</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {orders.filter(o => o.status === 'ready').length}
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

      <div className="grid lg:grid-cols-2 gap-6">
        {orders.map(order => {
          const StatusIcon = getStatusIcon(order.status);
          return (
            <Card key={order.id} className="glass-effect border-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">Table {order.table}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3" />
                      {order.time}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(order.status)}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {order.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Order Items:</p>
                    <ul className="space-y-1">
                      {order.items.map((item, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="text-lg font-bold">฿{order.total}</span>
                    <Select
                      value={order.status}
                      onValueChange={(newStatus) => updateOrderStatus(order.id, newStatus)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="preparing">Preparing</SelectItem>
                        <SelectItem value="ready">Ready</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
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
