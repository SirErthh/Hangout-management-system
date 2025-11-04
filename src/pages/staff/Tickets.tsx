import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Ticket, CheckCircle, XCircle, Search, Eye } from "lucide-react";

const StaffTickets = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const ticketOrders = JSON.parse(localStorage.getItem('ticketOrders') || '[]');
    setOrders(ticketOrders);
  }, []);

  const updateOrderStatus = (orderId: number, newStatus: string) => {
    const updated = orders.map(o => 
      o.id === orderId ? { ...o, status: newStatus } : o
    );
    setOrders(updated);
    localStorage.setItem('ticketOrders', JSON.stringify(updated));
    toast.success(`Order ${newStatus}`);
  };

  const confirmTicket = (orderId: number, ticketCode: string) => {
    const updated = orders.map(o => {
      if (o.id === orderId) {
        const confirmedTickets = [...(o.confirmedTickets || []), ticketCode];
        const allConfirmed = confirmedTickets.length === o.tickets.length;
        return { 
          ...o, 
          confirmedTickets,
          status: allConfirmed ? 'confirmed' : o.status 
        };
      }
      return o;
    });
    setOrders(updated);
    localStorage.setItem('ticketOrders', JSON.stringify(updated));
    toast.success(`Ticket ${ticketCode} confirmed`);
  };

  const confirmAllTickets = (orderId: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    const updated = orders.map(o => 
      o.id === orderId ? { ...o, confirmedTickets: o.tickets, status: 'confirmed' } : o
    );
    setOrders(updated);
    localStorage.setItem('ticketOrders', JSON.stringify(updated));
    toast.success('All tickets confirmed');
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
    <div className="p-4 sm:p-6 space-y-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Ticket Orders</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage and process ticket purchases</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ticket code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 mb-6">
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
        {orders
          .filter(order => 
            order.tickets?.some((code: string) => 
              code.toLowerCase().includes(searchQuery.toLowerCase())
            )
          )
          .map(order => (
          <Card key={order.id} className="glass-effect border-2">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="flex-1">
                  <CardTitle className="text-base sm:text-lg">Order #{order.id}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm break-words">
                    {order.customer} • {order.event}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(order.status)}>
                  <span className="text-xs sm:text-sm">{order.status}</span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                    <Ticket className="h-4 w-4" />
                    <span>{order.quantity} tickets</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold">฿{order.total.toLocaleString()}</p>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Eye className="h-4 w-4 mr-2" />
                      View Ticket Codes
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Ticket Codes - Order #{order.id}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {order.tickets?.map((code: string, idx: number) => {
                        const isConfirmed = order.confirmedTickets?.includes(code);
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <div className="flex-1 p-2 bg-muted rounded font-mono text-center">
                              {code}
                            </div>
                            {order.status === 'pending' && !isConfirmed && (
                              <Button
                                size="sm"
                                onClick={() => confirmTicket(order.id, code)}
                                className="bg-green-500 hover:bg-green-600"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {isConfirmed && (
                              <Badge className="bg-green-500">✓</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {order.status === 'pending' && (
                      <Button 
                        onClick={() => confirmAllTickets(order.id)}
                        className="w-full bg-green-500 hover:bg-green-600"
                      >
                        Confirm All Tickets
                      </Button>
                    )}
                  </DialogContent>
                </Dialog>

                {order.status === 'pending' && (
                  <Button
                    onClick={() => updateOrderStatus(order.id, 'cancelled')}
                    variant="destructive"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <XCircle className="h-4 w-4 mr-2 sm:mr-0" />
                    <span className="sm:hidden">Cancel Order</span>
                  </Button>
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
