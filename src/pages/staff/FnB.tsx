import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UtensilsCrossed, Clock, CheckCircle, LayoutGrid } from "lucide-react";

const StaffFnB = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);

  useEffect(() => {
    // Load menu orders from localStorage
    const storedOrders = localStorage.getItem('menuOrders');
    if (storedOrders) {
      setOrders(JSON.parse(storedOrders));
    }

    // Load tables from localStorage
    const storedTables = localStorage.getItem('tables');
    if (storedTables) {
      setTables(JSON.parse(storedTables));
    }
  }, []);

  const updateOrderStatus = (orderId: number, newStatus: string) => {
    const updatedOrders = orders.map(o => 
      o.id === orderId ? { ...o, status: newStatus } : o
    );
    setOrders(updatedOrders);
    localStorage.setItem('menuOrders', JSON.stringify(updatedOrders));
    toast.success(`Order updated to ${newStatus}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'preparing': return 'bg-blue-500';
      case 'ready': return 'bg-green-500';
      case 'delivered': return 'bg-gray-500';
      case 'cancel': return 'bg-red-500';
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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">F&B / Kitchen</h1>
          <p className="text-muted-foreground">Manage food and beverage orders</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Table Status
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Table Status Overview</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-4 gap-4 mt-4">
              {tables.map((table) => (
                <Card 
                  key={table.id}
                  className={`glass-effect border-2 ${
                    table.status === 'occupied'
                      ? 'border-red-500/50'
                      : 'border-green-500/50'
                  }`}
                >
                  <CardHeader className="p-4 text-center">
                    <CardTitle className="text-2xl">{table.number}</CardTitle>
                    <CardDescription className="text-xs">
                      {table.capacity} seats
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-2">
                    <div className={`text-center py-1 rounded text-xs font-semibold ${
                      table.status === 'available' 
                        ? 'bg-green-500/20 text-green-500'
                        : 'bg-red-500/20 text-red-500'
                    }`}>
                      {table.status}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
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
                        <SelectItem value="preparing">Preparing</SelectItem>
                        <SelectItem value="ready">Ready</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled" className="text-red-500">
                          Cancel
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
