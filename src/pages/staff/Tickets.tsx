import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Ticket, CheckCircle, XCircle } from "lucide-react";

const StaffTickets = () => {
  const [orders, setOrders] = useState([
    { id: 1, customer: "John Doe", event: "Jazz Night", quantity: 2, total: 1000, status: "pending" },
    { id: 2, customer: "Jane Smith", event: "EDM Party", quantity: 4, total: 3200, status: "pending" },
    { id: 3, customer: "Bob Wilson", event: "Jazz Night", quantity: 1, total: 500, status: "confirmed" }
  ]);

  const updateOrderStatus = (orderId: number, newStatus: string) => {
    setOrders(orders.map(o => 
      o.id === orderId ? { ...o, status: newStatus } : o
    ));
    toast.success(`Order ${newStatus}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'confirmed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="p-6 space-y-6 animate-slide-up">
      <div>
        <h1 className="text-3xl font-bold mb-2">Ticket Orders</h1>
        <p className="text-muted-foreground">Manage and process ticket purchases</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-6">
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
            <CardDescription>Confirmed Today</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {orders.filter(o => o.status === 'confirmed').length}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardHeader className="pb-2">
            <CardDescription>Total Revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ฿{orders.reduce((sum, o) => sum + o.total, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {orders.map(order => (
          <Card key={order.id} className="glass-effect border-2">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">Order #{order.id}</CardTitle>
                  <CardDescription>
                    {order.customer} • {order.event}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(order.status)}>
                  {order.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Ticket className="h-4 w-4" />
                    <span>{order.quantity} tickets</span>
                  </div>
                  <p className="text-2xl font-bold">฿{order.total.toLocaleString()}</p>
                </div>

                {order.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => updateOrderStatus(order.id, 'confirmed')}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm
                    </Button>
                    <Button
                      onClick={() => updateOrderStatus(order.id, 'cancelled')}
                      variant="destructive"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                )}

                {order.status !== 'pending' && (
                  <Select
                    value={order.status}
                    onValueChange={(newStatus) => updateOrderStatus(order.id, newStatus)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default StaffTickets;
