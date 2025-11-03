import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, UtensilsCrossed, Ticket } from "lucide-react";

const MyOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const allOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    const allReservations = JSON.parse(localStorage.getItem('reservations') || '[]');

    setOrders(allOrders.filter((o: any) => o.userId === currentUser.id));
    setReservations(allReservations.filter((r: any) => r.userId === currentUser.id));
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'confirmed': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="p-6 space-y-6 animate-slide-up">
      <div>
        <h1 className="text-3xl font-bold mb-2">My Orders</h1>
        <p className="text-muted-foreground">View all your bookings and purchases</p>
      </div>

      <Tabs defaultValue="tickets" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="tickets">
            <Ticket className="h-4 w-4 mr-2" />
            Tickets
          </TabsTrigger>
          <TabsTrigger value="reservations">
            <Calendar className="h-4 w-4 mr-2" />
            Reservations
          </TabsTrigger>
          <TabsTrigger value="fnb">
            <UtensilsCrossed className="h-4 w-4 mr-2" />
            F&B
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="mt-6 space-y-4">
          {orders.filter(o => o.type === 'ticket').length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No ticket orders yet</p>
              </CardContent>
            </Card>
          ) : (
            orders.filter(o => o.type === 'ticket').map(order => (
              <Card key={order.id} className="glass-effect">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{order.eventName || 'Event Ticket'}</CardTitle>
                      <CardDescription>
                        Order #{order.id} • {new Date(order.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Quantity:</span>
                      <span className="font-medium">{order.quantity || 1} tickets</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-bold">฿{order.total}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="reservations" className="mt-6 space-y-4">
          {reservations.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No reservations yet</p>
              </CardContent>
            </Card>
          ) : (
            reservations.map(reservation => (
              <Card key={reservation.id} className="glass-effect">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>Table Reservation</CardTitle>
                      <CardDescription>
                        Booking #{reservation.id}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(reservation.status)}>
                      {reservation.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Date:</span>
                      <span className="font-medium">
                        {new Date(reservation.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Time:</span>
                      <span className="font-medium">{reservation.time}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Party Size:</span>
                      <span className="font-medium">
                        {reservation.partySize} {reservation.partySize === 1 ? 'person' : 'people'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="fnb" className="mt-6 space-y-4">
          {orders.filter(o => o.type === 'fnb').length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No F&B orders yet</p>
              </CardContent>
            </Card>
          ) : (
            orders.filter(o => o.type === 'fnb').map(order => (
              <Card key={order.id} className="glass-effect">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>Food & Beverage Order</CardTitle>
                      <CardDescription>
                        Order #{order.id} • {new Date(order.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {order.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{item.name} x{item.quantity}</span>
                        <span className="font-medium">฿{item.price * item.quantity}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t flex justify-between">
                      <span className="font-medium">Total:</span>
                      <span className="font-bold">฿{order.total}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyOrders;
