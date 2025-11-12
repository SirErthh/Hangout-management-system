import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, UtensilsCrossed, Ticket, Eye } from "lucide-react";
import { api, handleApiError } from "@/lib/api";

type TicketOrder = {
  id: number;
  event: string;
  status: string;
  quantity: number;
  total: number;
  createdAt: string;
  tickets?: string[];
};

type Reservation = {
  id: number;
  event: string;
  partySize: number;
  status: string;
  reservedDate?: string;
  table?: string | null;
  tables?: string[];
  tableIds?: number[];
  tableCapacity?: number | null;
};

type FnbOrder = {
  id: number;
  status: string;
  createdAt: string;
  total: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    line_total?: number;
    remark?: string | null;
  }>;
};

const MyOrders = () => {
  const [ticketOrders, setTicketOrders] = useState<TicketOrder[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [fnbOrders, setFnbOrders] = useState<FnbOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      try {
        const [ticketRes, reservationRes, fnbRes] = await Promise.all([
          api.getTicketOrders(true, controller.signal),
          api.getReservations(true, controller.signal),
          api.getFnbOrders(true, controller.signal),
        ]);

        setTicketOrders(ticketRes.orders ?? []);
        setReservations(reservationRes.reservations ?? []);
        setFnbOrders(fnbRes.orders ?? []);
      } catch (error) {
        if (!controller.signal.aborted) {
          handleApiError(error, "Failed to load your orders");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => controller.abort();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500 text-white";
      case "confirmed":
      case "ready":
      case "prepared":
        return "bg-blue-500 text-white";
      case "completed":
      case "seated":
        return "bg-green-500 text-white";
      case "cancelled":
      case "canceled":
      case "no_show":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const ticketContent = useMemo(() => {
    if (loading) {
      return (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">Loading tickets...</CardContent>
        </Card>
      );
    }

    if (ticketOrders.length === 0) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No ticket orders yet</p>
          </CardContent>
        </Card>
      );
    }

    return ticketOrders.map((order) => {
      const createdAt = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "-";
      return (
        <Card key={order.id} className="glass-effect">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="flex-1">
                <CardTitle className="text-base sm:text-lg">{order.event}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Order #{order.id} • {createdAt}
                </CardDescription>
              </div>
              <Badge className={getStatusColor(order.status)}>
                <span className="text-xs sm:text-sm capitalize">{order.status}</span>
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Quantity:</span>
                <span className="font-medium">{order.quantity} tickets</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-bold">฿{order.total.toFixed(2)}</span>
              </div>
              {order.tickets && order.tickets.length > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Eye className="h-4 w-4 mr-2" />
                      View Ticket Codes
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ticket Codes</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                      {order.tickets.map((code, idx) => (
                        <div key={idx} className="p-3 bg-muted rounded-lg font-mono text-center text-lg">
                          {code}
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>
      );
    });
  }, [loading, ticketOrders]);

  const reservationsContent = useMemo(() => {
    if (loading) {
      return (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Loading reservations...
          </CardContent>
        </Card>
      );
    }

    if (reservations.length === 0) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No reservations yet</p>
          </CardContent>
        </Card>
      );
    }

    return reservations.map((reservation) => {
      const reservedDate = reservation.reservedDate
        ? new Date(reservation.reservedDate)
        : null;
      const dateLabel = reservedDate ? reservedDate.toLocaleDateString() : "-";
      const timeLabel = reservedDate
        ? reservedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "-";
      const tableLabel =
        reservation.tables && reservation.tables.length > 0
          ? reservation.tables.join(" + ")
          : reservation.table;

      return (
        <Card key={reservation.id} className="glass-effect">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="flex-1">
                <CardTitle className="text-base sm:text-lg">
                  Reservation #{reservation.id}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {reservation.event}
                </CardDescription>
              </div>
              <Badge className={getStatusColor(reservation.status)}>
                <span className="text-xs sm:text-sm capitalize">{reservation.status.replace("_", " ")}</span>
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">{dateLabel}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Time:</span>
                <span className="font-medium">{timeLabel}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Party Size:</span>
                <span className="font-medium">
                  {reservation.partySize} {reservation.partySize === 1 ? "person" : "people"}
                </span>
              </div>
              {tableLabel ? (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Table:</span>
                  <span className="font-medium">{tableLabel}</span>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      );
    });
  }, [loading, reservations]);

  const fnbContent = useMemo(() => {
    if (loading) {
      return (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">Loading orders...</CardContent>
        </Card>
      );
    }

    if (fnbOrders.length === 0) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No F&B orders yet</p>
          </CardContent>
        </Card>
      );
    }

    return fnbOrders.map((order) => {
      const created = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "-";
      return (
        <Card key={order.id} className="glass-effect">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="flex-1">
                <CardTitle className="text-base sm:text-lg">Food & Beverage Order</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Order #{order.id} • {created}
                </CardDescription>
              </div>
              <Badge className={getStatusColor(order.status)}>
                <span className="text-xs sm:text-sm capitalize">{order.status}</span>
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {order.items?.map((item, idx) => (
                <div key={idx} className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>
                      {item.name} ×{item.quantity}
                    </span>
                    <span className="font-medium">
                      ฿{((item.line_total ?? item.price * item.quantity) || 0).toFixed(2)}
                    </span>
                  </div>
                  {item.remark && (
                    <p className="text-xs text-muted-foreground">Remark: {item.remark}</p>
                  )}
                </div>
              ))}
              <div className="pt-2 border-t flex justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold">฿{order.total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    });
  }, [loading, fnbOrders]);

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">My Orders</h1>
        <p className="text-muted-foreground text-sm sm:text-base">View all your bookings and purchases</p>
      </div>

      <Tabs defaultValue="tickets" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tickets" className="text-xs sm:text-sm">
            <Ticket className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Tickets</span>
          </TabsTrigger>
          <TabsTrigger value="reservations" className="text-xs sm:text-sm">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Reservations</span>
          </TabsTrigger>
          <TabsTrigger value="fnb" className="text-xs sm:text-sm">
            <UtensilsCrossed className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">F&B</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="mt-6 space-y-4">
          {ticketContent}
        </TabsContent>

        <TabsContent value="reservations" className="mt-6 space-y-4">
          {reservationsContent}
        </TabsContent>

        <TabsContent value="fnb" className="mt-6 space-y-4">
          {fnbContent}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyOrders;
